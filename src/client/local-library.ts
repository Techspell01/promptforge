"use client";

import { get, set } from "idb-keyval";
import {
  addRecord,
  duplicateRecord,
  parseStoredRecords,
  removeRecord,
  setTags,
  updateRecord,
} from "@/features/library/library-logic";
import type { PromptRecord } from "@/features/library/library.schema";

// Everything the user generates stays on this device (IndexedDB in the browser, the WebView store on Android).
const STORAGE_KEY = "promptforge:prompts:v1";

let queue: Promise<unknown> = Promise.resolve();

export async function loadRecords(): Promise<PromptRecord[]> {
  return parseStoredRecords(await get(STORAGE_KEY));
}

/** Serialises read-modify-write so two quick actions cannot overwrite each other. */
function mutate(change: (records: PromptRecord[]) => PromptRecord[]): Promise<PromptRecord[]> {
  const next = queue.then(async () => {
    const updated = change(await loadRecords());
    await set(STORAGE_KEY, updated);
    return updated;
  });
  queue = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();

export const localLibrary = {
  add: (record: PromptRecord) => mutate((records) => addRecord(records, record)),
  update: (id: string, changes: Parameters<typeof updateRecord>[2]) =>
    mutate((records) => updateRecord(records, id, changes, now())),
  remove: (id: string) => mutate((records) => removeRecord(records, id)),
  duplicate: (id: string) => mutate((records) => duplicateRecord(records, id, crypto.randomUUID(), now())),
  setTags: (id: string, tags: readonly string[]) => mutate((records) => setTags(records, id, tags, now())),
  find: async (id: string) => (await loadRecords()).find((record) => record.id === id),
};
