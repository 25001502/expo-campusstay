import { permissions, type Authorization, type Permission } from "./model";

/** Server-owned ports only. Never supply request JSON, getSession() or a decoded JWT as verification. */
export interface VerificationPorts {
  // Structural subset of Supabase Auth 2.118.0: both calls must use the same request-scoped client.
  getUser(): Promise<unknown>;
  getClaims(): Promise<unknown>;
  // PROPOSED verified server contract, not an existing H1.3/B1 RPC. Must check current
  // Auth session, independent web-session admission and trusted assignments on every call.
  resolveAccess(userId: string, sessionId: string): Promise<unknown>;
}
export interface VerificationPolicy {
  hostedContractsVerified: boolean;
  issuer: string;
  now: () => number; // Unix seconds, server clock only
}
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const seconds = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const deny = (code: Exclude<Authorization, { ok: true }>["code"]): Authorization => ({ ok: false, code });
function data(response: unknown): Record<string, unknown> | null {
  const r = record(response);
  return r?.error === null ? record(r.data) : null;
}

/** No memoization: use again immediately before EVERY privileged operation. */
export async function authorizeAdmin(ports: VerificationPorts, policy: VerificationPolicy, required: Permission): Promise<Authorization> {
  if (!policy.hostedContractsVerified || !permissions.includes(required)) return deny("unavailable");
  try {
    const issuer = new URL(policy.issuer);
    if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash || issuer.pathname !== "/auth/v1") return deny("unavailable");
    const userResponse = data(await ports.getUser());
    if (!userResponse) return deny("session_invalid");
    if (userResponse.user === null) return deny("session_required");
    const user = record(userResponse.user);
    if (!user || !uuid(user.id) || typeof user.email_confirmed_at !== "string" || !Number.isFinite(Date.parse(user.email_confirmed_at))) return deny("session_invalid");
    const claims = record(data(await ports.getClaims())?.claims);
    if (!claims || claims.sub !== user.id || !uuid(claims.session_id) || claims.role !== "authenticated" || claims.aud !== "authenticated" || claims.iss !== policy.issuer || !seconds(claims.exp) || !seconds(claims.iat)) return deny("session_invalid");
    const now = policy.now();
    if (!seconds(now) || claims.iat > now || claims.iat >= claims.exp) return deny("session_invalid");
    if (claims.exp <= now) return deny("session_expired");
    if (claims.aal !== "aal2") return deny("mfa_required");
    const access = record(await ports.resolveAccess(user.id, claims.session_id));
    // Deployment verification is distinct from pausing manager submissions. Recovery/read
    // operation availability during a pause belongs to the future scoped RPC contract.
    if (!access || access.version !== 1 || access.user_id !== user.id || access.session_id !== claims.session_id || access.contracts_verified !== true || access.session_active !== true) return deny("forbidden");
    // Separate admitted admin session: JWT validity alone does not establish idle/absolute lifetime.
    if (!seconds(access.absolute_expires_at) || !seconds(access.idle_expires_at) || Math.min(access.absolute_expires_at, access.idle_expires_at, claims.exp) <= policy.now()) return deny("session_expired");
    if (!Array.isArray(access.assignments) || access.assignments.length > 10) return deny("forbidden");
    const allowed = new Set<Permission>();
    for (const entry of access.assignments) {
      const assignment = record(entry);
      if (!assignment || !["administrator", "reviewer"].includes(String(assignment.kind)) || typeof assignment.active !== "boolean" || !Array.isArray(assignment.permissions)) return deny("forbidden");
      for (const p of assignment.permissions) {
        if (!permissions.includes(p)) return deny("forbidden");
        if (assignment.kind === "reviewer" && p === "access:manage") return deny("forbidden");
        if (assignment.active) allowed.add(p);
      }
    }
    if (!allowed.has(required)) return deny("forbidden");
    return { ok: true, identity: { version: 1, user_id: user.id, sessionId: claims.session_id, assurance: "aal2", permissions: [...allowed] } };
  } catch {
    // Never expose provider messages, JWTs, documents, email or exception details.
    return deny("unavailable");
  }
}

export async function withAdminAuthorization<T>(ports: VerificationPorts, policy: VerificationPolicy, permission: Permission, operation: (identity: Extract<Authorization, { ok: true }>["identity"]) => Promise<T>) {
  const authorization = await authorizeAdmin(ports, policy, permission);
  if (!authorization.ok) return authorization;
  // Future DB RPCs must still enforce RLS/locks/current authorization atomically.
  return { ok: true as const, data: await operation(authorization.identity) };
}
