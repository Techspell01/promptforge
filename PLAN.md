# PromptForge: Phase 1 plan

Status (2026-11-04): built, tested and deployed to Vercel (web). See README.md for the current design; this file is the original phase 1 plan, kept for history.

Changes from this plan, made during the build:

- **No sign-in and no database.** Harinand asked for no sign-in. The library and history live on the device, and rate limits, token caps and the cache are in memory. Supabase, Prisma and @supabase/ssr are all gone.
- **No shadcn CLI components.** Hand-written primitives in `src/ui/primitives.tsx` built on Tailwind tokens. Restyling shadcn's coloured defaults to zero hue would have been more work than writing six small components.
- **Clarify and score use no model.** Both are deterministic, so only the final prompt calls Groq (with Gemini as fallback).

## 1. Confirmed environment (checked 2026-11-04 on this laptop)

| Tool        | Found                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| Node        | 24.22.0                                                                               |
| npm         | 11.19.1                                                                               |
| JDK on PATH | 17.0.18. Capacitor 8 needs 21, so Gradle will use Android Studio's bundled JBR 21.0.9 |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk`, platforms 36 / 36.1, build-tools 36.1.0                 |

## 2. Confirmed package versions (npm registry, 2026-11-04)

Every version is pinned exactly (no `^`), with `save-exact=true` in `.npmrc`.

| Package                       | Pin              | Note                                                                                                                                                                                                                           |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| next / eslint-config-next     | 16.4.5           | needs Node >= 20.9                                                                                                                                                                                                             |
| react / react-dom             | 19.3.1           |                                                                                                                                                                                                                                |
| typescript                    | **6.0.3**        | `latest` is 7.0.2, the native-compiler rewrite. Next 16's TS integration and typescript-eslint support for 7 still have to be checked at scaffold time, so I'm starting on the last 6.x. Upgrading later is a one-line change. |
| tailwindcss                   | 4.3.4            |                                                                                                                                                                                                                                |
| shadcn (CLI)                  | 4.23.0           | the components get copied in and restyled to the monochrome tokens                                                                                                                                                             |
| @supabase/supabase-js         | 2.118.0          |                                                                                                                                                                                                                                |
| @supabase/ssr                 | 0.12.7           |                                                                                                                                                                                                                                |
| prisma / @prisma/client       | **7.10.1**       | npm `latest` points at 8.0.0-rc.30, a release candidate, so I'm skipping it. Prisma 7 needs `prisma.config.ts` and a driver adapter (`@prisma/adapter-pg` 7.10.1).                                                             |
| zod                           | 4.6.7            |                                                                                                                                                                                                                                |
| js-tiktoken                   | 1.0.21           | pure JS, so no WASM on Vercel. Counts use `o200k_base`, which is close to but not identical to every provider's tokenizer, so the UI labels it "o200k estimate".                                                               |
| @capacitor/core, cli, android | 8.6.0            |                                                                                                                                                                                                                                |
| vitest                        | 5.1.0            | unit + integration                                                                                                                                                                                                             |
| @playwright/test              | 1.64.1           | e2e + contrast checks                                                                                                                                                                                                          |
| eslint / prettier             | 10.14.0 / 3.9.10 |                                                                                                                                                                                                                                |
| groq-sdk / @google/genai      | 1.6.0 / 2.32.0   | only if Q1 = Groq + Gemini                                                                                                                                                                                                     |

## 3. Architecture decisions

1. **Skeleton owned by code.** `templates/` builds the 14 section headers in a fixed order from an enum. The model returns JSON (`{ sectionId: content }`), Zod validates it, and code renders it. If the model returns an unknown section id, it gets dropped and logged. The model never picks the order or the names.
2. **Archetype recipes.** One typed file per archetype (web, api, cli, mobile, pipeline, extension). Each declares its section whitelist, security-checklist subset, and placeholder defaults. The default rendering of a recipe is the fallback skeleton (feature 10).
3. **Pruner.** It works on whole sections or bullets, never on characters. It follows the fixed prune order. SECURITY and ACCEPTANCE CRITERIA are typed as non-prunable. It returns `{ text, removed[] }` so the UI can show the diff.
4. **Scorer.** Deterministic rule set: required sections present, within budget, vague-verb lexicon, numbered criteria. A model never does the main scoring. The small model can add optional notes, but only as hints.
5. **Injection boundary.** The idea is wrapped in a random-nonce delimiter. The system prompt treats it as data. Output must parse as section JSON, so prose inside the idea can't change the structure. The output is never `eval`'d or used for routing.
6. **Data access.** See Q3. Prisma connects as a role that **bypasses RLS**, so "RLS as second line" needs a decision.
7. **Rate limits and caps.** A Postgres table (`usage_counters`) with atomic upserts, per user, per IP, daily tokens and a global monthly cap. No extra Redis service. 429 responses include `Retry-After`.
8. **Cache.** `prompt_cache(key = sha256(normalised idea + settings + template version))`. A template version bump invalidates it.
9. **Streaming.** A route handler returns a `ReadableStream` of NDJSON section events. Cancellation runs from `AbortController` through to the provider. There is a server-side timeout and a per-request token cap.

## 4. File tree (target)

```
promptforge/
  .env.example  .npmrc  package.json  prisma.config.ts  next.config.ts  capacitor.config.ts
  README.md               # fresh clone -> dev in one page; `npm test` runs everything
  prisma/schema.prisma
  supabase/migrations/    # RLS policies, usage_counters, grants (SQL, reviewed)
  src/
    app/
      layout.tsx  page.tsx  globals.css          # monochrome tokens, both themes
      (app)/library/  (app)/history/  (auth)/sign-in/
      api/generate/route.ts  api/clarify/route.ts  api/score/route.ts
    features/
      idea-input/       IdeaForm.tsx  idea.schema.ts  idea.test.ts
      settings/         SettingsPanel.tsx  settings.schema.ts
      clarify/          clarify.ts  taxonomy.ts  clarify.test.ts
      generate/         generate.action.ts  stream.ts  fallback.ts  generate.test.ts
      skeleton/         sections.ts  render.ts  skeleton.test.ts
      tokens/           tokenizer.ts  pruner.ts  pruner.test.ts
      score/            scorer.ts  vague-verbs.ts  scorer.test.ts  fixtures/
      editor/           PromptEditor.tsx  SectionToggle.tsx
      export/           export.ts  export.test.ts
      library/          library.actions.ts  LibraryList.tsx  library.test.ts
      history/
    templates/          # the file you maintain: one entry per archetype
      index.ts  web.ts  api.ts  cli.ts  mobile.ts  pipeline.ts  extension.ts
    server/
      env.ts            # Zod-parsed, fails fast at boot, server-only
      auth.ts  ownership.ts  rate-limit.ts  logger.ts (redaction)  result.ts  errors.ts
      models/  provider.ts  primary.ts  fallback.ts
    ui/                 # shadcn primitives, restyled
  tests/
    rls/isolation.test.ts   rate-limit/429.test.ts   e2e/*.spec.ts   contrast/contrast.test.ts
  android/              # generated by Capacitor in phase 6
```

## 5. Threat -> control -> test map

| Threat                       | Control                                                                                          | Test (phase)          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | --------------------- |
| Key leak                     | server-only `env.ts`, `import "server-only"`, scan the build output and the APK for key patterns | build scan (6, 7)     |
| Cross-user read/write        | owner check in every action, plus RLS                                                            | `rls/isolation` (2)   |
| Prompt injection             | nonce delimiter, JSON section contract, code-owned headers                                       | injection fixture (4) |
| Cost abuse                   | per-user/IP limits, daily + monthly caps                                                         | `429.test` (4)        |
| XSS via output               | plain-text render, no `dangerouslySetInnerHTML`, export sanitiser                                | export test (5)       |
| Oversized/control-char input | Zod schema                                                                                       | `idea.test` (2)       |
| Provider outage              | skeleton fallback                                                                                | `generate.test` (4)   |
| WebView abuse                | allowNavigation locked to domain, no cleartext, debugging off in release                         | manifest check (6)    |

There's no URL input in v1, so the SSRF controls aren't needed. They'd be added if one ever appears.

## 6. Decisions (2026-11-04)

- Models: Groq free (gpt-oss-120b final, gpt-oss-20b clarify/score), with Gemini Flash free as the fallback. The cost cap is enforced as token caps.
- Data layer: Prisma for schema and migrations only. Runtime queries use supabase-js with the user's JWT, so RLS is genuinely enforced, and every action also checks the owner explicitly.
- Android: the client UI is bundled as a static export, with the library mirrored on the device. Generation goes through the hosted API.
- Auth: email 6-digit code is the default. Not confirmed yet. Harinand asked about Supabase security and free-tier limits instead.
- Supabase free tier: 2 active projects per org, and a project pauses after about a week without activity. Harinand already has Weee and Sahi Daam projects, so check the free slots before phase 2.
