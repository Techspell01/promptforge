"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadRecords, localLibrary } from "@/client/local-library";
import { ARCHETYPE_LABELS } from "@/features/settings/settings.schema";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CopyPlus,
  History,
  Search,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Notice,
  SkeletonBlock,
  TextInput,
} from "@/ui/primitives";
import { allTags, queryRecords } from "./library-logic";
import type { PromptRecord } from "./library.schema";

type View = "library" | "history";

const COPY: Record<View, { title: string; subtitle: string; empty: string; emptyDetail: string }> = {
  library: {
    title: "Library",
    subtitle: "Prompts you chose to keep. They live on this device and open offline.",
    empty: "Nothing saved yet",
    emptyDetail:
      "Generate a prompt and choose Save to library. Saved prompts stay on this device and work offline.",
  },
  history: {
    title: "History",
    subtitle: "Your last 50 generations on this device, newest first.",
    empty: "No generations yet",
    emptyDetail: "Your last 50 generations on this device appear here.",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function RowActions({ prompt, onChanged }: { prompt: PromptRecord; onChanged: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/prompt/?id=${prompt.id}`} className={`${buttonClasses("primary", "sm")} no-underline`}>
        Open
        <ArrowRight size={14} strokeWidth={2} aria-hidden />
      </Link>
      <Button
        size="sm"
        onClick={() => {
          void localLibrary.duplicate(prompt.id).then(() => {
            onChanged("Duplicated.");
          });
        }}
      >
        <CopyPlus size={14} strokeWidth={1.75} aria-hidden />
        Duplicate
      </Button>
      {confirming ? (
        <>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              void localLibrary.remove(prompt.id).then(() => {
                onChanged("Deleted.");
              });
            }}
          >
            Confirm delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setConfirming(false);
            }}
          >
            Keep
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Delete ${prompt.title}`}
          onClick={() => {
            setConfirming(true);
          }}
        >
          <Trash2 size={14} strokeWidth={1.75} aria-hidden />
        </Button>
      )}
    </div>
  );
}

export function PromptList({ view }: { view: View }) {
  const [records, setRecords] = useState<PromptRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setRecords(await loadRecords());
  }, []);

  useEffect(() => {
    void loadRecords().then(setRecords);
  }, []);

  const copy = COPY[view];
  const visible = records ? queryRecords(records, { view, q: query, tag }) : null;
  const tags = records && view === "library" ? allTags(records) : [];

  return (
    <section className="flex flex-col gap-6 pb-6 md:gap-8">
      <div className="rise-in flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge>
            {view === "library" ? (
              <Bookmark size={12} strokeWidth={2} aria-hidden />
            ) : (
              <History size={12} strokeWidth={2} aria-hidden />
            )}
            {visible ? `${visible.length} ${visible.length === 1 ? "prompt" : "prompts"}` : "Loading"}
          </Badge>
          <h1 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.03em] md:mt-4 md:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-[56ch] text-[14px] leading-6 text-muted md:mt-3 md:text-[15px] md:leading-7">
            {copy.subtitle}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search
            size={15}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <TextInput
            aria-label={`Search ${copy.title.toLowerCase()}`}
            placeholder="Search title or idea"
            className="pl-9"
            maxLength={100}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </div>
      </div>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Filter by tag">
          {tags.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tag === name}
              onClick={() => {
                setTag(tag === name ? null : name);
              }}
              className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-[background-color,border-color] duration-150 ${
                tag === name
                  ? "border-inverse bg-inverse text-inverse-ink shadow-pill"
                  : "border-line-strong bg-card hover:border-control hover:bg-hover"
              }`}
            >
              <span aria-hidden className="font-mono text-[11px] opacity-70">
                #
              </span>
              {name}
            </button>
          ))}
        </div>
      ) : null}
      {notice ? <Notice>{notice}</Notice> : null}
      {visible === null ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
          <SkeletonBlock className="h-44 w-full rounded-2xl" />
          <SkeletonBlock className="h-44 w-full rounded-2xl" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              view === "library" ? (
                <Bookmark size={20} strokeWidth={1.75} aria-hidden />
              ) : (
                <History size={20} strokeWidth={1.75} aria-hidden />
              )
            }
            title={copy.empty}
            detail={copy.emptyDetail}
          >
            <Link href="/" className={`${buttonClasses("primary", "md")} no-underline`}>
              <WandSparkles size={15} strokeWidth={1.75} aria-hidden />
              Generate a prompt
            </Link>
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((prompt) => (
            <li
              key={prompt.id}
              className="rise-in flex flex-col justify-between gap-5 rounded-2xl border border-line bg-card p-5 shadow-soft transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-lift"
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-[15px] font-semibold leading-6 tracking-tight">
                    {prompt.title}
                  </p>
                  {prompt.saved && view === "history" ? (
                    <BookmarkCheck
                      size={16}
                      strokeWidth={1.75}
                      aria-label="Saved"
                      className="mt-1 shrink-0"
                    />
                  ) : null}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-muted">{prompt.rawIdea}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge>{ARCHETYPE_LABELS[prompt.archetype]}</Badge>
                  <Badge>
                    <span className="tabular-nums">{prompt.tokenCount}</span> tokens
                  </Badge>
                  <Badge>
                    Score <span className="tabular-nums">{prompt.qualityScore}</span>
                  </Badge>
                  {prompt.tags.map((name) => (
                    <Badge key={name}>#{name}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <span className="font-mono text-[11px] text-muted">{formatDate(prompt.createdAt)}</span>
                <RowActions
                  prompt={prompt}
                  onChanged={(message) => {
                    setNotice(message);
                    void reload();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
