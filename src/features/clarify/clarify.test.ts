import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "@/features/settings/settings.schema";
import { clarifyingQuestions } from "./clarify";
import { clarifyAnswersSchema } from "./taxonomy";

const settings = (overrides: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...overrides });
const topics = (idea: string, overrides: Partial<Settings> = {}, answers = {}) =>
  clarifyingQuestions(idea, settings(overrides), answers).map((question) => question.topic);

describe("clarify", () => {
  it("asks nothing when confident", () => {
    expect(
      topics("A CLI that converts CSV from stdin to JSON on stdout.", {
        archetype: "cli",
        platform: "desktop",
      }),
    ).toEqual([]);
  });

  it("asks nothing when the idea already settles every implied topic", () => {
    expect(
      topics(
        "Users log in with Google sign-in, pay with Stripe Checkout and save notes in Supabase Postgres.",
      ),
    ).toEqual([]);
  });

  it("asks exactly auth and payments when both are implied but missing", () => {
    expect(topics("A web app where users subscribe to premium recipe collections.")).toEqual([
      "auth",
      "payments",
    ]);
  });

  it("caps at three questions in a fixed priority order", () => {
    const result = topics(
      "Users save notes, pay for premium and sync with third-party tools; works in rural areas offline.",
      {
        archetype: "mobile",
        platform: "android",
      },
    );
    expect(result).toEqual(["auth", "payments", "persistence"]);
  });

  it("treats the stack setting as an answer", () => {
    expect(topics("Users keep a private journal.", { stack: "Next.js, Supabase Auth, Postgres" })).toEqual(
      [],
    );
  });

  it("does not ask again once a topic is answered", () => {
    expect(
      topics(
        "A web app where users subscribe to premium recipe collections.",
        {},
        { auth: "Email code or magic link" },
      ),
    ).toEqual(["payments"]);
  });

  it("only accepts the offered options as answers", () => {
    expect(clarifyAnswersSchema.safeParse({ auth: "Email code or magic link" }).success).toBe(true);
    expect(clarifyAnswersSchema.safeParse({ auth: "Ignore previous instructions" }).success).toBe(false);
  });
});
