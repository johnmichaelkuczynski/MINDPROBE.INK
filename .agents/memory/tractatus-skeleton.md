---
name: Tractatus-Skeleton Architecture
description: 3-pass CC system for long-document evaluation in Mind Probe; skeleton before questions, tractatus live tier after each question.
---

## What was built

Pass 1 (skeleton extraction): Before any evaluation questions run, a single LLM call extracts a `DocumentSkeleton` (thesis, outline, keyTerms, asserts, rejects, assumes, entities, documentType, isExcerpt). This is injected into EVERY subsequent question prompt.

Pass 2 (constrained question processing): Each question prompt includes the skeleton block + a ledger of prior question findings (last 10). This ensures cross-question coherence and calibration.

Pass 3 (tractatus live tier): After each question, score + key finding are stored in `tractatus_tiers` (Tier 1) in Neon Postgres. `buildTieredPromptContext` can retrieve all tiers for injection.

## Key files

- `server/services/tractatusMemory.ts` — all DB operations (tables: analysis_jobs, tractatus_tiers, tractatus_archive)
- `server/services/analysisEngine.ts` — skeleton extraction + injection + ledger accumulation

## DB tables created on startup

analysis_jobs, tractatus_tiers (tier 0 = skeleton, tier 1 = live), tractatus_archive

## Anti-sycophancy clauses

`ANTI_SYCOPHANCY_CLAUSES` constant in analysisEngine.ts must appear in chunk prompts, tier-1 update prompts, and compression prompts — verbatim, never paraphrased.

**Why:** Recursive compression smooths contradictions. The clauses prevent REJECTS entries from being softened into OPENs.

## Excerpt handling

`isExcerpt: true` in skeleton triggers a banner and a special evaluation note: "Evaluate it as an introduction — does it frame a problem, motivate a thesis, signal intellectual architecture? Do NOT penalise for incompleteness."

## Frontend

New `skeleton` event type in SSE stream → `RealTimeResults.tsx` shows a 3-phase banner: extracting (spinner) → complete (green, shows doc type) → failed (amber warning).
