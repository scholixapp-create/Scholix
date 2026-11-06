import test from "node:test";
import assert from "node:assert/strict";
import { parseGuidedProgressNotes, serializeGuidedProgressNotes } from "./guidedProgressNotes";

test("guided progress notes round-trip and keep all three headings", () => {
  const sections = ["Reviewed fractions", "Finish workbook pages 8-9", "Move on to decimals"] as const;
  const saved = serializeGuidedProgressNotes([...sections]);
  assert.deepEqual(parseGuidedProgressNotes(saved), [...sections]);
});

test("empty guided notes remain optional", () => {
  assert.equal(serializeGuidedProgressNotes(["", " ", ""]), "");
  assert.deepEqual(parseGuidedProgressNotes(null), ["", "", ""]);
});

test("legacy unstructured notes remain intact in the first field", () => {
  assert.deepEqual(parseGuidedProgressNotes("Fractions covered. Review workbook."), [
    "Fractions covered. Review workbook.", "", "",
  ]);
});
