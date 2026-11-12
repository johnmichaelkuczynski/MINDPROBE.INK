import type { StreamEvent } from "@/types/analysis";

export interface LiveSection {
  id: string;
  heading: string;
  content: string;
}

export interface LiveChannel {
  id: string;
  label: string;
  status: "connecting" | "streaming" | "complete" | "error";
  message: string;
  text: string;
  sections: LiveSection[];
  sectionComplete?: boolean;
}

export function createLiveChannel(id: string, label: string): LiveChannel {
  return { id, label, status: "connecting", message: "Connecting to live output…", text: "", sections: [] };
}

export function applyStreamEvent(channel: LiveChannel, event: StreamEvent): LiveChannel {
  if (!event || !event.data || typeof event.data !== "object" ||
      !["skeleton", "summary", "question", "complete", "error"].includes(event.type)) {
    return { ...channel, status: "error", message: "Received an invalid stream update. Partial output is preserved." };
  }
  if (event.type === "complete") {
    return { ...channel, status: "complete", message: "Analysis complete" };
  }
  if (event.type === "error") {
    return { ...channel, status: "error", message: event.data.message || "Stream interrupted. Partial output is preserved." };
  }
  if (event.type === "skeleton") {
    return { ...channel, status: "streaming", message: event.data.message || "Preparing analysis…" };
  }
  const isSummary = event.type === "summary";
  const id = isSummary ? "summary" : `question:${event.data.questionId}`;
  const section: LiveSection = {
    id,
    heading: isSummary ? "Summary" : event.data.question || event.data.questionId || "Analysis",
    content: (isSummary ? event.data.content : event.data.answer) || "",
  };
  // SSE sends cumulative snapshots, not deltas. Replace the section to avoid duplicated words.
  const sections = channel.sections.some(item => item.id === id)
    ? channel.sections.map(item => item.id === id ? section : item)
    : [...channel.sections, section];
  return {
    ...channel,
    status: "streaming",
    message: event.data.complete ? "Continuing analysis…" : "Receiving live output",
    sections,
    sectionComplete: Boolean(event.data.complete),
    text: sections.map(item => `${item.heading}\n\n${item.content}`).join("\n\n"),
  };
}
