import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { AnalysisEngine, type AnalysisType } from "../server/services/analysisEngine";
import { storage } from "../server/storage";
import {
  getEvaluationPolicy,
} from "../server/services/evaluationPolicy";
import { getReportBudget } from "../shared/reportLength";

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

async function captureReport(analysisType: AnalysisType) {
  const { engine, calls } = captureEngine();
  for await (const _ of engine.generateReport(analysisType, "A synthetic passage.", undefined, "zhi1", null)) {}
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
    const call = await captureReport(analysisType);
    assert.match(call.system, /TOP THREE POSSIBLE DIAGNOSTIC RUBRICS/);
    assert.match(call.system, /Histrionic Personality Disorder \(HPD\)/);
    assert.match(call.system, /Borderline Personality Disorder \(BPD\)/);
    assert.match(call.system, /not required answers or an exhaustive list/);
    assert.match(call.system, /not established diagnoses/);
    assert.match(call.system, /Do not fabricate candidates/);
    assert.match(call.prompt, /ranked from most to least supported/);
    assert.match(call.system, /do not omit warranted candidates just to save space/);
  }
});

test("micro psychological answers no longer request scores; cognitive scoring remains intact", async () => {
  for (const analysisType of ["micro-psychological", "micro-psychopathological"] as AnalysisType[]) {
    const call = await captureReport(analysisType);
    assert.match(call.system, /no numerical scores/);
    assert.match(call.prompt, /NO SCORES/);
    assert.doesNotMatch(call.prompt, /State your verdict and the score/);
  }
  const cognitive = await captureReport("micro-cognitive");
  assert.match(cognitive.prompt, /Final Intelligence Score/);
  assert.doesNotMatch(cognitive.system, /no numerical scores/);
});

test("comparisons have one report budget and rank each author separately when warranted", async () => {
  const { engine, calls } = captureEngine();
  const events = [];
  for await (const event of engine.processCompareAnalysis("micro-psychopathological", "A", "B", "Author A", "Author B", [], [], "zhi1")) events.push(event);
  assert.equal(calls.length, 1);
  assert.match(calls[0].system, /ZERO EMPATHY/);
  assert.match(calls[0].system, /2 paragraphs TOTAL/);
  assert.match(calls[0].prompt, /Use qualitative findings only/);
  assert.match(calls[0].prompt, /For each author separately/);
  assert.match(calls[0].prompt, /Give fewer or none/);
  assert.equal(events.filter(e => e.data.complete).length, 1);
});

test("the real analysis pipeline streams one integrated 2/5/10-paragraph report in every mode", async () => {
  for (const domain of ["cognitive", "psychological", "psychopathological"]) {
    for (const prefix of ["micro-", "", "comprehensive-"]) {
      const analysisType = (prefix + domain) as AnalysisType;
      const { engine, calls } = captureEngine();
      engine.extractSkeleton = async () => null;
      const events = [];
      for await (const event of engine.processAnalysis(analysisType, "Synthetic passage.", undefined, "zhi1")) events.push(event);
      assert.equal(calls.length, 1, analysisType);
      assert.match(calls[0].system, new RegExp(`${getReportBudget(analysisType).paragraphs} paragraphs TOTAL`));
      assert.match(calls[0].system, /NOT a per-question allowance/);
      assert.equal(events.filter(e => e.type === "summary").length, 0);
      const completed = events.filter(e => e.type === "question" && e.data.complete);
      assert.equal(completed.length, 1);
      assert.equal(completed[0].data.questionId, "report");
      assert.ok(events.some(e => e.type === "question" && !e.data.complete));
      assert.doesNotMatch(JSON.stringify(events), /95\/100|Pushback|challenging evaluations/);
    }
  }
});
