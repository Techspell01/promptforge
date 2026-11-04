// Builds the static UI for the APK and syncs it into the Android project.
// The APK contains no server code and no secrets: only NEXT_PUBLIC_* values, which are public by design.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

loadDotEnv(".env.android");
loadDotEnv(".env.local");

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
if (!/^https:\/\/[^/]+$/.test(apiBase)) {
  console.error(
    "NEXT_PUBLIC_API_BASE_URL must be your deployed https origin with no trailing slash (set it in .env.android).",
  );
  process.exit(1);
}
const run = (command, extraEnvironment = {}) =>
  execSync(command, { stdio: "inherit", env: { ...process.env, ...extraEnvironment } });

run("npx next build", { BUILD_TARGET: "android" });

// Defence in depth: fail if any server secret value, or anything shaped like a full key, reached the bundle.
const secretValues = ["SUPABASE_SERVICE_ROLE_KEY", "GROQ_API_KEY", "GEMINI_API_KEY"]
  .map((name) => process.env[name])
  .filter((value) => typeof value === "string" && value.length >= 20);
const SECRET_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /\bgsk_[A-Za-z0-9]{20,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
];
function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const leaks = walk("out").filter((file) => {
  const text = readFileSync(file, "latin1");
  return (
    secretValues.some((value) => text.includes(value)) ||
    SECRET_PATTERNS.some((pattern) => pattern.test(text))
  );
});
if (leaks.length > 0) {
  console.error(`Refusing to package: secret-like strings found in ${leaks.join(", ")}`);
  process.exit(1);
}
console.log("Bundle scan: no secret-like strings found.");

run("npx cap sync android");
