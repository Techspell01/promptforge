import "server-only";
import { errorResponse, handle } from "./http";
import { clientKey, enforceRateLimit, type LimitKind } from "./rate-limit";

/** No accounts: every route is public, so every route is rate-limited per client (hashed IP) before it runs. */
export function limitedRoute(
  request: Request,
  route: string,
  limit: LimitKind,
  run: (client: { readonly key: string }) => Promise<Response>,
): Promise<Response> {
  return handle(request, route, async () => {
    const key = clientKey(request);
    const limited = enforceRateLimit(limit, key);
    if (!limited.ok) return errorResponse(request, limited.error);
    return run({ key });
  });
}
