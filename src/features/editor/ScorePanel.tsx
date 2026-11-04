"use client";

import { ChevronDown, Scissors } from "lucide-react";
import type { ReactNode } from "react";
import type { ScoreResult } from "@/features/score/scorer";
import type { Removal } from "@/features/tokens/pruner";

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:gap-3 sm:p-4">
      <span className="truncate text-[12px] font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

export function BudgetMeter({
  tokenCount,
  budget,
  pending,
}: {
  tokenCount: number;
  budget: { min: number; max: number };
  pending: boolean;
}) {
  const ratio = Math.min(1, tokenCount / budget.max);
  const over = tokenCount > budget.max;
  // Where the floor sits on the bar, so "in range" is visible at a glance.
  const floor = (budget.min / budget.max) * 100;
  return (
    <StatTile label={pending ? "Tokens · counting" : "Tokens"}>
      <div className="flex items-baseline gap-1.5">
        <span
          data-testid="token-count"
          className="text-[22px] font-semibold leading-none sm:text-[28px] tracking-[-0.03em] tabular-nums"
        >
          {tokenCount}
        </span>
        <span className="hidden font-mono text-[11px] text-muted tabular-nums sm:inline">
          / {budget.min}–{budget.max}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-skeleton" aria-hidden>
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-150"
          style={{ width: `${ratio * 100}%` }}
        />
        <span className="absolute inset-y-0 w-px bg-muted" style={{ left: `${floor}%` }} />
      </div>
      {over ? (
        <p className="text-[12px] leading-5">
          Over by {tokenCount - budget.max}. Turn off or shorten sections.
        </p>
      ) : (
        <p className="hidden text-[12px] leading-5 text-muted sm:block">o200k tokenizer</p>
      )}
    </StatTile>
  );
}

/** A ring drawn in ink: the arc is the score, the track is a grey. */
function ScoreRing({ score }: { score: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="-rotate-90">
      <circle cx="20" cy="20" r={radius} fill="none" stroke="var(--skeleton)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
        className="transition-[stroke-dashoffset] duration-150"
      />
    </svg>
  );
}

export function ScoreTile({ score }: { score: number }) {
  return (
    <StatTile label="Quality">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-baseline gap-1">
          <span className="text-[22px] font-semibold leading-none sm:text-[28px] tracking-[-0.03em] tabular-nums">
            {score}
          </span>
          <span className="font-mono text-[11px] text-muted">/100</span>
        </span>
        <span className="hidden sm:block">
          <ScoreRing score={score} />
        </span>
      </div>
      <p className="hidden text-[12px] leading-5 text-muted sm:block">
        {score >= 90 ? "Ready to paste" : score >= 70 ? "Good, a few gaps" : "Needs detail"}
      </p>
    </StatTile>
  );
}

export function SectionsTile({ enabled, total }: { enabled: number; total: number }) {
  return (
    <StatTile label="Sections">
      <span className="flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none sm:text-[28px] tracking-[-0.03em] tabular-nums">
          {enabled}
        </span>
        <span className="font-mono text-[11px] text-muted">/{total}</span>
      </span>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${index < enabled ? "bg-ink" : "bg-skeleton"}`}
          />
        ))}
      </div>
      <p className="hidden text-[12px] leading-5 text-muted sm:block">Security and acceptance always stay</p>
    </StatTile>
  );
}

const DISCLOSURE =
  "group rounded-xl border border-line bg-card transition-colors duration-150 open:bg-surface [&[open]_.chevron]:rotate-180";

export function ScorePanel({ score }: { score: ScoreResult }) {
  if (score.reasons.length === 0) return null;
  return (
    <details className={DISCLOSURE}>
      <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3.5 hover:bg-hover">
        <span className="text-sm font-medium">Why it scored {score.score}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="chevron text-muted transition-transform duration-150"
        />
      </summary>
      <ul className="flex flex-col gap-3 px-4 pb-4 pt-1">
        {score.reasons.map((reason) => (
          <li key={reason.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="font-medium">{reason.label}</span>
              <span className="font-mono text-[11px] text-muted tabular-nums">
                {reason.points}/{reason.maxPoints}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-skeleton" aria-hidden>
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${reason.maxPoints ? (reason.points / reason.maxPoints) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[13px] leading-5 text-muted">{reason.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function RemovedList({ removed }: { removed: readonly Removal[] }) {
  if (removed.length === 0) return null;
  return (
    <details className={DISCLOSURE}>
      <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3.5 hover:bg-hover">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Scissors size={15} strokeWidth={1.75} aria-hidden className="text-muted" />
          What we removed to fit ({removed.length})
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="chevron text-muted transition-transform duration-150"
        />
      </summary>
      <ol className="flex flex-col gap-4 px-4 pb-4 pt-1">
        {removed.map((removal) => (
          <li key={removal.step} className="text-sm">
            <p className="flex items-baseline justify-between gap-4 font-medium">
              {removal.description}
              <span className="shrink-0 font-mono text-[11px] text-muted tabular-nums">
                −{removal.tokensSaved}
              </span>
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-card p-3 font-mono text-[12px] leading-5 text-muted line-through">
              {removal.removedText}
            </pre>
          </li>
        ))}
      </ol>
    </details>
  );
}
