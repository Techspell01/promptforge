// Pure functions over the on-device prompt list, so the library rules are testable without a browser.
import {
  HISTORY_LIMIT,
  LIBRARY_LIMIT,
  MAX_TAGS,
  promptRecordSchema,
  tagNameSchema,
  type LibraryQuery,
  type PromptRecord,
} from "./library.schema";

/** Drops anything malformed (old versions, tampering, partial writes) instead of crashing the UI. */
export function parseStoredRecords(value: unknown): PromptRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = promptRecordSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** History keeps the newest 50 unsaved prompts; saved prompts are never trimmed by history. */
export function trimHistory(records: readonly PromptRecord[]): PromptRecord[] {
  let unsavedKept = 0;
  const trimmed = [...records]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .filter((record) => {
      if (record.saved) return true;
      unsavedKept += 1;
      return unsavedKept <= HISTORY_LIMIT;
    });
  return trimmed.slice(0, LIBRARY_LIMIT + HISTORY_LIMIT);
}

export function addRecord(records: readonly PromptRecord[], record: PromptRecord): PromptRecord[] {
  return trimHistory([record, ...records.filter((existing) => existing.id !== record.id)]);
}

export function updateRecord(
  records: readonly PromptRecord[],
  id: string,
  changes: Partial<
    Pick<PromptRecord, "title" | "saved" | "sections" | "generatedText" | "tokenCount" | "qualityScore">
  >,
  now: string,
): PromptRecord[] {
  return trimHistory(
    records.map((record) => (record.id === id ? { ...record, ...changes, updatedAt: now } : record)),
  );
}

export function removeRecord(records: readonly PromptRecord[], id: string): PromptRecord[] {
  return records.filter((record) => record.id !== id);
}

export function duplicateRecord(
  records: readonly PromptRecord[],
  id: string,
  newId: string,
  now: string,
): PromptRecord[] {
  const source = records.find((record) => record.id === id);
  if (!source) return [...records];
  const copy: PromptRecord = {
    ...source,
    id: newId,
    title: `Copy of ${source.title}`.slice(0, 120),
    createdAt: now,
    updatedAt: now,
  };
  return addRecord(records, copy);
}

/** Invalid tags are dropped rather than rejected, so one typo does not lose the rest. */
export function normaliseTags(input: readonly string[]): string[] {
  const valid = input.flatMap((tag) => {
    const parsed = tagNameSchema.safeParse(tag);
    return parsed.success ? [parsed.data] : [];
  });
  return [...new Set(valid)].slice(0, MAX_TAGS).sort();
}

export function setTags(
  records: readonly PromptRecord[],
  id: string,
  tags: readonly string[],
  now: string,
): PromptRecord[] {
  const normalised = normaliseTags(tags);
  return records.map((record) =>
    record.id === id ? { ...record, tags: normalised, updatedAt: now } : record,
  );
}

export function queryRecords(records: readonly PromptRecord[], query: LibraryQuery): PromptRecord[] {
  const needle = query.q?.trim().toLowerCase() ?? "";
  return records
    .filter((record) => (query.view === "library" ? record.saved : true))
    .filter((record) => !needle || `${record.title} ${record.rawIdea}`.toLowerCase().includes(needle))
    .filter((record) => !query.tag || record.tags.includes(query.tag))
    .sort((left, right) =>
      query.view === "library"
        ? right.updatedAt.localeCompare(left.updatedAt)
        : right.createdAt.localeCompare(left.createdAt),
    )
    .slice(0, query.view === "library" ? LIBRARY_LIMIT : HISTORY_LIMIT);
}

export function allTags(records: readonly PromptRecord[]): string[] {
  return [...new Set(records.filter((record) => record.saved).flatMap((record) => record.tags))].sort();
}
