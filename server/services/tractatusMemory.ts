import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL! });

export interface DocumentSkeleton {
  thesis: string;
  outline: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  asserts: string[];
  rejects: string[];
  assumes: string[];
  entities: string[];
  documentType: string;
  isExcerpt: boolean;
}

export async function initTractatusTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_result_id TEXT,
        user_id TEXT,
        word_count INTEGER,
        analysis_type TEXT,
        provider TEXT,
        global_skeleton JSONB,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tractatus_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID,
        job_type TEXT NOT NULL,
        tier INTEGER NOT NULL,
        tree JSONB NOT NULL,
        node_count INTEGER NOT NULL DEFAULT 0,
        parent_tier_id UUID,
        compression_count INTEGER NOT NULL DEFAULT 0,
        last_update TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tractatus_archive (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL,
        job_type TEXT NOT NULL,
        tier INTEGER NOT NULL,
        tree_snapshot JSONB NOT NULL,
        node_count_at_snapshot INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tractatus_tiers_job
        ON tractatus_tiers(job_id, job_type, tier);
      CREATE INDEX IF NOT EXISTS idx_tractatus_archive_job
        ON tractatus_archive(job_id, job_type, created_at);
    `);
    console.log('[Tractatus] DB tables ready');
  } catch (err) {
    console.error('[Tractatus] Table init failed:', err);
  }
}

export async function createAnalysisJob(params: {
  analysisResultId?: string;
  userId?: string;
  wordCount: number;
  analysisType: string;
  provider: string;
  skeleton: DocumentSkeleton;
}): Promise<string> {
  try {
    const result = await pool.query(`
      INSERT INTO analysis_jobs
        (analysis_result_id, user_id, word_count, analysis_type, provider, global_skeleton, status)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'active')
      RETURNING id
    `, [
      params.analysisResultId ?? null,
      params.userId ?? null,
      params.wordCount,
      params.analysisType,
      params.provider,
      JSON.stringify(params.skeleton),
    ]);
    return result.rows[0].id as string;
  } catch (err) {
    console.error('[Tractatus] createAnalysisJob failed:', err);
    return 'memory-only';
  }
}

export async function skeletonToTier0(jobId: string, skeleton: DocumentSkeleton): Promise<void> {
  if (jobId === 'memory-only') return;
  try {
    const nodes: Record<string, string> = {};

    nodes['1.0'] = `ASSERTS: ${skeleton.thesis}`;
    skeleton.outline.forEach((item, i) => {
      nodes[`2.${i}`] = `OUTLINE: ${item}`;
    });
    skeleton.keyTerms.forEach((kt, i) => {
      nodes[`3.${i}`] = `KEY_TERM: "${kt.term}" = ${kt.definition}`;
    });
    skeleton.asserts.forEach((a, i) => {
      nodes[`4.${i}`] = `ASSERTS: ${a}`;
    });
    skeleton.rejects.forEach((r, i) => {
      nodes[`5.${i}`] = `REJECTS: ${r}`;
    });
    skeleton.assumes.forEach((a, i) => {
      nodes[`6.${i}`] = `ASSUMES: ${a}`;
    });
    skeleton.entities.forEach((e, i) => {
      nodes[`7.${i}`] = `ENTITY: ${e}`;
    });
    nodes['8.0'] = `ENTITY: document_type = ${skeleton.documentType}`;
    nodes['8.1'] = `ENTITY: is_excerpt = ${skeleton.isExcerpt}`;

    const nodeCount = Object.keys(nodes).length;
    await pool.query(`
      INSERT INTO tractatus_tiers (job_id, job_type, tier, tree, node_count)
      VALUES ($1, 'mindprobe-evaluation', 0, $2::jsonb, $3)
    `, [jobId, JSON.stringify(nodes), nodeCount]);
  } catch (err) {
    console.error('[Tractatus] skeletonToTier0 failed:', err);
  }
}

export async function updateLiveTier(jobId: string, delta: {
  questionId: string;
  question: string;
  score?: number;
  keyFinding: string;
}): Promise<void> {
  if (jobId === 'memory-only') return;
  try {
    const existing = await pool.query(`
      SELECT id, tree, node_count FROM tractatus_tiers
      WHERE job_id = $1 AND job_type = 'mindprobe-evaluation' AND tier = 1
    `, [jobId]);

    const nodeKey = `Q.${delta.questionId}`;
    const nodeValue = `EVAL: "${delta.question.substring(0, 80)}" → Score:${delta.score ?? '?'}/100 — ${delta.keyFinding.substring(0, 120)}`;

    if (existing.rows.length === 0) {
      const tree: Record<string, string> = { [nodeKey]: nodeValue };
      await pool.query(`
        INSERT INTO tractatus_tiers (job_id, job_type, tier, tree, node_count)
        VALUES ($1, 'mindprobe-evaluation', 1, $2::jsonb, 1)
      `, [jobId, JSON.stringify(tree)]);
    } else {
      const merged = { ...(existing.rows[0].tree as Record<string, string>), [nodeKey]: nodeValue };
      await pool.query(`
        UPDATE tractatus_tiers
        SET tree = $1::jsonb, node_count = $2, last_update = NOW()
        WHERE job_id = $3 AND job_type = 'mindprobe-evaluation' AND tier = 1
      `, [JSON.stringify(merged), existing.rows[0].node_count + 1, jobId]);
    }
  } catch (err) {
    console.error('[Tractatus] updateLiveTier failed:', err);
  }
}

export async function buildTieredPromptContext(jobId: string): Promise<string> {
  if (jobId === 'memory-only') return '';
  try {
    const tiers = await pool.query(`
      SELECT tier, tree FROM tractatus_tiers
      WHERE job_id = $1 AND job_type = 'mindprobe-evaluation'
      ORDER BY tier ASC
    `, [jobId]);

    if (tiers.rows.length === 0) return '';

    const BUDGETS: Record<number, number> = { 0: 6000, 1: 5000 };
    const parts: string[] = [];

    for (const row of tiers.rows) {
      const budget = BUDGETS[row.tier as number] ?? 1500;
      const label = row.tier === 0
        ? 'DOCUMENT SKELETON'
        : row.tier === 1
          ? 'PRIOR EVALUATION FINDINGS'
          : `COMPRESSED MEMORY (Tier ${row.tier})`;

      const tree = row.tree as Record<string, string>;
      const rejectLines = Object.entries(tree)
        .filter(([, v]) => v.startsWith('REJECTS:'))
        .map(([k, v]) => `${k}: ${v}`);
      const otherLines = Object.entries(tree)
        .filter(([, v]) => !v.startsWith('REJECTS:'))
        .map(([k, v]) => `${k}: ${v}`);

      let body = [...rejectLines, ...otherLines].join('\n');
      if (body.length > budget) {
        body = body.substring(0, budget);
      }

      parts.push(`[${label}]\n${body}`);
    }

    return parts.join('\n\n');
  } catch (err) {
    console.error('[Tractatus] buildTieredPromptContext failed:', err);
    return '';
  }
}

export async function completeAnalysisJob(jobId: string): Promise<void> {
  if (jobId === 'memory-only') return;
  try {
    await pool.query(`
      UPDATE analysis_jobs SET status = 'complete', updated_at = NOW()
      WHERE id = $1
    `, [jobId]);
  } catch (err) {
    console.error('[Tractatus] completeAnalysisJob failed:', err);
  }
}
