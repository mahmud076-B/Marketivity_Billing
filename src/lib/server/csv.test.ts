import { test } from "node:test";
import assert from "node:assert";
import { formatCsv } from "./csv.ts";

test("formatCsv formats correctly", () => {
  const rows = [
    ["Name", "Amount", "Note"],
    ["John", 100, null],
    ["Jane", 200, undefined],
    ["Bob", 300, ""],
  ];
  const out = formatCsv(rows);
  assert.equal(out, "\uFEFFName,Amount,Note\nJohn,100,\nJane,200,\nBob,300,");
});

test("formatCsv escapes quotes and commas", () => {
  const rows = [
    ["Name", "Note"],
    ["John Doe", "Hello, world"],
    ["Jane Doe", "She said \"yes\""],
    ["Bob", "Line 1\nLine 2"],
  ];
  const out = formatCsv(rows);
  assert.equal(
    out,
    "\uFEFFName,Note\nJohn Doe,\"Hello, world\"\nJane Doe,\"She said \"\"yes\"\"\"\nBob,\"Line 1\nLine 2\""
  );
});

test("formatCsv handles Bengali text with BOM", () => {
  const rows = [
    ["Name", "Amount"],
    ["রহিম", "৳ ১০০"],
  ];
  const out = formatCsv(rows);
  assert.ok(out.startsWith("\uFEFF"));
  assert.ok(out.includes("রহিম"));
  assert.ok(out.includes("৳"));
});
