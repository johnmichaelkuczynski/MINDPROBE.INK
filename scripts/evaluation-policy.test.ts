import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { AnalysisEngine, type AnalysisType } from "../server/services/analysisEngine";
import { storage } from "../server/storage";
import {
  ANALYTICAL_TONE_POLICY,
  diagnosticAnswerLength,
  getEvaluationPolicy,
} from "../server/services/evaluationPolicy";

// Exercise actual prompt assembly without constructing the engine (which starts
// database initialization), reading references, or contacting an LLM.
const originalReferences = storage.getReferenceExamples;
before(() => { storage.getReferenceExamples = async () => []; });
after(() => { storage.getReferenceExamples = originalReferences; });

function captureEngine() {
  const calls: { prompt: string; system: string }[] = [];
  const engine = Object.create(AnalysisEngine.prototype) as any;
  engine.completeInstructions = "Historical reference instructions.";
  engine.delay = async () => {};
  engine.llmService = {
    async *streamMessage(_provider: string, prompt: string, system: string) {
      calls.push({ prompt, system });
      yield "Observed pattern.";
    },
  };
  return { engine, calls };
}

async function captureQuestion(analysisType: AnalysisType, questionId: string) {
  const { engine, calls } = captureEngine();
  const question = engine.getQuestions(analysisType).find((q: any) => q.id === questionId);
  assert.ok(question);
  const verbosity = analysisType.startsWith("micro-") ? "micro" : analysisType.startsWith("comprehensive-") ? "comprehensive" : "normal";
  for await (const _ of engine.processQuestion(question, "A synthetic passage.", undefined, "zhi1", verbosity, null, [], "memory-only", analysisType)) {}
  return calls[0];
}

test("all nine modes require zero empathy without hostility or fabricated certainty", () => {
  for (const base of ["cognitive", "psychological", "psychopathological"]) {
    for (const prefix of ["", "micro-", "comprehensive-"]) {
      const policy = getEvaluationPolicy(prefix + base);
      assert.match(policy, /ZERO EMPATHY/);
      assert.match(policy, /Do nothing to soften/);
      assert.match(policy, /No insults, contempt, ridicule/);
      assert.match(policy, /do not invent certainty/);
      assert.match(policy, /Do not automatically assume the narrator is dishonest/);
    }
  }
});

test("specific ranked diagnostic possibilities are required only in psychopathological mode", () => {
  for (const prefix of ["", "micro-", "comprehensive-"]) {
    assert.match(getEvaluationPolicy(prefix + "psychopathological"), /TOP THREE POSSIBLE DIAGNOSTIC RUBRICS/);
    assert.match(getEvaluationPolicy(prefix + "psychopathological"), /If only one or two rubrics are clearly warranted/);
    assert.match(getEvaluationPolicy(prefix + "psychopathological"), /If none is clearly warranted/);
    assert.match(getEvaluationPolicy(prefix + "psychopathological"), /EVIDENCE GATE BEFORE RANKING/);
    assert.match(getEvaluationPolicy(prefix + "psychopathological"), /STOP there: no ranked heading/);
    assert.match(getEvaluationPolicy(prefix + "psychopathological"), /never say duration, cross-context recurrence, or impairment is missing when the passage explicitly describes it/);
    assert.doesNotMatch(getEvaluationPolicy(prefix + "psychological"), /TOP THREE/);
    assert.doesNotMatch(getEvaluationPolicy(prefix + "cognitive"), /TOP THREE/);
  }
});

test("psychopathological mode retains the existing questions apart from its diagnostic rubric", () => {
  const { engine } = captureEngine();
  const psychological = engine.getQuestions("psychological");
  const psychopathological = engine.getQuestions("psychopathological");
  assert.equal(psychopathological.length, psychological.length);
  for (let i = 0; i < psychological.length; i++) {
    assert.equal(psychopathological[i].id, psychological[i].id);
    if (psychological[i].id !== "ps17") assert.deepEqual(psychopathological[i], psychological[i]);
  }
  assert.doesNotMatch(psychological.find((q: any) => q.id === "ps17").question, /top three/);
});

test("the active diagnostic question preserves the ranking in all three verbosity levels", async () => {
  for (const analysisType of ["psychopathological", "micro-psychopathological", "comprehensive-psychopathological"] as AnalysisType[]) {
    const call = await captureQuestion(analysisType, "ps17");
    assert.match(call.system, /TOP THREE POSSIBLE DIAGNOSTIC RUBRICS/);
    assert.match(call.prompt, /Histrionic Personality Disorder \(HPD\)/);
    assert.match(call.prompt, /Borderline Personality Disorder \(BPD\)/);
    assert.match(call.prompt, /not required answers or an exhaustive list/);
    assert.match(call.prompt, /not established diagnoses/);
    assert.match(call.prompt, /Do not fabricate candidates/);
    assert.match(call.prompt, /ranked from most to least supported/);
    if (analysisType.startsWith("micro-")) {
      assert.match(call.prompt, /exception to the one-sentence micro limit/);
    }
  }
});

test("micro psychological answers no longer request scores; cognitive scoring remains intact", async () => {
  for (const analysisType of ["micro-psychological", "micro-psychopathological"] as AnalysisType[]) {
    const call = await captureQuestion(analysisType, "ps1");
    assert.match(call.system, /no numerical scores/);
    assert.match(call.prompt, /State your evidence-based verdict directly. No score/);
    assert.doesNotMatch(call.prompt, /State your verdict and the score/);
  }
  const cognitive = await captureQuestion("micro-cognitive", "1");
  assert.match(cognitive.prompt, /State your verdict and the score/);
});

test("summaries and comparisons use the same tone policy; comparison ranks each author separately", async () => {
  const { engine, calls } = captureEngine();
  for await (const _ of engine.generateSummary("Synthetic text.", "zhi1", "normal", null)) {}
  assert.equal(calls[0].system, ANALYTICAL_TONE_POLICY);
  for await (const _ of engine.processCompareAnalysis("psychopathological", "A", "B", "Author A", "Author B", [], [], "zhi1")) {}
  assert.equal(calls.length, 6);
  for (const call of calls.slice(1)) {
    assert.match(call.system, /ZERO EMPATHY/);
    assert.match(call.prompt, /Use qualitative findings only/);
  }
  assert.match(calls[5].prompt, /For each author separately/);
  assert.match(calls[5].prompt, /Give fewer or none/);
});

test("comprehensive completion no longer advertises upward-only score pressure", async () => {
  const { engine } = captureEngine();
  const events = [];
  for await (const event of engine.processComprehensivePhases("comprehensive-psychopathological", "text", "zhi1", null, [])) events.push(event);
  assert.doesNotMatch(JSON.stringify(events), /95\/100|Pushback|challenging evaluations/);
  assert.match(JSON.stringify(events), /All evaluation questions have been answered/);
  assert.match(diagnosticAnswerLength("comprehensive"), /counterevidence/);
});
