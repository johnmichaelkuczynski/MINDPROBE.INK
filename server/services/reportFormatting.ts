/**
 * Correct paragraph boundaries, never the report's words or conclusions.
 * The raw answer is streamed first; only the completed snapshot is reflowed.
 */
export function formatReportParagraphs(text: string, target: number): string {
  const original = text.trim();
  if (!original || original.split(/\n\s*\n/).length === target) return original;
  const flat = original.replace(/\s+/g, " ");
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const sentences: string[] = [];
  let pending = "";
  for (const part of Array.from(segmenter.segment(flat))) {
    pending = `${pending} ${part.segment}`.trim();
    // Keep short labels such as "1." attached to their following sentence.
    if (pending.split(/\s+/).length >= 4) {
      sentences.push(pending);
      pending = "";
    }
  }
  if (pending) {
    if (sentences.length) sentences[sentences.length - 1] += ` ${pending}`;
    else sentences.push(pending);
  }
  // Do not invent content or split a sentence just to fill paragraph slots.
  if (sentences.length < target) return original;
  const cumulative = [0];
  for (const sentence of sentences) cumulative.push(cumulative[cumulative.length - 1] + sentence.split(/\s+/).length);
  const total = cumulative[cumulative.length - 1];
  const paragraphs: string[] = [];
  let start = 0;
  for (let part = 1; part < target; part++) {
    const ideal = total * part / target;
    const lastAllowed = sentences.length - (target - part);
    let end = start + 1;
    for (let candidate = end + 1; candidate <= lastAllowed; candidate++) {
      if (Math.abs(cumulative[candidate] - ideal) < Math.abs(cumulative[end] - ideal)) end = candidate;
    }
    paragraphs.push(sentences.slice(start, end).join(" "));
    start = end;
  }
  paragraphs.push(sentences.slice(start).join(" "));
  return paragraphs.join("\n\n");
}
