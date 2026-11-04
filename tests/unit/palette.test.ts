// Design contract: zero hue anywhere, and every text pair meets WCAG AA in both themes.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");

/** Spec palette plus #E5E5E5, which the spec names for light-mode loading skeletons. */
const ALLOWED = new Set([
  "#000000",
  "#0a0a0a",
  "#111111",
  "#1a1a1a",
  "#2a2a2a",
  "#666666",
  "#a3a3a3",
  "#d4d4d4",
  "#e5e5e5",
  "#f5f5f5",
  "#ffffff",
]);

function cssTokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((match): [string, string] => [
      match[1] ?? "",
      (match[2] ?? "").toLowerCase(),
    ]),
  );
}

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing ${selector} block`);
  return cssTokens(css.slice(start, css.indexOf("}", start)));
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(entry) && !entry.endsWith(".test.ts") ? [full] : [];
  });
}

const THEMES = { light: tokens(":root"), dark: tokens(':root[data-theme="dark"]') };

// [foreground, background, minimum ratio]: 4.5 for text, 3 for control borders and focus rings.
const PAIRS: readonly [string, string, number][] = [
  ["ink", "canvas", 4.5],
  ["ink", "surface", 4.5],
  ["ink", "hover", 4.5],
  ["muted", "canvas", 4.5],
  ["muted", "surface", 4.5],
  ["inverse-ink", "inverse", 4.5],
  ["control", "canvas", 3],
  ["focus", "canvas", 3],
];

describe("monochrome palette", () => {
  it.each(Object.entries(THEMES))("uses only palette greys in the %s theme", (_name, theme) => {
    for (const value of Object.values(theme)) expect(ALLOWED.has(value)).toBe(true);
  });

  it("uses no other hex colours, rgb() hues or Tailwind colour classes anywhere in src", () => {
    const hueClass =
      /\b(?:bg|text|border|ring|fill|stroke|outline|accent|from|to|via|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/;
    for (const file of sourceFiles(path.join(root, "src"))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        expect(ALLOWED.has(match[0].toLowerCase()), `${file}: ${match[0]}`).toBe(true);
      }
      expect(hueClass.test(text), `${file} uses a coloured Tailwind class`).toBe(false);
      expect(/hsl\(|oklch\(|gradient\(/i.test(text), `${file} uses hsl/oklch/gradient`).toBe(false);
    }
  });

  it("keeps the dark media-query tokens identical to the explicit dark theme", () => {
    const start = css.indexOf("@media (prefers-color-scheme: dark)");
    const block = css.slice(start, css.indexOf("}", start));
    const mediaTokens = cssTokens(block);
    expect(mediaTokens).toEqual(THEMES.dark);
  });
});

describe("contrast", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    it.each(PAIRS)(`${name}: %s on %s meets %d:1`, (foreground, background, minimum) => {
      const ratio = contrast(theme[foreground] ?? "", theme[background] ?? "");
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    });
  }
});
