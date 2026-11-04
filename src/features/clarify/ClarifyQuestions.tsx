"use client";

import { Check } from "lucide-react";
import type { ClarifyAnswers, ClarifyQuestion } from "./taxonomy";

interface ClarifyQuestionsProps {
  readonly questions: readonly ClarifyQuestion[];
  readonly answers: ClarifyAnswers;
  readonly onAnswer: (answers: ClarifyAnswers) => void;
}

/** Fixed options only. Skipping a question is allowed; it then appears under OPEN QUESTIONS. */
export function ClarifyQuestions({ questions, answers, onAnswer }: ClarifyQuestionsProps) {
  const answered = questions.filter((question) => answers[question.topic] !== undefined).length;
  return (
    <section aria-label="Clarifying questions" className="rise-in flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">A few quick questions</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            These change the architecture. Skip any you are unsure of; they become open questions.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted tabular-nums">
          {answered}/{questions.length}
        </span>
      </div>
      {questions.map((question, index) => (
        <fieldset key={question.topic} className="flex flex-col gap-3 border-t border-line pt-5">
          <legend className="contents">
            <span className="flex items-baseline gap-3 text-sm font-medium">
              <span className="font-mono text-[11px] text-muted tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              {question.question}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => {
              const selected = answers[question.topic] === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    const others = Object.fromEntries(
                      Object.entries(answers).filter(([topic]) => topic !== question.topic),
                    ) as ClarifyAnswers;
                    onAnswer(selected ? others : { ...others, [question.topic]: option });
                  }}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-[background-color,border-color,color] duration-150 ${
                    selected
                      ? "border-inverse bg-inverse text-inverse-ink shadow-pill"
                      : "border-line-strong bg-card hover:border-control hover:bg-hover"
                  }`}
                >
                  {selected ? <Check size={14} strokeWidth={2.25} aria-hidden /> : null}
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </section>
  );
}
