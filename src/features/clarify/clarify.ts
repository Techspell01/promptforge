import type { Settings } from "@/features/settings/settings.schema";
import {
  CLARIFY_TOPICS,
  MAX_QUESTIONS,
  QUESTIONS,
  TOPIC_SIGNALS,
  type ClarifyAnswers,
  type ClarifyQuestion,
  type ClarifyTopic,
} from "./taxonomy";

/**
 * Deterministic on purpose: a question is only asked when the idea implies an
 * architecture-changing topic and neither the idea, the stack nor a prior answer settles it.
 */
export function unresolvedTopics(
  idea: string,
  settings: Settings,
  answers: ClarifyAnswers = {},
): ClarifyTopic[] {
  const text = `${idea}\n${settings.stack}`;
  return CLARIFY_TOPICS.filter((topic) => {
    if (answers[topic] !== undefined) return false;
    const signals = TOPIC_SIGNALS[topic];
    const implied = signals.impliedBy?.(settings.archetype, settings.platform) ?? false;
    const relevant = implied || signals.relevant.test(text);
    return relevant && !signals.resolved.test(text);
  });
}

export function clarifyingQuestions(
  idea: string,
  settings: Settings,
  answers: ClarifyAnswers = {},
): ClarifyQuestion[] {
  return unresolvedTopics(idea, settings, answers)
    .slice(0, MAX_QUESTIONS)
    .map((topic) => QUESTIONS[topic]);
}
