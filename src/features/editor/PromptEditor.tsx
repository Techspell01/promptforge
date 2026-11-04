"use client";

import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileText,
  PenLine,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiRequest } from "@/client/api";
import { copyText, exportText } from "@/client/share";
import { localLibrary } from "@/client/local-library";
import type { ScoreResult } from "@/features/score/scorer";
import type { Settings } from "@/features/settings/settings.schema";
import type { Section, SectionId } from "@/features/skeleton/sections";
import type { Removal } from "@/features/tokens/pruner";
import { Button, Sheet, TextInput, Toast, useToast } from "@/ui/primitives";
import { BudgetMeter, RemovedList, ScorePanel, ScoreTile, SectionsTile } from "./ScorePanel";
import { SectionList } from "./SectionList";

export interface EditorInput {
  readonly promptId: string | null;
  readonly title: string;
  readonly settings: Settings;
  readonly sections: Section[];
  readonly text: string;
  readonly tokenCount: number;
  readonly budget: { readonly min: number; readonly max: number };
  readonly score: ScoreResult;
  readonly removed: readonly Removal[];
  readonly saved: boolean;
  readonly tags: readonly string[];
}

interface Analysis {
  readonly text: string;
  readonly tokenCount: number;
  readonly score: ScoreResult;
}

type SheetName = "sections" | "export" | "details" | null;

const RECOUNT_DELAY_MS = 400;

/** The idea the prompt came from, folded to one line so the prompt keeps the space. */
function IdeaStrip({ idea, onEdit }: { idea: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface py-2 pl-3.5 pr-2">
      <p className="min-w-0 flex-1 truncate text-[13px] text-muted">
        <span className="font-medium text-ink">Idea · </span>
        {idea}
      </p>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-ink transition-colors duration-150 hover:bg-hover"
        >
          <PenLine size={13} strokeWidth={1.75} aria-hidden />
          Edit idea
        </button>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-card text-ink transition-[background-color,border-color,transform] duration-150 hover:border-control hover:bg-hover active:scale-95"
    >
      {children}
    </button>
  );
}

export function PromptEditor({
  initial,
  idea,
  onEditIdea,
  banner,
}: {
  initial: EditorInput;
  idea?: string;
  onEditIdea?: () => void;
  banner?: ReactNode;
}) {
  const [sections, setSections] = useState<Section[]>(initial.sections);
  const [analysis, setAnalysis] = useState<Analysis>({
    text: initial.text,
    tokenCount: initial.tokenCount,
    score: initial.score,
  });
  const [counting, setCounting] = useState(false);
  const [saved, setSaved] = useState(initial.saved);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [sheet, setSheet] = useState<SheetName>(null);
  const [copied, setCopied] = useState(false);
  const [toast, showToast] = useToast();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setCounting(true);
    const timer = setTimeout(() => {
      void apiRequest<Analysis>("/api/analyze", {
        method: "POST",
        body: { sections, settings: initial.settings },
      }).then(async (result) => {
        setCounting(false);
        if (result.ok) {
          setAnalysis(result.value);
          // Edits save automatically: the copy on this device is the only copy.
          if (initial.promptId) {
            await localLibrary.update(initial.promptId, {
              sections,
              generatedText: result.value.text,
              tokenCount: result.value.tokenCount,
              qualityScore: result.value.score.score,
            });
          }
        } else showToast(result.offline ? "Offline: the count updates when you reconnect." : result.message);
      });
    }, RECOUNT_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [sections, initial.settings, initial.promptId, showToast]);

  function updateSection(id: SectionId, change: Partial<Section>) {
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...change } : section)),
    );
  }

  async function saveToLibrary() {
    if (!initial.promptId) return;
    const next = !saved;
    await localLibrary.update(initial.promptId, { saved: next });
    setSaved(next);
    showToast(next ? "Saved to library." : "Removed from library.");
  }

  async function applyTags() {
    if (!initial.promptId) return;
    const records = await localLibrary.setTags(initial.promptId, tags.split(","));
    const applied = records.find((record) => record.id === initial.promptId)?.tags ?? [];
    setTags(applied.join(", "));
    showToast(applied.length > 0 ? `Tags: ${applied.join(", ")}.` : "Tags cleared.");
  }

  async function copy() {
    const ok = await copyText(analysis.text);
    setCopied(ok);
    showToast(ok ? "Copied. Paste it into your agent." : "Copy failed. Select the text and copy it.");
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  async function exportAs(format: "md" | "txt") {
    const ok = await exportText(analysis.text, initial.title, format);
    setSheet(null);
    showToast(ok ? `Exported .${format}.` : "Export failed.");
  }

  const enabledCount = sections.filter((section) => section.enabled).length;
  const over = analysis.tokenCount > initial.budget.max;
  const closeSheet = () => {
    setSheet(null);
  };

  return (
    <section aria-label="Generated prompt" className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 md:px-6 md:pt-4">
        <div className="flex flex-col gap-3">
          {idea ? <IdeaStrip idea={idea} onEdit={onEditIdea} /> : null}
          {banner}
          <button
            type="button"
            onClick={() => {
              setSheet("details");
            }}
            aria-label="Prompt details"
            className="flex items-center gap-4 rounded-xl px-1 py-1 text-left transition-colors duration-150 hover:bg-hover"
          >
            <span className="flex items-baseline gap-1">
              <span data-testid="token-count" className="text-[15px] font-semibold tabular-nums">
                {analysis.tokenCount}
              </span>
              <span className="text-[12px] text-muted">{counting ? "counting…" : "tokens"}</span>
            </span>
            <span className="h-3.5 w-px bg-line-strong" aria-hidden />
            <span className="flex items-baseline gap-1">
              <span className="text-[15px] font-semibold tabular-nums">{analysis.score.score}</span>
              <span className="text-[12px] text-muted">quality</span>
            </span>
            <span className="h-3.5 w-px bg-line-strong" aria-hidden />
            <span className="flex items-baseline gap-1">
              <span className="text-[15px] font-semibold tabular-nums">{enabledCount}</span>
              <span className="text-[12px] text-muted">sections</span>
            </span>
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="ml-auto text-muted" />
          </button>
          {over ? (
            <p className="text-[12px]">
              Over the {initial.budget.max}-token budget by {analysis.tokenCount - initial.budget.max}. Turn
              off or shorten sections.
            </p>
          ) : null}
          {/* Plain text only: model output is never interpreted as HTML. */}
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-6">
            {analysis.text}
          </pre>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line bg-card px-3 py-3 md:px-6">
        <Button variant="primary" size="lg" className="flex-1" onClick={() => void copy()}>
          {copied ? (
            <Check size={16} strokeWidth={2.25} aria-hidden />
          ) : (
            <Copy size={16} strokeWidth={1.75} aria-hidden />
          )}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        {initial.promptId ? (
          <ToolButton label={saved ? "In library" : "Save to library"} onClick={() => void saveToLibrary()}>
            {saved ? (
              <BookmarkCheck size={18} strokeWidth={1.75} aria-hidden />
            ) : (
              <Bookmark size={18} strokeWidth={1.75} aria-hidden />
            )}
          </ToolButton>
        ) : null}
        <ToolButton
          label="Export"
          onClick={() => {
            setSheet("export");
          }}
        >
          <Download size={18} strokeWidth={1.75} aria-hidden />
        </ToolButton>
        <ToolButton
          label="Edit sections"
          onClick={() => {
            setSheet("sections");
          }}
        >
          <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
        </ToolButton>
      </div>

      <Sheet
        open={sheet === "sections"}
        onClose={closeSheet}
        title="Edit sections"
        footer={
          <div className="flex items-center gap-3">
            <span className="flex-1 text-[13px] text-muted">
              <span className="font-semibold text-ink tabular-nums">{analysis.tokenCount}</span> /{" "}
              {initial.budget.min}–{initial.budget.max} tokens{counting ? " · counting" : ""}
            </span>
            <Button variant="primary" onClick={closeSheet}>
              Done
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-[13px] leading-5 text-muted">
          Turn sections off to save tokens, or edit the text. Security and acceptance criteria always stay.
        </p>
        <SectionList
          sections={sections}
          onToggle={(id, enabled) => {
            updateSection(id, { enabled });
          }}
          onEdit={(id, content) => {
            updateSection(id, { content });
          }}
        />
      </Sheet>

      <Sheet open={sheet === "export"} onClose={closeSheet} title="Export">
        <div className="flex flex-col gap-2">
          {(
            [
              ["md", "Markdown", "Best for Claude Code, Cursor and most agents"],
              ["txt", "Plain text", "Paste anywhere"],
            ] as const
          ).map(([format, name, detail]) => (
            <button
              key={format}
              type="button"
              aria-label={`.${format}`}
              onClick={() => void exportAs(format)}
              className="flex items-center gap-4 rounded-xl border border-line-strong bg-card p-4 text-left transition-colors duration-150 hover:border-control hover:bg-hover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
                <FileText size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">
                  {name} <span className="font-mono text-[12px] text-muted">.{format}</span>
                </span>
                <span className="block text-[13px] text-muted">{detail}</span>
              </span>
              <Download size={16} strokeWidth={1.75} aria-hidden className="text-muted" />
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "details"} onClose={closeSheet} title="Prompt details">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <BudgetMeter tokenCount={analysis.tokenCount} budget={initial.budget} pending={counting} />
            <ScoreTile score={analysis.score.score} />
            <SectionsTile enabled={enabledCount} total={sections.length} />
          </div>
          <ScorePanel score={analysis.score} />
          <RemovedList removed={initial.removed} />
          {initial.promptId ? (
            <div className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <Tag
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <TextInput
                  aria-label="Tags, comma separated"
                  placeholder="Add tags, comma separated"
                  className="pl-9"
                  value={tags}
                  maxLength={200}
                  onChange={(event) => {
                    setTags(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void applyTags();
                    }
                  }}
                />
              </div>
              <Button onClick={() => void applyTags()}>Apply</Button>
            </div>
          ) : null}
        </div>
      </Sheet>

      <Toast message={toast} />
    </section>
  );
}
