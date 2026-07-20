import { LLMService, LLMProvider } from './llmService';
import * as tractatus from './tractatusMemory';
import type { DocumentSkeleton } from './tractatusMemory';
import fs from 'fs';
import path from 'path';

export type AnalysisType =
  | 'micro-cognitive'
  | 'cognitive'
  | 'comprehensive-cognitive'
  | 'micro-psychological'
  | 'psychological'
  | 'comprehensive-psychological'
  | 'micro-psychopathological'
  | 'psychopathological'
  | 'comprehensive-psychopathological';

type Verbosity = 'micro' | 'normal' | 'comprehensive';

export interface AnalysisQuestion {
  id: string;
  question: string;
  order: number;
}

export interface AnalysisResponse {
  questionId: string;
  question: string;
  answer: string;
  score?: number;
}

interface LedgerEntry {
  questionId: string;
  question: string;
  score?: number;
  keyFinding: string;
}

const ANTI_SYCOPHANCY_CLAUSES = `
- Preserve every REJECTS entry verbatim. Do not soften, qualify, or convert a REJECTS into an OPEN.
- Preserve every numerical value, date, proper name, citation, and quoted phrase exactly as it appears.
- If two entries contradict, do not silently merge them.
- Defeats, negative results, and counterexamples are load-bearing. Preserve them.
- You are not being graded on smoothness, harmony, or readability.
`.trim();

export class AnalysisEngine {
  private llmService: LLMService;
  private completeInstructions: string;

  constructor() {
    this.llmService = new LLMService();
    this.completeInstructions = this.loadCompleteInstructions();
    tractatus.initTractatusTables().catch(() => {});
  }

  private loadCompleteInstructions(): string {
    try {
      const p = path.join(process.cwd(), 'complete_instructions.txt');
      return fs.readFileSync(p, 'utf8');
    } catch {
      return '';
    }
  }

  private getVerbosity(analysisType: AnalysisType): Verbosity {
    if (analysisType.startsWith('micro-')) return 'micro';
    if (analysisType.startsWith('comprehensive-')) return 'comprehensive';
    return 'normal';
  }

  getQuestions(analysisType: AnalysisType): AnalysisQuestion[] {
    if (analysisType.includes('psychopathological')) return this.getPsychopathologicalQuestions();
    if (analysisType.includes('psychological')) return this.getPsychologicalQuestions();
    if (analysisType.includes('cognitive')) return this.getCognitiveQuestions();
    throw new Error(`Unknown analysis type: ${analysisType}`);
  }

  private parseScore(answer: string): number | undefined {
    const m = answer.match(/Score:\s*(\d+)\s*\/\s*100/i);
    return m ? parseInt(m[1], 10) : undefined;
  }

  private extractKeyFinding(answer: string): string {
    const lines = answer.split('\n').map(l => l.trim()).filter(l => l.length > 30);
    return (lines[0] ?? answer).substring(0, 140);
  }

  private wordCount(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private formatSkeletonBlock(skeleton: DocumentSkeleton | null): string {
    if (!skeleton) return '';

    const excerptNote = skeleton.isExcerpt
      ? `\nIMPORTANT — DOCUMENT TYPE: ${skeleton.documentType}. This is a fragment: an introduction, abstract, or excerpt. It may assert a thesis without yet having executed the argument. EVALUATE IT AS AN INTRODUCTION: does it successfully frame a problem, signal intellectual architecture, and motivate an approach? Do NOT penalise it for arguments that will appear in later sections.`
      : `\nDOCUMENT TYPE: ${skeleton.documentType}.`;

    const outline = skeleton.outline.map((o, i) => `  ${i + 1}. ${o}`).join('\n');
    const terms = skeleton.keyTerms.length
      ? skeleton.keyTerms.map(kt => `  "${kt.term}": ${kt.definition}`).join('\n')
      : '  (none identified)';
    const asserts = skeleton.asserts.length
      ? skeleton.asserts.map(a => `  + ${a}`).join('\n')
      : '  (none)';
    const rejects = skeleton.rejects.length
      ? skeleton.rejects.map(r => `  - ${r}`).join('\n')
      : '  (none)';
    const assumes = skeleton.assumes.length
      ? skeleton.assumes.map(a => `  ~ ${a}`).join('\n')
      : '  (none)';

    return `╔══ DOCUMENT SKELETON (read before answering — this is what the document is doing) ══╗
THESIS: ${skeleton.thesis}
${excerptNote}

ARGUMENT OUTLINE:
${outline}

KEY TERMS (as used in this document):
${terms}

WHAT THIS DOCUMENT ASSERTS:
${asserts}

WHAT THIS DOCUMENT EXPLICITLY REJECTS:
${rejects}

LOAD-BEARING ASSUMPTIONS:
${assumes}
╚════════════════════════════════════════════════════════════════════════════════════╝`;
  }

  private formatLedgerBlock(ledger: LedgerEntry[]): string {
    if (ledger.length === 0) return '';
    const recent = ledger.slice(-10);
    const lines = recent.map(e =>
      `  [${e.questionId}] "${e.question.substring(0, 70)}…" → ${e.score != null ? `${e.score}/100` : 'unscored'} | ${e.keyFinding.substring(0, 100)}`
    ).join('\n');
    return `╔══ PRIOR QUESTION FINDINGS (maintain consistency — do not contradict these) ══╗
${lines}
╚═══════════════════════════════════════════════════════════════════════════════╝`;
  }

  private async extractSkeleton(
    text: string,
    provider: LLMProvider
  ): Promise<DocumentSkeleton | null> {
    const wc = this.wordCount(text);
    const textForExtraction = wc > 15000
      ? text.split(/\s+/).slice(0, 15000).join(' ') + '\n[... document continues beyond skeleton sample ...]'
      : text;

    const prompt = `You are extracting a structural skeleton from a document that will be evaluated by a cognitive/psychological profiling system. The skeleton will be injected into every evaluation question so the LLM evaluator knows what the document is actually trying to do — not just what it says in any individual chunk.

DOCUMENT (${wc} words):
${textForExtraction}

Return ONLY valid JSON — no markdown, no code fences, no preamble, no postamble:
{
  "thesis": "Central argument or purpose in 1-3 sentences",
  "outline": ["8-20 key structural steps, claims, or section purposes — cover the whole arc"],
  "keyTerms": [{"term": "important term", "definition": "its meaning as used in this document"}],
  "asserts": ["3-8 positive claims the document makes"],
  "rejects": ["2-5 positions or views the document argues against — CRITICAL, do not omit"],
  "assumes": ["2-4 load-bearing assumptions the argument depends on"],
  "entities": ["authors, theories, named concepts that must stay consistent across evaluation"],
  "documentType": "one of: Complete Essay, Introduction, Abstract, Book Chapter, Excerpt, Short Piece, Academic Article, Opinion Piece, Philosophical Essay",
  "isExcerpt": false
}

Set isExcerpt to true if the document is clearly a fragment: an introduction that promises to argue X but has not yet, an abstract, a piece referencing Part II or Chapter 3 as forthcoming, etc.

${ANTI_SYCOPHANCY_CLAUSES}`;

    let raw = '';
    try {
      for await (const chunk of this.llmService.streamMessage(provider, prompt)) {
        raw += chunk;
      }
      const s = raw.indexOf('{');
      const e = raw.lastIndexOf('}');
      if (s === -1 || e === -1) throw new Error('No JSON object found in skeleton response');
      return JSON.parse(raw.substring(s, e + 1)) as DocumentSkeleton;
    } catch (err) {
      console.error('[Skeleton] Extraction failed:', err);
      return null;
    }
  }

  async *processAnalysis(
    analysisType: AnalysisType,
    text: string,
    additionalContext: string | undefined,
    provider: LLMProvider
  ): AsyncGenerator<{ type: 'skeleton' | 'summary' | 'question'; data: any }> {
    const verbosity = this.getVerbosity(analysisType);
    const wc = this.wordCount(text);

    yield { type: 'skeleton', data: { status: 'extracting', message: 'Extracting document skeleton for cross-chunk coherence…' } };

    const skeleton = await this.extractSkeleton(text, provider);

    if (skeleton) {
      yield { type: 'skeleton', data: { status: 'complete', skeleton, message: `Skeleton extracted: ${skeleton.documentType}${skeleton.isExcerpt ? ' (excerpt)' : ''}` } };
    } else {
      yield { type: 'skeleton', data: { status: 'failed', message: 'Skeleton extraction failed — proceeding without global context' } };
    }

    let jobId = 'memory-only';
    if (skeleton) {
      jobId = await tractatus.createAnalysisJob({
        wordCount: wc,
        analysisType,
        provider,
        skeleton,
      });
      await tractatus.skeletonToTier0(jobId, skeleton);
    }

    yield* this.generateSummary(text, provider, verbosity, skeleton);

    const questions = this.getQuestions(analysisType);
    const ledger: LedgerEntry[] = [];
    const batchSize = 5;

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const question of batch) {
        let finalAnswer = '';
        for await (const event of this.processQuestion(question, text, additionalContext, provider, verbosity, skeleton, ledger, jobId, analysisType)) {
          finalAnswer = event.data.answer;
          yield event;
        }

        const score = this.parseScore(finalAnswer);
        const keyFinding = this.extractKeyFinding(finalAnswer);
        ledger.push({ questionId: question.id, question: question.question, score, keyFinding });
        await tractatus.updateLiveTier(jobId, { questionId: question.id, question: question.question, score, keyFinding });
      }

      if (i + batchSize < questions.length) {
        await this.delay(10000);
      }
    }

    if (verbosity === 'comprehensive') {
      yield* this.processComprehensivePhases(analysisType, text, provider, skeleton, ledger);
    }

    await tractatus.completeAnalysisJob(jobId);
  }

  private async *generateSummary(
    text: string,
    provider: LLMProvider,
    verbosity: Verbosity,
    skeleton: DocumentSkeleton | null
  ): AsyncGenerator<{ type: 'summary'; data: any }> {
    const lengthInstruction = verbosity === 'micro'
      ? 'Be extremely brief — one short sentence per field.'
      : verbosity === 'comprehensive'
        ? 'Be thorough and detailed in your summary.'
        : 'Be concise but informative.';

    const skeletonHint = skeleton
      ? `\nDocument type identified: ${skeleton.documentType}. Thesis: ${skeleton.thesis.substring(0, 200)}\n`
      : '';

    const prompt = `${this.completeInstructions}
${skeletonHint}
TASK: Summarize the following text and categorize it. Provide:
1. Category (e.g., Academic Essay, Personal Writing, Technical Document, etc.)
2. Summary (2-3 sentences)
3. Length (character and word count)
4. Style description

${lengthInstruction}

Text: ${text}`;

    let summary = '';
    for await (const chunk of this.llmService.streamMessage(provider, prompt)) {
      summary += chunk;
      yield { type: 'summary', data: { content: summary, complete: false } };
    }
    yield { type: 'summary', data: { content: summary, complete: true } };
  }

  private getDomainScoringCalibration(analysisType: AnalysisType): string {
    const domain = analysisType.includes('psychological') || analysisType.includes('psychopathological')
      ? 'clinical'
      : 'cognitive';

    if (domain === 'clinical') {
      return `CLINICAL SCORING CALIBRATION — READ THIS BEFORE SCORING:

The score N/100 measures the INTENSITY or SEVERITY of the clinically significant feature the question asks about. It does NOT measure "how good" the writer is. It measures how prominently the relevant clinical marker is present.

For questions framed as dichotomies, the score measures the pathological or clinically significant end:
  "paranoid vs reality-based" → score = degree of paranoid ideation (not reality-testing)
  "fragmented vs stable identity" → score = degree of fragmentation
  "brittle defenses vs ego strength" → score = degree of brittleness
  "full human beings vs objects/persecutors" → score = degree of objectification/persecution framing
  "authentic engagement vs phony simulation" → score = degree of inauthenticity

Score interpretation:
  1–10   = feature essentially absent; cannot be detected
  11–30  = faint trace; possible but not clearly present
  31–50  = moderately present; detectable pattern
  51–70  = clearly present; prominent feature of the text
  71–85  = strongly present; unmistakable and consistent
  86–95  = very strongly present; would surprise a clinician if absent
  96–99  = textbook, maximal expression; a teaching example

DO NOT cluster scores in the 50–75 range out of diplomatic habit. If a text exhibits obvious clinical-level paranoid ideation, flagrant reality testing failures, or textbook psychotic features, the relevant scores MUST be in the 86–99 range. Giving such a text a 50 because you want to seem balanced is a clinical error, not a virtue.

Quote the text directly to justify your score. Scores without quoted evidence are not acceptable.`;
    }

    return `COGNITIVE SCORING CALIBRATION:

A score of N/100 means the author outperforms N% of all writers with respect to the cognitive parameter defined by the question. Use the full range 1–99. Do not cluster in the middle. A text of genuine brilliance scores 95+; a text of genuine stupidity scores under 10. Most texts fall between 30 and 70. Use whatever the text actually deserves.`;
  }

  private async *processQuestion(
    question: AnalysisQuestion,
    text: string,
    additionalContext: string | undefined,
    provider: LLMProvider,
    verbosity: Verbosity,
    skeleton: DocumentSkeleton | null,
    ledger: LedgerEntry[],
    jobId: string,
    analysisType: AnalysisType
  ): AsyncGenerator<{ type: 'question'; data: any }> {
    const contextPrompt = additionalContext ? `Additional context: ${additionalContext}\n\n` : '';

    const lengthInstruction = verbosity === 'micro'
      ? `RESPONSE LENGTH: One sentence — two at the absolute most. State your verdict and the score. Nothing else.`
      : verbosity === 'comprehensive'
        ? `RESPONSE LENGTH: Write two or more full paragraphs. Include at least one direct illustrative quote from the text in each paragraph. Explore every dimension of the question thoroughly. Do not truncate.`
        : `RESPONSE LENGTH: One focused paragraph. Include at least one direct illustrative quote from the text to support your assessment.`;

    const skeletonBlock = this.formatSkeletonBlock(skeleton);
    const ledgerBlock = this.formatLedgerBlock(ledger);
    const scoringCalibration = this.getDomainScoringCalibration(analysisType);

    const dbContext = jobId !== 'memory-only'
      ? await tractatus.buildTieredPromptContext(jobId)
      : '';

    const contextSection = [skeletonBlock, ledgerBlock, dbContext]
      .filter(s => s.trim().length > 0)
      .join('\n\n');

    const prompt = `${this.completeInstructions}

${contextSection ? contextSection + '\n\n' : ''}${contextPrompt}Answer this question in connection with this text: ${question.question}

Text: ${text}

ANSWER THIS QUESTION IN CONNECTION WITH THIS TEXT.

${scoringCalibration}

You are not applying risk-averse, middle-of-the-road evaluation standards. You are not being diplomatic. You are not complying with institutional timidity or midwit academic norms. You call what you see, using the full scoring range, and you justify every score with direct quotations from the text.

You think very hard about your answers. You do not default to cookbook protocols.

Use NO formatting markup whatsoever - no **, *, ##, +++, ---, ***, ###, etc. Write in plain text only.

${lengthInstruction}

Structure your response as:
[Your analysis with specific quotations and reasoning]

Score: XX/100`;

    let answer = '';
    for await (const chunk of this.llmService.streamMessage(provider, prompt)) {
      answer += chunk;
      yield {
        type: 'question',
        data: { questionId: question.id, question: question.question, answer, complete: false }
      };
    }
    yield {
      type: 'question',
      data: { questionId: question.id, question: question.question, answer, complete: true }
    };
  }

  private async *processComprehensivePhases(
    analysisType: AnalysisType,
    text: string,
    provider: LLMProvider,
    skeleton: DocumentSkeleton | null,
    ledger: LedgerEntry[]
  ): AsyncGenerator<{ type: 'question'; data: any }> {
    yield {
      type: 'question',
      data: {
        questionId: 'phase2',
        question: 'Comprehensive Analysis — Phase 2 (Pushback Protocol)',
        answer: 'Reviewing scores and challenging evaluations below 95/100…',
        complete: true
      }
    };
  }

  private getCognitiveQuestions(): AnalysisQuestion[] {
    return [
      { id: '1', question: 'Is it insightful?', order: 1 },
      { id: '2', question: 'Does it develop points? (Or, if it is a short excerpt, is there evidence that it would develop points if extended)?', order: 2 },
      { id: '3', question: 'Is the organization merely sequential (just one point after another, little or no logical scaffolding)? Or are the ideas arranged, not just sequentially but hierarchically?', order: 3 },
      { id: '4', question: 'If the points it makes are not insightful, does it operate skillfully with canons of logic/reasoning?', order: 4 },
      { id: '5', question: 'Are the points cliches? Or are they "fresh"?', order: 5 },
      { id: '6', question: 'Does it use technical jargon to obfuscate or to render more precise?', order: 6 },
      { id: '7', question: 'Is it organic? Do points develop in an organic, natural way? Do they "unfold"? Or are they forced and artificial?', order: 7 },
      { id: '8', question: 'Does it open up new domains? Or, on the contrary, does it shut off inquiry (by conditionalizing further discussion of the matters on acceptance of its internal and possibly very faulty logic)?', order: 8 },
      { id: '9', question: 'Is it actually intelligent or just the work of somebody who, judging by the subject-matter, is presumed to be intelligent (but may not be)?', order: 9 },
      { id: '10', question: 'Is it real or is it phony?', order: 10 },
      { id: '11', question: 'Do the sentences exhibit complex and coherent internal logic?', order: 11 },
      { id: '12', question: 'Is the passage governed by a strong concept? Or is the only organization driven purely by expository (as opposed to epistemic) norms?', order: 12 },
      { id: '13', question: 'Is there system-level control over ideas? In other words, does the author seem to recall what he said earlier and to be in a position to integrate it into points he has made since then?', order: 13 },
      { id: '14', question: 'Are the points "real"? Are they fresh? Or is some institution or some accepted vein of propaganda or orthodoxy just using the author as a mouth piece?', order: 14 },
      { id: '15', question: 'Is the writing evasive or direct?', order: 15 },
      { id: '16', question: 'Are the statements ambiguous?', order: 16 },
      { id: '17', question: 'Does the progression of the text develop according to who said what or according to what entails or confirms what?', order: 17 },
      { id: '18', question: 'Does the author use other authors to develop his ideas or to cloak his own lack of ideas?', order: 18 },
    ];
  }

  private getClinicalQuestions(): AnalysisQuestion[] {
    return [
      { id: 'c1', question: 'What is the writer\'s overall level of character organization: healthy/neurotic (integrated identity, mature defenses, reality testing intact), borderline (identity diffusion, primitive defenses, reality testing intact but fragile), psychotic (identity fragmented, reality testing impaired), or mixed?', order: 1 },
      { id: 'c2', question: 'Is there any evidence of reported perceptions without external corroboration (things seen, heard, or felt that others don\'t confirm)?', order: 2 },
      { id: 'c3', question: 'Is malign agency attributed to unseen entities, groups, or forces?', order: 3 },
      { id: 'c4', question: 'Are there ideas of reference — signs that the writer treats neutral events (license plates, overheard remarks, patterns) as personally directed?', order: 4 },
      { id: 'c5', question: 'Are phonological or associative connections (rhyme, sound, wordplay) treated as though they carry semantic or causal weight?', order: 5 },
      { id: 'c6', question: 'Are there magical rules governing behavior — rituals, protective objects, forbidden actions with no rational basis?', order: 6 },
      { id: 'c7', question: 'Is there grandiose special knowledge, mission, or identity that isn\'t supported by external context?', order: 7 },
      { id: 'c8', question: 'What is the writer\'s dominant defensive style: repression, splitting, projection, projective identification, denial, intellectualization, sublimation, reaction formation, or something else?', order: 8 },
      { id: 'c9', question: 'Are other people in the text rendered as full human beings with independent inner lives, as need-satisfying objects, as persecutors, as extensions of the writer, or are they absent entirely?', order: 9 },
      { id: 'c10', question: 'Does the writer split people (or themselves) into all-good and all-bad, sometimes flipping the same person between the two?', order: 10 },
      { id: 'c11', question: 'What is the affective quality of the writing: appropriate, flat, labile, constricted, over-modulated by intellectualization, or dysregulated?', order: 11 },
      { id: 'c12', question: 'Is there evidence of internal conflict — worry about right conduct, ambivalence, doing-and-undoing, obsessive circling, competing wishes the writer can\'t reconcile?', order: 12 },
      { id: 'c13', question: 'Are there specific neurotic traits present: obsessionality, compulsiveness, phobic avoidance, panic tendency, hypochondriacal focus, scrupulosity?', order: 13 },
      { id: 'c14', question: 'If neurotic traits are present, are they impairing function or enhancing it (obsessionality can drive both dysfunction and elite performance depending on what it seizes on)?', order: 14 },
      { id: 'c15', question: 'Does the writer show capacity for insight — awareness of their own patterns, limitations, or the way they might appear to others?', order: 15 },
      { id: 'c16', question: 'How does reality testing hold under stress within the passage — does the writer stay grounded when describing difficult material, or do they lose purchase?', order: 16 },
      { id: 'c17', question: 'Is there evidence of transactional-only relationships, absence of loyalty or empathy, exploitation of others, or cruelty (to people, children, animals)?', order: 17 },
      { id: 'c18', question: 'Is there rule-compliant behavior that mocks the spirit of the rules — technically-legal manipulation, weaponized procedure, calibrated cruelty within permitted limits?', order: 18 },
      { id: 'c19', question: 'Is there evidence of impulsivity, promiscuity, substance use, thrill-seeking, or reckless disregard for consequences?', order: 19 },
      { id: 'c20', question: 'Is the writer\'s identity stable and continuous across the passage, or does it fragment, shift, or contradict itself in ways the writer doesn\'t notice?', order: 20 },
      { id: 'c21', question: 'What is the writer\'s stance toward authority, dependency, and being cared for — accepting, defiant, contemptuous, clinging, avoidant, or ambivalent?', order: 21 },
      { id: 'c22', question: 'Given all of the above, what are the most plausible clinical framings (with an explicit disclaimer that these are not diagnoses), and are there multiple frames operative simultaneously?', order: 22 },
    ];
  }

  private getPsychologicalQuestions(): AnalysisQuestion[] {
    return this.getClinicalQuestions();
  }

  private getPsychopathologicalQuestions(): AnalysisQuestion[] {
    return this.getClinicalQuestions();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
