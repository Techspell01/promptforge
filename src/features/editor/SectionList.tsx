"use client";

import { LockKeyhole } from "lucide-react";
import {
  PROTECTED_SECTIONS,
  SECTION_TITLES,
  type Section,
  type SectionId,
} from "@/features/skeleton/sections";
import { TextArea } from "@/ui/primitives";

interface SectionListProps {
  readonly sections: readonly Section[];
  readonly onToggle: (id: SectionId, enabled: boolean) => void;
  readonly onEdit: (id: SectionId, content: string) => void;
}

export function SectionList({ sections, onToggle, onEdit }: SectionListProps) {
  return (
    <ol className="flex flex-col gap-2">
      {sections.map((section, index) => {
        const locked = PROTECTED_SECTIONS.has(section.id);
        const inputId = `section-${section.id}`;
        return (
          <li
            key={section.id}
            className={`rounded-xl border p-4 transition-colors duration-150 ${
              section.enabled ? "border-line-strong bg-card" : "border-dashed border-line-strong bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor={inputId}
                className={`flex items-baseline gap-3 font-mono text-[12px] font-medium uppercase tracking-[0.06em] ${
                  section.enabled ? "" : "text-muted line-through"
                }`}
              >
                <span className="text-[11px] text-muted tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {SECTION_TITLES[section.id]}
              </label>
              <label
                className={`flex h-7 cursor-pointer items-center gap-2 rounded-full border border-line px-3 text-[12px] font-medium ${
                  locked ? "cursor-default text-muted" : "text-ink hover:bg-hover"
                }`}
              >
                {locked ? <LockKeyhole size={12} strokeWidth={2} aria-hidden /> : null}
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-current"
                  checked={section.enabled}
                  disabled={locked}
                  onChange={(event) => {
                    onToggle(section.id, event.target.checked);
                  }}
                />
                {locked ? "Required" : "Include"}
              </label>
            </div>
            {section.enabled ? (
              <TextArea
                id={inputId}
                className="mt-3 min-h-24 bg-surface font-mono text-[12.5px]"
                value={section.content}
                maxLength={6000}
                onChange={(event) => {
                  onEdit(section.id, event.target.value);
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
