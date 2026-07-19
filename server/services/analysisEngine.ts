import { LLMService, LLMProvider } from './llmService';
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

export class AnalysisEngine {
  private llmService: LLMService;
  private completeInstructions: string;

  constructor() {
    this.llmService = new LLMService();
    this.completeInstructions = this.loadCompleteInstructions();
  }

  private loadCompleteInstructions(): string {
    try {
      const instructionsPath = path.join(process.cwd(), 'complete_instructions.txt');
      return fs.readFileSync(instructionsPath, 'utf8');
    } catch (error) {
      console.error('Failed to load complete instructions:', error);
      return '';
    }
  }

  private getVerbosity(analysisType: AnalysisType): Verbosity {
    if (analysisType.startsWith('micro-')) return 'micro';
    if (analysisType.startsWith('comprehensive-')) return 'comprehensive';
    return 'normal';
  }

  getQuestions(analysisType: AnalysisType): AnalysisQuestion[] {
    // Check psychopathological BEFORE psychological — it contains 'psychological' as a substring
    if (analysisType.includes('psychopathological')) return this.getPsychopathologicalQuestions();
    if (analysisType.includes('psychological')) return this.getPsychologicalQuestions();
    if (analysisType.includes('cognitive')) return this.getCognitiveQuestions();
    throw new Error(`Unknown analysis type: ${analysisType}`);
  }

  async *processAnalysis(
    analysisType: AnalysisType,
    text: string,
    additionalContext: string | undefined,
    provider: LLMProvider
  ): AsyncGenerator<{ type: 'summary' | 'question'; data: any }> {
    const verbosity = this.getVerbosity(analysisType);

    yield* this.generateSummary(text, provider, verbosity);

    const questions = this.getQuestions(analysisType);
    
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      for (const question of batch) {
        yield* this.processQuestion(question, text, additionalContext, provider, verbosity);
      }
      
      if (i + batchSize < questions.length) {
        await this.delay(10000);
      }
    }

    if (verbosity === 'comprehensive') {
      yield* this.processComprehensivePhases(analysisType, text, provider);
    }
  }

  private async *generateSummary(
    text: string,
    provider: LLMProvider,
    verbosity: Verbosity
  ): AsyncGenerator<{ type: 'summary'; data: any }> {
    const lengthInstruction = verbosity === 'micro'
      ? 'Be extremely brief — one short sentence per field.'
      : verbosity === 'comprehensive'
      ? 'Be thorough and detailed in your summary.'
      : 'Be concise but informative.';

    const prompt = `${this.completeInstructions}

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

  private async *processQuestion(
    question: AnalysisQuestion,
    text: string,
    additionalContext: string | undefined,
    provider: LLMProvider,
    verbosity: Verbosity
  ): AsyncGenerator<{ type: 'question'; data: any }> {
    const contextPrompt = additionalContext ? `Additional context: ${additionalContext}\n\n` : '';

    const lengthInstruction = verbosity === 'micro'
      ? `RESPONSE LENGTH: One sentence — two at the absolute most. State your verdict and the score. Nothing else. No setup, no hedging, no padding.`
      : verbosity === 'comprehensive'
      ? `RESPONSE LENGTH: Write two or more full paragraphs. You must include at least one direct illustrative quote from the text in each paragraph. Explore every dimension of the question thoroughly. Do not truncate.`
      : `RESPONSE LENGTH: One focused paragraph. Include at least one direct illustrative quote from the text to support your assessment. No more, no less.`;

    const prompt = `${this.completeInstructions}

${contextPrompt}Answer this question in connection with this text: ${question.question}

Text: ${text}

ANSWER THESE QUESTIONS IN CONNECTION WITH THIS TEXT. 

A score of N/100 (e.g. 73/100) means that (100-N)/100 (e.g. 27/100) outperform the author with respect to the parameter defined by the question. 

You are not grading; you are answering these questions. You do not use a risk-averse standard; you do not attempt to be diplomatic; you do not attempt to comply with risk-averse, medium-range IQ, academic norms. You do not make assumptions about the level of the paper; it could be a work of the highest excellence and genius, or it could be the work of a moron.

If a work is a work of genius, you say that, and you say why; you do not shy away from giving what might conventionally be regarded as excessively "superlative" scores; you give it the score it deserves, not the score that a midwit committee would say it deserves.

You think very very very hard about your answers; make it very clear that you are not to default to cookbook, midwit evaluation protocols.

DO NOT GIVE CREDIT MERELY FOR USE OF JARGON OR FOR REFERENCING AUTHORITIES. FOCUS ON SUBSTANCE. ONLY GIVE POINTS FOR SCHOLARLY REFERENCES/JARGON IF THEY UNAMBIGUOUSLY INCREASE SUBSTANCE.

CRITICAL SCORING DIRECTION — SCORES ALWAYS MEASURE QUALITY, NOT THE PRESENCE OF A FLAW:
- If a question asks about a NEGATIVE trait (e.g. "does it use jargon to OBFUSCATE?", "are the points clichéd?", "is it forced and artificial?"), then DETECTING that negative trait means the text is BAD on that dimension → score LOW (e.g. 5–25/100).
- If a question asks about a POSITIVE trait (e.g. "is it insightful?", "does it use jargon for PRECISION?"), then detecting that positive trait means the text is GOOD → score HIGH.
- NEVER reward a text for having a flaw. Jargoneering — using jargon to obfuscate rather than clarify — is a serious intellectual defect. A text that jargonizes to obscure meaning deserves a score near 0/100 on that question, not 90/100. A high score for the jargon question is ONLY appropriate when the jargon demonstrably sharpens precision and adds substance.

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
    provider: LLMProvider
  ): AsyncGenerator<{ type: 'question'; data: any }> {
    yield {
      type: 'question',
      data: {
        questionId: 'phase2',
        question: 'Comprehensive Analysis — Phase 2 (Pushback Protocol)',
        answer: 'Reviewing scores and challenging evaluations below 95/100...',
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

  private getPsychologicalQuestions(): AnalysisQuestion[] {
    return [
      { id: 'p1', question: 'Does the text reveal a stable, coherent self-concept, or is the self fragmented/contradictory?', order: 1 },
      { id: 'p2', question: 'Is there evidence of ego strength (resilience, capacity to tolerate conflict/ambiguity), or does the psyche rely on brittle defenses?', order: 2 },
      { id: 'p3', question: 'Are defenses primarily mature (sublimation, humor, anticipation), neurotic (intellectualization, repression), or primitive (splitting, denial, projection)?', order: 3 },
      { id: 'p4', question: 'Does the writing show integration of affect and thought, or are emotions split off / overly intellectualized?', order: 4 },
      { id: 'p5', question: 'Is the author\'s stance defensive/avoidant or direct/engaged?', order: 5 },
      { id: 'p6', question: 'Does the psyche appear narcissistically organized (grandiosity, fragile self-esteem, hunger for validation), or not?', order: 6 },
      { id: 'p7', question: 'Are desires/drives expressed openly, displaced, or repressed?', order: 7 },
      { id: 'p8', question: 'Does the voice suggest internal conflict (superego vs. id, competing identifications), or monolithic certainty?', order: 8 },
      { id: 'p9', question: 'Is there evidence of object constancy (capacity to sustain nuanced view of others) or splitting (others seen as all-good/all-bad)?', order: 9 },
      { id: 'p10', question: 'Is aggression integrated (channeled productively) or dissociated/projected?', order: 10 },
      { id: 'p11', question: 'Is the author capable of irony/self-reflection, or trapped in compulsive earnestness / defensiveness?', order: 11 },
      { id: 'p12', question: 'Does the text suggest psychological growth potential (openness, curiosity, capacity to metabolize experience) or rigidity?', order: 12 },
      { id: 'p13', question: 'Is the discourse paranoid / persecutory (others as threats, conspiracies) or reality-based?', order: 13 },
      { id: 'p14', question: 'Does the tone reflect authentic engagement with reality, or phony simulation of depth?', order: 14 },
      { id: 'p15', question: 'Is the psyche resilient under stress, or fragile / evasive?', order: 15 },
      { id: 'p16', question: 'Is there evidence of compulsion or repetition (obsessional returns to the same themes), or flexible progression?', order: 16 },
      { id: 'p17', question: 'Does the author show capacity for intimacy / genuine connection, or only instrumental/defended relations?', order: 17 },
      { id: 'p18', question: 'Is shame/guilt worked through constructively or disavowed/projected?', order: 18 },
    ];
  }

  private getPsychopathologicalQuestions(): AnalysisQuestion[] {
    return [
      { id: 'pp1', question: 'Is there evidence of formal thought disorder — loosening of associations, tangentiality, or incoherence — or is the thinking tightly organized?', order: 1 },
      { id: 'pp2', question: 'Does the text show signs of paranoid ideation — ideas of reference, persecutory themes, or pathological suspiciousness?', order: 2 },
      { id: 'pp3', question: 'Is there evidence of grandiosity — an inflated sense of special status, mission, or powers not grounded in reality?', order: 3 },
      { id: 'pp4', question: 'Does the writing show affective dysregulation — inappropriate affect, extreme emotional swings, or flattened affect?', order: 4 },
      { id: 'pp5', question: 'Is reality testing intact? Does the author distinguish clearly between fantasy and fact, or is the boundary blurred?', order: 5 },
      { id: 'pp6', question: 'Is there evidence of obsessional thinking — intrusive, repetitive, ego-dystonic ideation — or compulsive ideational patterns?', order: 6 },
      { id: 'pp7', question: 'Are there markers of depressive cognition — hopelessness, self-condemnation, nihilism, or anhedonic framing of experience?', order: 7 },
      { id: 'pp8', question: 'Is there evidence of hypomanic or manic ideation — pressured quality, flight of ideas, decreased need for logical grounding?', order: 8 },
      { id: 'pp9', question: 'Does the text reveal dissociative phenomena — depersonalization, derealization, identity fragmentation, or discontinuities in the narrative self?', order: 9 },
      { id: 'pp10', question: 'Are there narcissistic injury markers — extreme sensitivity to perceived slights, rageful responses to criticism, entitlement?', order: 10 },
      { id: 'pp11', question: 'Is there evidence of splitting as a dominant defensive operation — idealizing and devaluing alternately, with no tolerance for ambivalence?', order: 11 },
      { id: 'pp12', question: 'Does the text show impaired impulse regulation — evidence of acting out ideation, poor delay of gratification in argument?', order: 12 },
      { id: 'pp13', question: 'Is there magical or concrete thinking — failure to sustain abstraction, over-literalism, or belief in thought-action fusion?', order: 13 },
      { id: 'pp14', question: 'Does the author show evidence of somatic preoccupation or hypochondriacal ideation — excessive focus on bodily states, health, decay?', order: 14 },
      { id: 'pp15', question: 'Is there evidence of social-pragmatic failure — inability to gauge audience, violation of conversational norms, tone-deafness?', order: 15 },
      { id: 'pp16', question: 'Does the text show antisocial or psychopathic features — callousness, instrumental use of others, absence of guilt or empathy markers?', order: 16 },
      { id: 'pp17', question: 'Is there evidence of anxiety dysregulation — catastrophizing, excessive hedging, or paralytic ambivalence?', order: 17 },
      { id: 'pp18', question: 'Overall: does the psychopathological profile, if any emerges, represent a consistent diagnostic picture, or are the markers scattered and non-specific?', order: 18 },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
