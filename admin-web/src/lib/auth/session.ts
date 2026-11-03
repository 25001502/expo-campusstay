/** Request-scoped SSR cookie adapter preparation; no tokens ever go to client components.
 * These ports are not connected to a Supabase client in H1.5B2.
 */
export interface CookieOptions {
  path?: string; domain?: string; secure?: boolean; httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean; maxAge?: number; expires?: Date;
}
export interface CookieStore {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options: CookieOptions): void;
}
export function createCookieBridge(store: CookieStore) {
  const approved = (name: string) => /^__Host-cs-admin-auth(?:-code-verifier)?(?:\.\d{1,2})?$/.test(name);
  return {
    getAll: () => store.getAll().filter(cookie => approved(cookie.name)),
    setAll(batch: { name: string; value: string; options: CookieOptions }[]) {
      // Validate the entire batch first. SDK chunk removal/expiry must not be swallowed.
      if (batch.some(cookie => !approved(cookie.name) || cookie.options.domain || (cookie.options.maxAge !== undefined && !Number.isFinite(cookie.options.maxAge)))) throw new Error("Invalid admin cookie batch");
      for (const { name, value, options } of batch) store.set(name, value, {
        ...options, domain: undefined, path: "/", httpOnly: true, secure: true, sameSite: "lax",
      });
    },
    clear() {
      for (const { name } of store.getAll()) if (approved(name)) store.set(name, "", { path: "/", secure: true, httpOnly: true, sameSite: "lax", maxAge: 0 });
    },
  };
}

/** Fixed callback destination; PKCE verifier/code exchange remains an SDK responsibility. */
export function parseCallback(input: string, configuredOrigin: string): { code: string; destination: "/admin" } | null {
  try {
    const origin = new URL(configuredOrigin), url = new URL(input);
    if (origin.protocol !== "https:" || origin.origin !== configuredOrigin || url.origin !== origin.origin || url.pathname !== "/auth/callback" || url.hash || url.username || url.password) return null;
    if ([...url.searchParams.keys()].some(key => key !== "code") || url.searchParams.getAll("code").length !== 1) return null;
    const code = url.searchParams.get("code");
    return code && /^[a-zA-Z0-9_-]{16,512}$/.test(code) ? { code, destination: "/admin" } : null;
  } catch { return null; }
}

/** Same-origin JSON BFF contract; no state-changing GET or cross-origin requests. */
export function isSameOriginMutation(request: Request, configuredOrigin: string): boolean {
  try {
    const origin = new URL(configuredOrigin);
    return origin.protocol === "https:" && origin.origin === configuredOrigin && new URL(request.url).origin === configuredOrigin && request.method === "POST" && request.headers.get("origin") === configuredOrigin && request.headers.get("content-type")?.split(";")[0].trim() === "application/json" && [null, "same-origin"].includes(request.headers.get("sec-fetch-site"));
  } catch { return false; }
}
