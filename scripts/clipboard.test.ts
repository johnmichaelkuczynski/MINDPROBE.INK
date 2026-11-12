import test from "node:test";
import assert from "node:assert/strict";
import { copyTextToClipboard } from "../client/src/lib/clipboard";

function replaceGlobal(t: any, key: string, value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { configurable: true, value });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, key, previous);
    else delete (globalThis as any)[key];
  });
}

test("copies the exact output, including headings, Unicode, and whitespace", async t => {
  let copied = "";
  replaceGlobal(t, "navigator", { clipboard: { writeText: async (text: string) => { copied = text; } } });
  const output = "Summary\n\nCafé — 世界\n\nQuestion?\nPartial answer ";
  await copyTextToClipboard(output);
  assert.equal(copied, output);
});

test("empty output is not sent to the clipboard", async t => {
  let writes = 0;
  replaceGlobal(t, "navigator", { clipboard: { writeText: async () => { writes++; } } });
  await assert.rejects(copyTextToClipboard(" \n "), /no output to copy/);
  assert.equal(writes, 0);
});

test("falls back to selection copying and restores focus when permissions block the clipboard API", async t => {
  let copied = "", removed = false, restored = false;
  const textarea = { value: "", readOnly: false, style: {}, select() {}, remove() { removed = true; } };
  replaceGlobal(t, "navigator", { clipboard: { writeText: async () => { throw new Error("Denied"); } } });
  replaceGlobal(t, "document", {
    activeElement: { focus() { restored = true; } },
    getSelection: () => null,
    createElement: () => textarea,
    body: { appendChild() {} },
    execCommand(command: string) { assert.equal(command, "copy"); copied = textarea.value; return true; },
  });
  await copyTextToClipboard("Actual partial output");
  assert.equal(copied, "Actual partial output");
  assert.equal(removed, true);
  assert.equal(restored, true);
});

test("does not claim success when both clipboard methods are blocked", async t => {
  let removed = false;
  replaceGlobal(t, "navigator", {});
  replaceGlobal(t, "document", {
    activeElement: null, getSelection: () => null,
    createElement: () => ({ value: "", style: {}, select() {}, remove() { removed = true; } }),
    body: { appendChild() {} }, execCommand: () => false,
  });
  await assert.rejects(copyTextToClipboard("Output"), /Clipboard access was denied/);
  assert.equal(removed, true);
});
