import { useEffect, useRef, useState } from "react";

export function nextWordEnd(text: string, offset: number, finished: boolean): number {
  if (offset >= text.length) return text.length;
  const remainder = text.slice(offset);
  const match = /^\s*\S+\s*/.exec(remainder);
  if (!match) return finished ? text.length : offset;
  const end = offset + match[0].length;
  // Hold an unfinished token until the next chunk supplies a word boundary.
  return end === text.length && !/\s$/.test(match[0]) && !finished ? offset : end;
}

export function useWordReveal(text: string, finished: boolean, resetKey: string) {
  const [displayedText, setDisplayedText] = useState("");
  const visible = useRef("");
  const key = useRef(resetKey);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ text, finished });
  latest.current = { text, finished };

  useEffect(() => {
    if (key.current !== resetKey) {
      key.current = resetKey;
      // Switching channels reveals already-received history immediately, rather
      // than replaying a completed report before showing new live words.
      visible.current = text;
      setDisplayedText(text);
      return;
    }
    if (!text.startsWith(visible.current)) {
      visible.current = "";
      setDisplayedText("");
    }
    const step = () => {
      timer.current = null;
      const target = latest.current;
      const end = nextWordEnd(target.text, visible.current.length, target.finished);
      if (end <= visible.current.length) return;
      visible.current = target.text.slice(0, end);
      setDisplayedText(visible.current);
      if (end < target.text.length) timer.current = setTimeout(step, 10);
    };
    if (timer.current === null) step();
  }, [text, finished, resetKey]);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  return { displayedText, isCatchingUp: displayedText !== text };
}
