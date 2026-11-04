import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/features/settings/settings.schema";
import {
  addRecord,
  allTags,
  duplicateRecord,
  normaliseTags,
  parseStoredRecords,
  queryRecords,
  removeRecord,
  setTags,
  updateRecord,
} from "./library-logic";
import type { PromptRecord } from "./library.schema";

function record(index: number, overrides: Partial<PromptRecord> = {}): PromptRecord {
  const time = new Date(Date.UTC(2026, 10, 4, 0, 0, index)).toISOString();
  return {
    id: randomUUID(),
    title: `Prompt ${index}`,
    rawIdea: `Idea number ${index}`,
    settings: DEFAULT_SETTINGS,
    sections: [{ id: "security", content: "- Secrets.", enabled: true }],
    generatedText: "## 1 SECURITY\n- Secrets.",
    tokenCount: 10,
    qualityScore: 50,
    archetype: "web",
    saved: false,
    tags: [],
    createdAt: time,
    updatedAt: time,
    ...overrides,
  };
}

const NOW = "2026-11-05T00:00:00.000Z";

describe("on-device library", () => {
  it("keeps only the newest 50 unsaved prompts but never trims saved ones", () => {
    let records: PromptRecord[] = [record(0, { saved: true, title: "Keeper" })];
    for (let index = 1; index <= 60; index += 1) records = addRecord(records, record(index));
    expect(records.filter((item) => !item.saved)).toHaveLength(50);
    expect(records.some((item) => item.title === "Keeper")).toBe(true);
    expect(records.some((item) => item.title === "Prompt 1")).toBe(false);
  });

  it("saves to the library and searches title and idea", () => {
    const first = record(1, { title: "Invoice tracker" });
    const second = record(2, { rawIdea: "A recipe planner" });
    let records = [first, second];
    records = updateRecord(records, first.id, { saved: true }, NOW);
    records = updateRecord(records, second.id, { saved: true }, NOW);
    expect(queryRecords(records, { view: "library", q: "invoice" }).map((item) => item.id)).toEqual([
      first.id,
    ]);
    expect(queryRecords(records, { view: "library", q: "RECIPE" }).map((item) => item.id)).toEqual([
      second.id,
    ]);
    expect(queryRecords(records, { view: "library", q: "%" })).toEqual([]);
  });

  it("normalises tags and filters by them", () => {
    expect(normaliseTags([" Food ", "food", "<script>", "web", ""])).toEqual(["food", "web"]);
    const item = record(1, { saved: true });
    const records = setTags([item], item.id, ["Food", "web"], NOW);
    expect(allTags(records)).toEqual(["food", "web"]);
    expect(queryRecords(records, { view: "library", tag: "food" })).toHaveLength(1);
    expect(queryRecords(records, { view: "library", tag: "other" })).toHaveLength(0);
  });

  it("duplicates and deletes", () => {
    const item = record(1);
    const duplicated = duplicateRecord([item], item.id, randomUUID(), NOW);
    expect(duplicated.map((entry) => entry.title).sort()).toEqual(["Copy of Prompt 1", "Prompt 1"]);
    expect(removeRecord(duplicated, item.id).map((entry) => entry.title)).toEqual(["Copy of Prompt 1"]);
  });

  it("drops corrupted or tampered entries read back from storage", () => {
    const valid = record(1);
    const stored: unknown = [
      valid,
      { id: "not-a-uuid" },
      null,
      { ...valid, id: randomUUID(), qualityScore: 900 },
    ];
    expect(parseStoredRecords(stored)).toEqual([valid]);
    expect(parseStoredRecords("garbage")).toEqual([]);
  });
});
