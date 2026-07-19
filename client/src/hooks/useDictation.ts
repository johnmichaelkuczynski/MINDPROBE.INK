import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type DictationState = "idle" | "connecting" | "recording" | "error";

interface UseDictationOptions {
  onTranscript: (text: string) => void;
}

const SAMPLE_RATE = 16000;

export function useDictation({ onTranscript }: UseDictationOptions) {
  const [state, setState] = useState<DictationState>("idle");
  const { toast } = useToast();

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const partialRef = useRef<string>("");

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ terminate_session: true }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    partialRef.current = "";
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") {
      stop();
      return;
    }

    setState("connecting");

    try {
      // Get temporary token from backend
      const res = await fetch("/api/assemblyai/token", { method: "POST" });
      if (!res.ok) throw new Error("Could not get dictation token");
      const { token } = await res.json();

      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Audio Context at 16 kHz
      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      // Open AssemblyAI real-time WebSocket
      const ws = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${SAMPLE_RATE}&token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setState("recording");

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)));
          }
          ws.send(int16.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (!msg.text) return;

        if (msg.message_type === "PartialTranscript") {
          partialRef.current = msg.text;
        } else if (msg.message_type === "FinalTranscript") {
          const finalText = msg.text.trim();
          partialRef.current = "";
          if (finalText) {
            onTranscript(finalText + " ");
          }
        }
      };

      ws.onerror = () => {
        toast({ title: "Dictation error", description: "Connection to voice service failed", variant: "destructive" });
        stop();
      };

      ws.onclose = (e) => {
        if (e.code !== 1000 && state === "recording") {
          setState("idle");
        }
      };
    } catch (err: any) {
      console.error("Dictation start error:", err);
      const msg = err?.message?.includes("Permission")
        ? "Microphone access denied. Please allow microphone in your browser."
        : err?.message || "Could not start voice input";
      toast({ title: "Could not start dictation", description: msg, variant: "destructive" });
      stop();
      setState("idle");
    }
  }, [state, stop, onTranscript, toast]);

  return { state, start, stop };
}
