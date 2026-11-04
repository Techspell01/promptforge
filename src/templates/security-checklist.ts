import type { SecurityLevel } from "@/features/settings/settings.schema";

export const SECURITY_ITEMS = [
  "secrets",
  "authn",
  "authz",
  "validation",
  "injection",
  "rate_limits",
  "ssrf",
  "xss",
  "logging_pii",
  "deps",
  "headers",
] as const;

export type SecurityItem = (typeof SECURITY_ITEMS)[number];

interface ChecklistLine {
  readonly standard: string;
  /** Appended to the standard line when the security level is paranoid. */
  readonly paranoid: string;
}

/** Code-owned so SECURITY can never be weakened, reworded away or omitted by the model. */
export const SECURITY_CHECKLIST: Readonly<Record<SecurityItem, ChecklistLine>> = {
  secrets: {
    standard:
      "Secrets: server-only env vars, `.env.example` committed, fail fast at boot when missing, never log or bundle them.",
    paranoid: "Scan build output for key patterns in CI; rotate any key that reaches a client bundle.",
  },
  authn: {
    standard:
      "Authentication: use the platform's maintained auth library; no hand-rolled password or session handling.",
    paranoid: "Short-lived sessions, revoke on sign-out, re-authenticate for destructive actions.",
  },
  authz: {
    standard: "Authorization: verify ownership server-side on every read and write; deny by default.",
    paranoid:
      "Add a second enforcement layer (row-level security or policy engine) and a cross-tenant isolation test.",
  },
  validation: {
    standard:
      "Validation: schema-validate every external input at the boundary; cap lengths; reject unknown fields.",
    paranoid: "Reject control and bidi-override characters; validate outputs before persisting them.",
  },
  injection: {
    standard:
      "Injection: parameterised queries only; never build SQL, shell or HTML from strings; treat LLM input as untrusted data.",
    paranoid: "Delimit untrusted text, forbid it from driving control flow, test with injection payloads.",
  },
  rate_limits: {
    standard:
      "Rate limits: per-user and per-IP limits on expensive or auth endpoints; return 429 with Retry-After.",
    paranoid: "Add daily quotas and a global spend cap with a clear refusal message.",
  },
  ssrf: {
    standard:
      "SSRF: for any user-supplied URL allow https only, block private, loopback and link-local ranges, cap redirects, size and time.",
    paranoid: "Resolve DNS once and connect to the checked address; disallow redirects to new hosts.",
  },
  xss: {
    standard:
      "XSS: render user and model content as text; no raw HTML injection; sanitise anything exported.",
    paranoid: "Strict CSP without unsafe-eval; Trusted Types where supported.",
  },
  logging_pii: {
    standard: "Logging: structured logs; redact tokens, keys and emails; no raw user content at info level.",
    paranoid: "Set log retention; keep an audit log for auth and data-deletion events.",
  },
  deps: {
    standard:
      "Dependencies: pin versions, commit the lockfile, `npm audit` (or equivalent) clean of high and critical, review install scripts.",
    paranoid: "Enable automated dependency PRs and block merges on new high findings.",
  },
  headers: {
    standard:
      "Headers: CSP, X-Frame-Options DENY, Referrer-Policy, HSTS, Permissions-Policy; generic error bodies without stack traces.",
    paranoid: "Verify headers in an automated test against the production build.",
  },
};

export function renderSecurityChecklist(items: readonly SecurityItem[], level: SecurityLevel): string[] {
  return items.map((item) => {
    const line = SECURITY_CHECKLIST[item];
    return level === "paranoid" ? `- ${line.standard} ${line.paranoid}` : `- ${line.standard}`;
  });
}
