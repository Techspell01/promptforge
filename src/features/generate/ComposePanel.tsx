"use client";

import { ChevronUp, SlidersHorizontal, WandSparkles } from "lucide-react";
import type { RefObject } from "react";
import { IDEA_MAX_CHARACTERS } from "@/features/idea-input/idea.schema";
import { ARCHETYPE_LABELS, type Settings } from "@/features/settings/settings.schema";
import { Button, Kbd, Notice } from "@/ui/primitives";

const EXAMPLES = [
  "A web app where a family shares a weekly meal plan and gets one combined shopping list.",
  "A CLI that renames photos by the date they were taken, with a dry-run flag.",
  "An API that splits shared expenses between flatmates and settles up monthly.",
];

const BUDGET_NAMES = { lean: "Lean", standard: "Standard", deep: "Deep" } as const;

/** The idea box and its footer: options summary and Generate. The same box later shows the prompt. */
export function ComposePanel({
  idea,
  onIdeaChange,
  settings,
  locked,
  error,
  textareaRef,
  onSubmit,
  onOpenOptions,
}: {
  idea: string;
  onIdeaChange: (idea: string) => void;
  settings: Settings;
  /** True while the idea is melting away; the box is read-only then. */
  locked: boolean;
  error: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  onOpenOptions: () => void;
}) {
  const canSubmit = !locked && idea.trim().length > 0;
  const summary = `${ARCHETYPE_LABELS[settings.archetype]}, ${BUDGET_NAMES[settings.budget]} length, ${settings.securityLevel} security`;

  return (
    <form
      aria-label="Idea and settings"
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <label htmlFor="idea" className="sr-only">
          Idea
        </label>
        <textarea
          ref={textareaRef}
          id="idea"
          maxLength={IDEA_MAX_CHARACTERS}
          readOnly={locked}
          placeholder="What should your agent build? Who uses it, what they do, and what must never happen…"
          value={idea}
          onChange={(event) => {
            onIdeaChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="scrollbar-quiet min-h-0 w-full flex-1 resize-none bg-transparent px-4 py-4 text-base leading-7 text-ink placeholder:text-muted focus-visible:outline-none md:px-5 md:text-[15px]"
        />
        {idea.length === 0 && !locked ? (
          <div className="flex flex-col gap-2 px-4 pb-4 md:px-5">
            <span className="text-[12px] font-medium text-muted">Try one</span>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    onIdeaChange(example);
                    textareaRef.current?.focus();
                  }}
                  className="truncate rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-[13px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 border-t border-line bg-card px-3 py-3 md:px-5">
        {error ? <Notice role="alert">{error}</Notice> : null}
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`Options: ${summary}`}
            disabled={locked}
            onClick={onOpenOptions}
            className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line-strong bg-surface px-3.5 text-left transition-colors duration-150 hover:border-control disabled:opacity-45"
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
              <span className="font-medium text-ink">{ARCHETYPE_LABELS[settings.archetype]}</span>
              {" · "}
              {BUDGET_NAMES[settings.budget]}
              {settings.securityLevel === "paranoid" ? " · Paranoid" : ""}
            </span>
            <ChevronUp size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
          </button>
          <Button variant="primary" size="lg" type="submit" disabled={!canSubmit} className="px-5">
            <WandSparkles size={16} strokeWidth={1.75} aria-hidden />
            Generate
          </Button>
        </div>
        <span className="hidden items-center justify-between gap-1.5 text-[12px] text-muted md:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
            to generate
          </span>
          <span className="font-mono text-[11px] tabular-nums">
            {idea.length}/{IDEA_MAX_CHARACTERS}
          </span>
        </span>
      </div>
    </form>
  );
}
