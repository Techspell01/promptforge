"use client";

import { ArrowLeft, Plus, RotateCcw, Square, WandSparkles } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiRequest } from "@/client/api";
import { ClarifyQuestions } from "@/features/clarify/ClarifyQuestions";
import type { ClarifyAnswers, ClarifyQuestion } from "@/features/clarify/taxonomy";
import { PromptEditor } from "@/features/editor/PromptEditor";
import { MeltFilter, SmokeCanvas, useForge } from "@/features/forge/useForge";
import { ideaSchema } from "@/features/idea-input/idea.schema";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "@/features/settings/settings.schema";
import { Badge, Button, Card, Notice, ProgressLine, Sheet } from "@/ui/primitives";
import { ComposePanel } from "./ComposePanel";
import { useGeneration } from "./useGeneration";

/** compose: typing. dissolving: the idea melts while the server reads it. clarify: questions. forge: model at work, then the result. */
type View = "compose" | "dissolving" | "clarify" | "forge";

export function GeneratorView() {
  const [idea, setIdea] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<readonly ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<ClarifyAnswers>({});
  const [inputError, setInputError] = useState<string | null>(null);
  const [view, setView] = useState<View>("compose");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { state, start, cancel, reset } = useGeneration();
  const { stageRef, canvasRef, turbulenceRef, displacementRef, puff, melt, setAmbient } = useForge();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const returning = useRef(false);

  const streaming = view === "forge" && state.phase === "streaming";
  const hasPreview = streaming && state.preview.length > 0;
  const resultId = view === "forge" && state.phase === "done" ? state.localId : null;

  // Smoke keeps drifting while the server reads the idea and while the model writes.
  useEffect(() => {
    setAmbient(view === "dissolving" ? 0.7 : streaming ? (hasPreview ? 0.3 : 1) : 0);
  }, [view, streaming, hasPreview, setAmbient]);

  // The first streamed words condense out of the smoke.
  useLayoutEffect(() => {
    if (hasPreview) void melt(previewRef.current, "in", 900);
  }, [hasPreview, melt]);

  // The finished prompt condenses in the same box.
  useLayoutEffect(() => {
    if (!resultId) return;
    puff(resultRef.current, 50, 0.6);
    void melt(resultRef.current, "in", 1000);
  }, [resultId, puff, melt]);

  // Coming back to the idea: it condenses back where it was.
  useLayoutEffect(() => {
    if (view !== "compose" || !returning.current) return;
    returning.current = false;
    void melt(textareaRef.current, "in", 800);
  }, [view, melt]);

  function validInput(): { idea: string; settings: Settings } | null {
    const parsedIdea = ideaSchema.safeParse(idea);
    const parsedSettings = settingsSchema.safeParse({ ...settings, stack: settings.stack.trim() });
    if (!parsedIdea.success) {
      setInputError(parsedIdea.error.issues[0]?.message ?? "Check the idea.");
      return null;
    }
    if (!parsedSettings.success) {
      setInputError(parsedSettings.error.issues[0]?.message ?? "Check the settings.");
      return null;
    }
    setInputError(null);
    return { idea: parsedIdea.data, settings: parsedSettings.data };
  }

  function backToCompose() {
    returning.current = true;
    setView("compose");
  }

  async function submit() {
    const input = validInput();
    if (!input) return;
    reset();
    setView("dissolving");
    puff(textareaRef.current, 110);
    const [result] = await Promise.all([
      apiRequest<{ questions: ClarifyQuestion[] }>("/api/clarify", {
        method: "POST",
        body: { ...input, answers: {} },
      }),
      melt(textareaRef.current, "out", 1100),
    ]);
    if (!result.ok) {
      setInputError(result.message);
      backToCompose();
      return;
    }
    setAnswers({});
    setQuestions(result.value.questions);
    if (result.value.questions.length === 0) {
      setView("forge");
      void start({ ...input, answers: {} });
    } else setView("clarify");
  }

  function generateWithAnswers() {
    const input = validInput();
    if (!input) return;
    setQuestions([]);
    setView("forge");
    void start({ ...input, answers });
  }

  async function leaveResult(clearIdea: boolean) {
    puff(resultRef.current, 70, 0.8);
    await melt(resultRef.current, "out", 650);
    reset();
    if (clearIdea) setIdea("");
    backToCompose();
  }

  const title =
    view === "compose"
      ? "Describe the build"
      : view === "dissolving"
        ? "Reading your idea"
        : view === "clarify"
          ? "Almost there"
          : state.phase === "done"
            ? "Build prompt"
            : state.phase === "failed"
              ? "That didn't work"
              : "Forging your prompt";

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4">
      <p className="hidden text-[15px] text-muted md:block">
        Turn a rough idea into a build prompt your coding agent can actually ship.
      </p>
      <MeltFilter turbulenceRef={turbulenceRef} displacementRef={displacementRef} />

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {view === "clarify" ? (
              <button
                type="button"
                aria-label="Back to the idea"
                onClick={backToCompose}
                className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink"
              >
                <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            <h1 key={title} className="rise-in truncate text-[15px] font-semibold tracking-tight">
              {title}
            </h1>
            {resultId && state.phase === "done" ? (
              <Badge>{state.result.source === "skeleton" ? "Template" : "Ready"}</Badge>
            ) : null}
          </div>
          {streaming ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                cancel();
                backToCompose();
              }}
            >
              <Square size={11} strokeWidth={2.5} aria-hidden />
              Cancel
            </Button>
          ) : null}
          {resultId ? (
            <Button size="sm" variant="ghost" onClick={() => void leaveResult(true)}>
              <Plus size={15} strokeWidth={2} aria-hidden />
              New
            </Button>
          ) : null}
        </div>

        <div ref={stageRef} className="relative flex min-h-0 flex-1 flex-col">
          <SmokeCanvas canvasRef={canvasRef} />

          {view === "compose" || view === "dissolving" ? (
            <ComposePanel
              idea={idea}
              onIdeaChange={setIdea}
              settings={settings}
              locked={view === "dissolving"}
              error={inputError}
              textareaRef={textareaRef}
              onSubmit={() => void submit()}
              onOpenOptions={() => {
                setOptionsOpen(true);
              }}
            />
          ) : null}

          {view === "clarify" ? (
            <>
              <div className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5">
                <ClarifyQuestions questions={questions} answers={answers} onAnswer={setAnswers} />
              </div>
              <div className="flex shrink-0 border-t border-line px-3 py-3 md:px-5">
                <Button variant="primary" size="lg" className="flex-1" onClick={generateWithAnswers}>
                  <WandSparkles size={16} strokeWidth={1.75} aria-hidden />
                  Generate prompt
                </Button>
              </div>
            </>
          ) : null}

          {streaming ? (
            <>
              {hasPreview ? (
                <div
                  ref={previewRef}
                  aria-busy="true"
                  aria-live="polite"
                  className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6"
                >
                  <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-6">
                    {state.preview}
                  </pre>
                </div>
              ) : (
                <div
                  aria-busy="true"
                  aria-live="polite"
                  className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
                >
                  <p className="breathe text-[19px] font-semibold tracking-tight">
                    Shaping it from the smoke
                  </p>
                  <p className="text-[13px] text-muted">{state.stage}…</p>
                </div>
              )}
              <div className="shrink-0 px-4 pb-4 md:px-6">
                <ProgressLine label={state.stage} />
              </div>
            </>
          ) : null}

          {view === "forge" && state.phase === "failed" ? (
            <div className="rise-in flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <p className="max-w-[40ch] text-sm leading-6 text-muted">{state.message}</p>
              <div className="flex gap-2">
                <Button onClick={backToCompose}>
                  <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
                  Edit idea
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const input = validInput();
                    if (input) void start({ ...input, answers });
                  }}
                >
                  <RotateCcw size={15} strokeWidth={1.75} aria-hidden />
                  Try again
                </Button>
              </div>
            </div>
          ) : null}

          {resultId && state.phase === "done" ? (
            <div ref={resultRef} className="flex min-h-0 flex-1 flex-col">
              <PromptEditor
                key={state.localId}
                idea={state.request.idea}
                onEditIdea={() => void leaveResult(false)}
                banner={
                  state.result.source === "skeleton" ? (
                    <Notice>Models were busy, so this is the built-in template.</Notice>
                  ) : null
                }
                initial={{
                  ...state.result,
                  promptId: state.localId,
                  settings: state.request.settings,
                  saved: false,
                  tags: [],
                }}
              />
            </div>
          ) : null}
        </div>
      </Card>

      <Sheet
        open={optionsOpen}
        onClose={() => {
          setOptionsOpen(false);
        }}
        title="Options"
        footer={
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              setOptionsOpen(false);
            }}
          >
            Done
          </Button>
        }
      >
        <SettingsPanel settings={settings} onChange={setSettings} />
      </Sheet>
    </div>
  );
}
