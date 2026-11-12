export async function copyTextToClipboard(text: string): Promise<void> {
  if (!text.trim()) throw new Error("There is no output to copy yet");
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browser permission policies block the modern API but allow copying
      // a selection during the same user action.
    }
  }
  const previousFocus = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const previousRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard access was denied");
  } finally {
    textarea.remove();
    previousFocus?.focus({ preventScroll: true });
    if (selection && previousRanges.length) {
      selection.removeAllRanges();
      previousRanges.forEach(range => selection.addRange(range));
    }
  }
}
