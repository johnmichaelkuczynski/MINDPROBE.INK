import test from "node:test";
import assert from "node:assert/strict";
import { nextWordEnd } from "../client/src/hooks/useWordReveal";
import { applyStreamEvent, createLiveChannel } from "../client/src/lib/streaming-state";
import { readProviderText } from "../server/services/providerStream";
import { LLMService } from "../server/services/llmService";
import { readEventStream } from "../client/src/lib/read-event-stream";

test("word reveal retains partial words, spacing, Unicode and the final word", () => {
  assert.equal(nextWordEnd("Hello wor", 0, false), 6);
  assert.equal(nextWordEnd("Hello wor", 6, false), 6);
  assert.equal(nextWordEnd("Hello world ", 6, false), 12);
  assert.equal(nextWordEnd("Hello world", 6, true), 11);
  assert.equal(nextWordEnd("  café 世界 ", 0, false), 7);
  assert.equal(nextWordEnd("  café 世界 ", 7, false), 10);
  const text = "\n\nA sentence.\nAnother line with punctuation!";
  let offset = 0;
  const words: string[] = [];
  while (offset < text.length) {
    const next = nextWordEnd(text, offset, true);
    assert.ok(next > offset);
    words.push(text.slice(offset, next));
    offset = next;
  }
  assert.equal(words.join(""), text);
});

test("cumulative SSE snapshots replace sections without duplicating text", () => {
  let channel = createLiveChannel("a", "Text A");
  channel = applyStreamEvent(channel, { type: "summary", data: { content: "First ", complete: false } });
  channel = applyStreamEvent(channel, { type: "summary", data: { content: "First sentence.", complete: true } });
  channel = applyStreamEvent(channel, { type: "question", data: { questionId: "q1", question: "Why?", answer: "Because ", complete: false } });
  channel = applyStreamEvent(channel, { type: "question", data: { questionId: "q1", question: "Why?", answer: "Because it follows.", complete: true } });
  assert.equal(channel.text, "Summary\n\nFirst sentence.\n\nWhy?\n\nBecause it follows.");
  assert.equal(channel.sections.length, 2);
  const partial = channel.text;
  channel = applyStreamEvent(channel, { type: "error", data: { message: "Interrupted" } });
  assert.equal(channel.status, "error");
  assert.equal(channel.text, partial);
  assert.equal(createLiveChannel("b", "Text B").text, "");
});

test("completion and preparation states do not overwrite analysis output", () => {
  let channel = createLiveChannel("a", "Analysis");
  channel = applyStreamEvent(channel, { type: "skeleton", data: { message: "Preparing" } });
  assert.equal(channel.message, "Preparing");
  channel = applyStreamEvent(channel, { type: "summary", data: { content: "Done", complete: true } });
  channel = applyStreamEvent(channel, { type: "complete", data: {} });
  assert.equal(channel.status, "complete");
  assert.equal(channel.text, "Summary\n\nDone");
});

test("malformed stream updates cannot crash the window or discard partial text", () => {
  let channel = createLiveChannel("a", "Analysis");
  channel = applyStreamEvent(channel, { type: "summary", data: { content: "Keep this", complete: false } });
  const invalid = applyStreamEvent(channel, { status: "extracting" } as any);
  assert.equal(invalid.text, channel.text);
  assert.equal(invalid.status, "error");
  assert.match(invalid.message, /invalid stream update/);
});

function responseFor(bytes: Uint8Array, splitEvery = 1) {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += splitEvery) controller.enqueue(bytes.slice(i, i + splitEvery));
      controller.close();
    },
  }));
}

test("provider SSE survives JSON and multi-byte UTF-8 split across reads", async () => {
  const event = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\r\n\r\n`;
  const bytes = new TextEncoder().encode(`: heartbeat\r\n\r\n${event("café ")}${event("— 世界")}data: [DONE]\n\n${event("must not appear")}`);
  const chunks: string[] = [];
  for await (const chunk of readProviderText(responseFor(bytes))) chunks.push(chunk);
  assert.equal(chunks.join(""), "café — 世界");
});

test("provider SSE retains the final event without a trailing newline", async () => {
  const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"last word"}}]}');
  const chunks: string[] = [];
  for await (const chunk of readProviderText(responseFor(bytes, 7))) chunks.push(chunk);
  assert.equal(chunks.join(""), "last word");
});

test("provider stream errors are explicit, not silently discarded", async () => {
  const bytes = new TextEncoder().encode('data: {"error":{"message":"Provider unavailable"}}\n\n');
  await assert.rejects(async () => {
    for await (const _ of readProviderText(responseFor(bytes))) { /* consume */ }
  }, /Provider unavailable/);
});

test("LLM service delivers the first native chunk before generation completes", async () => {
  const service = new LLMService();
  let release!: () => void;
  let completed = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  (service as any).streamOpenAIMessage = async function* () {
    yield "First ";
    await gate;
    completed = true;
    yield "second.";
  };
  const stream = service.streamMessage("zhi1", "test");
  assert.equal((await stream.next()).value, "First ");
  assert.equal(completed, false);
  release();
  assert.equal((await stream.next()).value, "second.");
  assert.equal((await stream.next()).done, true);
});

test("failed live streams never fall back to a completed-response request", async () => {
  const service = new LLMService();
  let bufferedRequests = 0;
  (service as any).sendMessage = async () => { bufferedRequests++; return { content: "Not live" }; };
  (service as any).streamOpenAIMessage = async function* () { yield "Error: unavailable"; };
  await assert.rejects(service.streamMessage("zhi1", "test").next(), /live stream failed/);
  assert.equal(bufferedRequests, 0);
});

test("a partial native stream is preserved when the provider fails", async () => {
  const service = new LLMService();
  (service as any).streamOpenAIMessage = async function* () {
    yield "Keep this ";
    throw new Error("Connection lost");
  };
  const stream = service.streamMessage("zhi1", "test");
  assert.equal((await stream.next()).value, "Keep this ");
  await assert.rejects(stream.next(), /Connection lost/);
});

test("POST event streams dispatch words while the response is still open", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
  let firstEvent!: () => void;
  const first = new Promise<void>(resolve => { firstEvent = resolve; });
  const events: string[] = [];
  let resolved = false;
  const result = readEventStream(new Response(body), event => {
    events.push(event.type);
    firstEvent();
  }).then(value => { resolved = true; return value; });
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode('data: {"type":"question","data":{"answer":"First words "}}\n\n'));
  await first;
  assert.equal(resolved, false);
  assert.deepEqual(events, ["question"]);
  controller.enqueue(encoder.encode('data: {"type":"complete","data":{}}\n\n'));
  controller.close();
  assert.equal((await result).type, "complete");
});

test("a dropped dialogue connection retains received text and reports interruption", async () => {
  const bytes = new TextEncoder().encode('data: {"type":"question","data":{"answer":"Partial reply"}}\n\n');
  let received = "";
  await assert.rejects(
    readEventStream(responseFor(bytes, 2), event => { received = event.data.answer; }),
    /Connection lost before the response completed/,
  );
  assert.equal(received, "Partial reply");
});
