import { stripControlCharacters } from "@/features/skeleton/sanitize";

export type ExportFormat = "md" | "txt";

/** Exported files are plain text: control characters and bidi overrides are removed, line endings normalised. */
export function sanitizeForExport(text: string): string {
  return `${stripControlCharacters(text).trim()}\n`;
}

/** Markdown keeps `##` headers; plain text turns them into uppercase lines. */
export function formatForExport(text: string, format: ExportFormat): string {
  const clean = sanitizeForExport(text);
  return format === "md" ? clean : clean.replace(/^## /gm, "");
}

export function exportFileName(title: string, format: ExportFormat): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "prompt"}.${format}`;
}
