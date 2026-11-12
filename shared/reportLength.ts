export function getReportBudget(analysisType: string) {
  if (analysisType.startsWith("micro-")) {
    return { label: "Micro", paragraphs: 2, targetWords: "160–220", maxWords: 240 };
  }
  if (analysisType.startsWith("comprehensive-") || analysisType.startsWith("macro-")) {
    return { label: "Macro", paragraphs: 10, targetWords: "800–1,000", maxWords: 1100 };
  }
  return { label: "Normal", paragraphs: 5, targetWords: "400–500", maxWords: 600 };
}

export function getReportLengthInstruction(analysisType: string): string {
  const budget = getReportBudget(analysisType);
  return `TOTAL REPORT LENGTH — ${budget.label.toUpperCase()}
Write ONE integrated report of ${budget.paragraphs} paragraphs TOTAL, targeting ${budget.targetWords} words and no more than ${budget.maxWords} words for the entire output.
This budget covers everything: overview, findings, quotations, scores where applicable, and any diagnostic possibilities. It is NOT a per-question allowance.
Use the evaluation questions as an internal checklist. Do not print the questions or answer each in its own section. Synthesize the most consequential evidence-supported findings; do not repeat the same observation under different questions.
Do not add a report title, section headings, separate summary, category list, appendix, concluding recap, or extra diagnostic section outside the budget.
Retain required cognitive score values and fingerprint quotations, but integrate their labels inline within the allotted paragraphs rather than expanding a legacy field-per-line template.
In psychopathological mode, integrate any warranted ranked diagnostic possibilities within the allotted paragraphs, using compact inline ranking if needed. The evidence gate still applies; do not omit warranted candidates just to save space or invent candidates to fill space. The label "Ranked diagnostic possibilities" may be inline, not an additional heading or paragraph.
Use plain text and paragraph breaks. Compact points equivalent to the same amount of prose are acceptable, but must not increase the total word budget.
These whole-report limits override any legacy instructions about exhaustive question-by-question output, per-answer length, extra summaries, or additional format sections. They do not override the requirement for accurate evidence, zero cushioning, and no hostility.`;
}
