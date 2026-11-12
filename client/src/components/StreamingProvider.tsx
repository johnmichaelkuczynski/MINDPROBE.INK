import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Radio } from "lucide-react";
import { StreamingWindow } from "./StreamingWindow";
import { applyStreamEvent, createLiveChannel, type LiveChannel } from "@/lib/streaming-state";
import type { StreamEvent } from "@/types/analysis";

interface StreamingContextValue {
  startStream: (id: string, label: string) => void;
  receiveEvent: (id: string, event: StreamEvent) => void;
  reportError: (id: string, message: string) => void;
  getOutputText: (id: string | null) => string;
}

const StreamingContext = createContext<StreamingContextValue | null>(null);

export function StreamingProvider({ children }: { children: ReactNode }) {
  const [streams, setStreams] = useState<LiveChannel[]>([]);
  const [open, setOpen] = useState(false);

  const startStream = useCallback((id: string, label: string) => {
    setStreams(previous => previous.some(stream => stream.id === id)
      ? previous
      : [...previous, createLiveChannel(id, label)]);
    setOpen(true);
  }, []);

  const receiveEvent = useCallback((id: string, event: StreamEvent) => {
    setStreams(previous => previous.map(stream => stream.id === id ? applyStreamEvent(stream, event) : stream));
  }, []);

  const reportError = useCallback((id: string, message: string) => {
    setStreams(previous => previous.map(stream => stream.id === id && stream.status !== "complete"
      ? { ...stream, status: "error", message }
      : stream));
  }, []);

  return (
    <StreamingContext.Provider value={{
      startStream, receiveEvent, reportError,
      getOutputText: id => streams.find(stream => stream.id === id)?.text ?? "",
    }}>
      {children}
      <StreamingWindow open={open} onClose={() => setOpen(false)} streams={streams} />
      {!open && streams.length > 0 && (
        <button
          type="button"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white shadow-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          onClick={() => setOpen(true)}
          data-testid="streaming-window-reopen"
        >
          <Radio className="h-4 w-4" aria-hidden="true" /> Streaming
        </button>
      )}
    </StreamingContext.Provider>
  );
}

export function useStreamingWindow() {
  const context = useContext(StreamingContext);
  if (!context) throw new Error("StreamingProvider is required");
  return context;
}
