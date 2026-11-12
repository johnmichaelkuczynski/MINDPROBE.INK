/**
 * Decode provider SSE without assuming TCP reads end on JSON or UTF-8 boundaries.
 * A single event can arrive over many network reads.
 */
export async function* readProviderText(response: Response): AsyncGenerator<string> {
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  if (!response.body) throw new Error("Provider response has no streaming body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];

  function parseEvent() {
    const payload = dataLines.join("\n");
    dataLines = [];
    if (!payload) return { done: false, content: "" };
    if (payload.trim() === "[DONE]") return { done: true, content: "" };
    const event = JSON.parse(payload);
    if (event.error) throw new Error(event.error.message || "Provider stream failed");
    const content = event.choices?.[0]?.delta?.content;
    return { done: false, content: typeof content === "string" ? content : "" };
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).replace(/^ /, ""));
        } else if (line === "") {
          const event = parseEvent();
          if (event.done) return;
          if (event.content) yield event.content;
        }
      }
      if (done) {
        if (buffer.startsWith("data:")) dataLines.push(buffer.slice(5).replace(/^ /, ""));
        const event = parseEvent();
        if (event.content) yield event.content;
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
