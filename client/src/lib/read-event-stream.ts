import type { StreamEvent } from "@/types/analysis";

export async function readEventStream(response: Response, onEvent: (event: StreamEvent) => void) {
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  if (!response.body) throw new Error("Live response body is unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lines: string[] = [];
  let terminal: StreamEvent | undefined;
  const dispatch = () => {
    if (!lines.length) return;
    const event = JSON.parse(lines.join("\n")) as StreamEvent;
    lines = [];
    onEvent(event);
    if (event.type === "error") throw new Error(event.data?.message || "Response interrupted");
    if (event.type === "complete") terminal = event;
  };
  try {
    while (!terminal) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, "");
        buffer = buffer.slice(end + 1);
        if (line.startsWith("data:")) lines.push(line.slice(5).replace(/^ /, ""));
        else if (!line) dispatch();
      }
      if (done) {
        if (buffer.startsWith("data:")) lines.push(buffer.slice(5).replace(/^ /, ""));
        dispatch();
        break;
      }
    }
    if (!terminal) throw new Error("Connection lost before the response completed. Partial output is preserved.");
    return terminal;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
