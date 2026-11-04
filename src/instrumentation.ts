// Runs once when the server boots: a missing or malformed env var stops the server instead of failing mid-request.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { serverEnvironment } = await import("@/server/env");
  serverEnvironment();
}
