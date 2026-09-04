import assert from "node:assert/strict";
import { test } from "node:test";
import { renderContents } from "./cat.js";

test("passes contents through unchanged by default", () => {
  assert.equal(renderContents("hello\nworld\n"), "hello\nworld\n");
});

test("numbers lines when asked", () => {
  assert.equal(
    renderContents("hello\nworld\n", { lineNumbers: true }),
    "1  hello\n2  world\n",
  );
});

test("pads line numbers to a consistent width", () => {
  const contents = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
  const output = renderContents(contents, { lineNumbers: true });
  assert.match(output, /^ 1  line 1\n/);
  assert.match(output, /\n10  line 10\n$/);
});

test("preserves the absence of a trailing newline", () => {
  assert.equal(renderContents("no newline", { lineNumbers: true }), "1  no newline");
});
