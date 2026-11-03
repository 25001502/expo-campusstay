import "server-only";
import { cookies } from "next/headers";
import { createCookieBridge } from "./session";
import type { Authorization } from "./model";

// Deliberately no environment override, live SDK/client, credentials or provider factory.
// Removing this release lock requires a separately reviewed integration phase.
export async function requireLiveAdmin(): Promise<Authorization> {
  return { ok: false, code: "unavailable" };
}

/** For future Route Handlers/Server Actions only; writes must never be swallowed in RSC. */
export async function requestCookieBridge() {
  const store = await cookies();
  return createCookieBridge({ getAll: () => store.getAll(), set: (name, value, options) => store.set(name, value, options) });
}

export function unavailableAuthResponse() {
  return Response.json({ ok: false, code: "unavailable" }, {
    status: 503,
    headers: { "Cache-Control": "private, no-store", "Pragma": "no-cache", "Referrer-Policy": "no-referrer" },
  });
}
