import assert from "node:assert/strict";
import { test } from "node:test";
import { formatReportParagraphs } from "../server/services/reportFormatting";

const sentences = Array.from({ length: 30 }, (_, i) => `Finding ${i + 1} has a distinct supporting quotation and evidentiary explanation.`);
const flatten = (text: string) => text.replace(/\s+/g, " ").trim();

test("completed reports have 2, 5, or 10 paragraphs without losing or changing words", () => {
  const input = sentences.join(" ");
  for (const count of [2, 5, 10]) {
    const output = formatReportParagraphs(input, count);
    assert.equal(output.split("\n\n").length, count);
    assert.equal(flatten(output), flatten(input));
  }
});

test("already-correct report paragraphs and diagnostic rankings are preserved", () => {
  const input = 'A finding supported by “specific evidence.”\n\nRanked diagnostic possibilities: 1) BPD — evidence; 2) HPD — evidence; 3) NPD — evidence.';
  assert.equal(formatReportParagraphs(input, 2), input);
});

test("reflow retains inline cognitive scores, Unicode, quotes, and numbered diagnostic labels", () => {
  const input = `${sentences.join(" ")} Theoretical Power: 30/100; Demonstrative Execution: 20/100; Final Intelligence Score: 25/100. Ranked diagnostic possibilities: 1. A possibility supported by “café — 世界” evidence. 2. A second possibility supported by another quotation.`;
  assert.equal(flatten(formatReportParagraphs(input, 10)), flatten(input));
});

test("insufficient material is not padded with invented content or broken sentences", () => {
  assert.equal(formatReportParagraphs("Only one evidenced finding.", 10), "Only one evidenced finding.");
  assert.equal(formatReportParagraphs("", 2), "");
});
