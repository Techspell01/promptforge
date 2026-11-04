"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { localLibrary } from "@/client/local-library";
import { PromptEditor } from "@/features/editor/PromptEditor";
import { BUDGET_RANGES } from "@/features/settings/settings.schema";
import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";
import { ARCHETYPE_LABELS } from "@/features/settings/settings.schema";
import { Badge, buttonClasses, Card, EmptyState, SkeletonBlock } from "@/ui/primitives";
import type { PromptRecord } from "./library.schema";

type LoadState =
  { readonly status: "loading" } | { readonly status: "ready"; readonly prompt: PromptRecord | undefined };

export function PromptDetail() {
  const id = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    void localLibrary.find(id).then((prompt) => {
      setState({ status: "ready", prompt });
    });
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-busy="true">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-10 w-2/3" />
        <SkeletonBlock className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  const { prompt } = state;
  if (!prompt) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon={<FileQuestion size={20} strokeWidth={1.75} aria-hidden />}
          title="Prompt not found"
          detail="It may have been deleted, or it was saved on another device."
        >
          <Link href="/library/" className={`${buttonClasses("primary", "md")} no-underline`}>
            Back to library
          </Link>
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <Card className="rise-in flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2 md:px-3">
          <Link
            href={prompt.saved ? "/library/" : "/history/"}
            aria-label={prompt.saved ? "Back to library" : "Back to history"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted no-underline hover:bg-hover hover:text-ink"
          >
            <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">{prompt.title}</h1>
          <Badge className="mr-2 hidden sm:inline-flex">{ARCHETYPE_LABELS[prompt.archetype]}</Badge>
        </div>
        <PromptEditor
          idea={prompt.rawIdea}
          initial={{
            promptId: prompt.id,
            title: prompt.title,
            settings: prompt.settings,
            sections: prompt.sections,
            text: prompt.generatedText,
            tokenCount: prompt.tokenCount,
            budget: BUDGET_RANGES[prompt.settings.budget],
            // Only the total is stored; reasons are recomputed on the first edit.
            score: { score: prompt.qualityScore, reasons: [] },
            removed: [],
            saved: prompt.saved,
            tags: prompt.tags,
          }}
        />
      </Card>
    </div>
  );
}
