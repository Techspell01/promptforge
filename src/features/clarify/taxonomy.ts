import { z } from "zod";
import type { Archetype, Platform } from "@/features/settings/settings.schema";

export const CLARIFY_TOPICS = ["auth", "payments", "persistence", "offline", "integrations"] as const;
export type ClarifyTopic = (typeof CLARIFY_TOPICS)[number];

export interface ClarifyQuestion {
  readonly topic: ClarifyTopic;
  readonly question: string;
  readonly options: readonly string[];
}

export const MAX_QUESTIONS = 3;

export const QUESTIONS: Readonly<Record<ClarifyTopic, ClarifyQuestion>> = {
  auth: {
    topic: "auth",
    question: "How do users sign in?",
    options: ["No accounts", "Email code or magic link", "Email and password", "Google or GitHub OAuth"],
  },
  payments: {
    topic: "payments",
    question: "How are payments taken?",
    options: ["No payments in v1", "Stripe Checkout", "Razorpay", "App store billing"],
  },
  persistence: {
    topic: "persistence",
    question: "Where is data stored?",
    options: ["On the device only", "Hosted Postgres", "SQLite file", "No persistence"],
  },
  offline: {
    topic: "offline",
    question: "Must it work offline?",
    options: ["Online only", "Read-only offline", "Full offline with sync"],
  },
  integrations: {
    topic: "integrations",
    question: "Which external service is required in v1?",
    options: ["None in v1", "Google services", "Slack", "Webhooks only"],
  },
};

interface TopicSignals {
  /** The idea implies this topic matters. */
  readonly relevant: RegExp;
  /** The idea already answers it. */
  readonly resolved: RegExp;
  /** Archetypes or platforms that make the topic relevant regardless of wording. */
  readonly impliedBy?: (archetype: Archetype, platform: Platform) => boolean;
}

export const TOPIC_SIGNALS: Readonly<Record<ClarifyTopic, TopicSignals>> = {
  auth: {
    relevant:
      /\b(users?|accounts?|log ?in|sign ?(in|up)|profiles?|members?|admins?|dashboard|private|per[- ]user|my (own )?(notes|data|list))\b/i,
    resolved:
      /\b(no (login|auth|accounts?|sign[- ]?in)|anonymous|without (an )?account|magic link|otp|email (code|link|and password)|password|oauth|sso|passkeys?|google sign[- ]?in|sign in with (google|github|apple)|clerk|auth0|supabase auth|firebase auth|nextauth|auth\.js)\b/i,
  },
  payments: {
    relevant:
      /\b(pay|pays|payments?|paid|subscriptions?|subscribe|checkout|billing|pricing|purchases?|buy|sell|premium|invoices?|donations?|donate|tips?)\b/i,
    resolved:
      /\b(stripe|razorpay|paypal|paddle|lemon ?squeezy|play billing|app store billing|in-app purchases?|no payments?|free only)\b/i,
  },
  persistence: {
    relevant:
      /\b(save|saves|saved|store|stores|history|library|records?|tracks?|tracking|inventory|notes|todos?|bookmarks?|logs?|journal|catalog(ue)?)\b/i,
    resolved:
      /\b(postgres(ql)?|mysql|sqlite|supabase|firebase|firestore|mongo(db)?|dynamo(db)?|redis|local ?storage|indexeddb|in[- ]memory|no (database|persistence|storage)|csv files?|json files?)\b/i,
  },
  offline: {
    relevant: /\b(offline|no internet|poor connectivity|rural|field work|sync)\b/i,
    resolved:
      /\b(offline[- ]first|works? offline|online[- ]only|no offline|always online|requires? (an )?internet)\b/i,
    impliedBy: (archetype, platform) =>
      archetype === "mobile" || platform === "android" || platform === "ios" || platform === "cross_platform",
  },
  integrations: {
    relevant:
      /\b(integrat\w*|third[- ]party|connects? (to|with)|sync(s)? with|plug-?ins?|webhooks?|external (apis?|services?))\b/i,
    resolved:
      /\b(slack|gmail|google (calendar|drive|sheets)|notion|github|stripe|twilio|whatsapp|zapier|shopify|discord|telegram|no integrations?)\b/i,
  },
};

// Answers must be one of the fixed options, so clarify answers can never smuggle free text into the prompt.
export const clarifyAnswersSchema = z
  .partialRecord(z.enum(CLARIFY_TOPICS), z.string().max(80))
  .refine((answers) => Object.keys(answers).length <= MAX_QUESTIONS, "Too many answers.")
  .refine(
    (answers) =>
      Object.entries(answers).every(([topic, answer]) =>
        QUESTIONS[topic as ClarifyTopic].options.includes(answer),
      ),
    "Answer is not one of the offered options.",
  );

export type ClarifyAnswers = z.infer<typeof clarifyAnswersSchema>;
