import type { ModelContent } from "@/features/skeleton/build";
import { isSectionId, type SectionId } from "@/features/skeleton/sections";

export interface SectionDelta {
  readonly section: SectionId;
  readonly text: string;
}

const MARKER = /^\s*@@([a-z_]+)\s*$/;

/**
 * Turns streamed model text into per-section content, line by line.
 * Only whitelisted ids are accepted, each once; anything outside a valid marker is discarded,
 * so the model (or an injected idea) cannot invent, reorder or repeat sections.
 */
export class SectionStreamParser {
  private buffer = "";
  private current: SectionId | null = null;
  private readonly seen = new Set<SectionId>();
  private readonly content = new Map<SectionId, string[]>();

  constructor(private readonly allowed: ReadonlySet<SectionId>) {}

  push(chunk: string): SectionDelta[] {
    this.buffer += chunk;
    const deltas: SectionDelta[] = [];
    let newline = this.buffer.indexOf("\n");
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      const delta = this.acceptLine(line);
      if (delta) deltas.push(delta);
      newline = this.buffer.indexOf("\n");
    }
    return deltas;
  }

  finish(): { deltas: SectionDelta[]; sections: ModelContent } {
    const deltas: SectionDelta[] = [];
    if (this.buffer.length > 0) {
      const delta = this.acceptLine(this.buffer);
      if (delta) deltas.push(delta);
      this.buffer = "";
    }
    const sections: Partial<Record<SectionId, string>> = {};
    for (const [id, lines] of this.content) {
      const text = lines.join("\n").trim();
      if (text) sections[id] = text;
    }
    return { deltas, sections };
  }

  private acceptLine(line: string): SectionDelta | undefined {
    const marker = MARKER.exec(line);
    if (marker) {
      const id = marker[1] ?? "";
      this.current = isSectionId(id) && this.allowed.has(id) && !this.seen.has(id) ? id : null;
      if (this.current) this.seen.add(this.current);
      return undefined;
    }
    if (!this.current) return undefined;
    const lines = this.content.get(this.current) ?? [];
    lines.push(line);
    this.content.set(this.current, lines);
    return { section: this.current, text: `${line}\n` };
  }
}
