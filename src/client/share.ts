"use client";

import { Capacitor } from "@capacitor/core";
import {
  exportFileName,
  formatForExport,
  sanitizeForExport,
  type ExportFormat,
} from "@/features/export/export";

export async function copyText(text: string): Promise<boolean> {
  const clean = sanitizeForExport(text);
  try {
    if (Capacitor.isNativePlatform()) {
      const { Clipboard } = await import("@capacitor/clipboard");
      await Clipboard.write({ string: clean });
    } else {
      await navigator.clipboard.writeText(clean);
    }
    return true;
  } catch {
    return false;
  }
}

/** Web: browser download. Android: write to the app cache and open the share sheet (WebViews ignore download links). */
export async function exportText(text: string, title: string, format: ExportFormat): Promise<boolean> {
  const content = formatForExport(text, format);
  const fileName = exportFileName(title, format);
  try {
    if (Capacitor.isNativePlatform()) {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const written = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({ title, files: [written.uri] });
      return true;
    }
    const url = URL.createObjectURL(
      new Blob([content], { type: format === "md" ? "text/markdown" : "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
