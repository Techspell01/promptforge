# PromptForge

Type a plain-English idea, get a compact, token-budgeted, security-hardened build prompt for an AI coding agent.
Web app (Vercel) plus an Android app (Capacitor). Strict monochrome UI. No accounts and no database:
the library and history live on the user's device.

## Run it locally (fresh clone)

Needs Node 20.9+.

```bash
npm ci
cp .env.example .env.local   # add GROQ_API_KEY, optionally GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

Free keys: Groq at https://console.groq.com/keys (primary, `openai/gpt-oss-120b`), Gemini at https://aistudio.google.com/apikey (optional fallback).
With no working key the app still runs: generation falls back to the deterministic skeleton.

## Tests

| Command            | What runs                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `npm run test:all` | unit tests, then end-to-end tests                                                         |
| `npm test`         | unit tests (Vitest); no network or database                                               |
| `npm run test:e2e` | Playwright on desktop and phone viewports: generate, trim, export, save, security headers |
| `npm run check`    | typecheck, lint, format check, unit tests                                                 |

What the tests prove, by threat:

- **Abuse and cost**: `src/server/rate-limit.test.ts` (429 + Retry-After per IP, separate buckets, token caps, hashed client ids).
- **Prompt injection**: `skeleton.test.ts`, `section-stream.test.ts`, `model-prompt.test.ts`, `generate.test.ts` (payloads cannot change headers, order or the security checklist).
- **Provider outage**: `generate.test.ts` (fallback model, then deterministic skeleton; cache; cancel).
- **Bad input**: `idea.test.ts`, generate route tests (control characters, oversize, unknown fields).
- **Leaky logs and errors**: `logger.test.ts`, `provider.test.ts`.
- **Tampered device storage**: `library-logic.test.ts` (invalid stored entries are dropped).
- **Design contract**: `tests/unit/palette.test.ts` (zero hue anywhere, WCAG AA in both themes).
- **Trojan Source**: `tests/unit/source-hygiene.test.ts`.

## How generation works

1. **Clarify**: a deterministic keyword taxonomy (auth, payments, persistence, offline, integrations) asks at most 3 questions, each with fixed answer options.
2. **Generate**: the model fills section content only, in a `@@section_id` line format. Code owns every header, the order, ROLE and the SECURITY checklist. The idea is wrapped in random-nonce delimiters and treated as data.
3. **Prune**: real `o200k_base` token counts. The prune order is fixed (ANTI-PATTERNS, merge DATA MODEL into SCOPE, compress TESTS, compress CODE QUALITY), and SECURITY and ACCEPTANCE CRITERIA are never touched. Text is never truncated; every removal is reported.
4. **Score**: a deterministic rubric with reasons. No model judges the score.
5. **Fallback**: Groq, then Gemini, then the skeleton. Identical requests are served from an in-memory cache.

The prompt templates live in `src/templates/`, one readable file per archetype. Bump `TEMPLATE_VERSION` in `src/templates/index.ts` when you change them, so cached outputs are invalidated.

## Deploy (web)

Vercel environment variables: `GROQ_API_KEY`, optional `GEMINI_API_KEY`, and `CORS_ALLOWED_ORIGINS=https://localhost` (for the Android app). Never prefix server keys with `NEXT_PUBLIC_`.

## Android

```bash
cp .env.android.example .env.android   # your deployed https URL
npm run build:android                  # static UI export + secret scan + cap sync
cd android && ./gradlew assembleDebug  # JAVA_HOME = Android Studio's bundled JBR (JDK 21)
```

The APK contains only the static UI and the public API URL. Generation goes through the deployed API. The build refuses to package if any server key value appears in the bundle.

Android hardening:

- TLS only: a network security config with no cleartext traffic.
- WebView debugging is off, and the WebView cannot navigate outside the bundle.
- `allowBackup=false` with data-extraction rules.
- Only the launcher activity is exported.
- FileProvider is limited to the cache directory.
- No deep links.

## Residual risks

- **The API is public, and its limits live in memory per server instance.** Rate limits, token caps and the cache are approximate on Vercel, because several instances run and restarts reset them. With free-tier keys the worst case is running out of quota, after which the app serves the skeleton. That cannot cost money unless billing is added to the Groq or Google account. If exact limits are ever needed, move `src/server/memory-store.ts` to a shared store such as Upstash Redis.
- **Per-IP limits trust `x-real-ip` / `x-forwarded-for`.** That is correct on Vercel, but spoofable on a host that does not overwrite those headers.
- **The library lives on one device.** Clearing site data or uninstalling the app deletes it; export prompts worth keeping.
- **The CSP allows `'unsafe-inline'` scripts.** Next.js needs inline bootstrap scripts unless every page is rendered per request with a nonce. XSS is contained instead by never rendering model output as HTML (enforced by a lint rule) and by plain-text export.
- **Token counts are `o200k_base` estimates.** They are exact for gpt-oss, and close but not exact for Gemini.
- **Dev-only dependency advisories.** `npm audit` reports moderate findings in the ESLint toolchain. None are in the shipped app, and there are no high or critical findings.
