import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { authorizeAdmin, withAdminAuthorization, type VerificationPorts } from "../src/lib/auth/authorization";
import { signInErrors, mfaCodeError } from "../src/lib/auth/model";
import { parseIdentityReference } from "../../shared/contracts/v1/core";
const userId = "10000000-0000-4000-8000-000000000001";
const sessionId = "20000000-0000-4000-8000-000000000001";
const now = 1792756800;
const policy = { hostedContractsVerified: true, issuer: "https://identity.example.test/auth/v1", now: () => now };
function fixture() {
  const user = { id: userId, email_confirmed_at: "2026-10-23T08:00:00Z", user_metadata: { is_admin: true } };
  const claims = { sub: userId, session_id: sessionId, role: "authenticated", aud: "authenticated", iss: policy.issuer, iat: now - 60, exp: now + 900, aal: "aal2" };
  const access = { version: 1, user_id: userId, session_id: sessionId, contracts_verified: true, session_active: true, absolute_expires_at: now + 3600, idle_expires_at: now + 600, assignments: [{ kind: "reviewer", active: true, permissions: ["workspace:read", "applications:review"] }] };
  let lookups = 0;
  const ports: VerificationPorts = {
    getUser: async () => ({ data: { user }, error: null }),
    getClaims: async () => ({ data: { claims }, error: null }),
    resolveAccess: async () => { lookups++; return access; },
  };
  return { user, claims, access, ports, lookups: () => lookups };
}
test("trusted AAL2 reviewer identity uses H1.5A versioned reference; no automatic administrator scope", async () => {
  const f = fixture(), result = await authorizeAdmin(f.ports, policy, "workspace:read");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(parseIdentityReference({ version: result.identity.version, user_id: result.identity.user_id }), { version: 1, user_id: userId });
  assert.equal(result.identity.permissions.includes("access:manage"), false);
  assert.deepEqual(await authorizeAdmin(f.ports, policy, "access:manage"), { ok: false, code: "forbidden" });
});
test("readiness false denies before touching provider, even with valid synthetic claims", async () => {
  const f = fixture();
  f.ports.getUser = async () => { throw new Error("must not be called"); };
  assert.deepEqual(await authorizeAdmin(f.ports, { ...policy, hostedContractsVerified: false }, "workspace:read"), { ok: false, code: "unavailable" });
});
for (const [label, response] of [
  ["missing session", { data: { user: null }, error: null }],
  ["provider error", { data: { user: { id: userId } }, error: { message: "do not reflect" } }],
  ["malformed response", { user: { id: userId } }],
  ["undefined", undefined], ["array", []], ["missing error field", { data: { user: null } }],
] as const) test(label + " denies", async () => {
  const f = fixture(); f.ports.getUser = async () => response;
  assert.equal((await authorizeAdmin(f.ports, policy, "workspace:read")).ok, false);
  assert.equal(f.lookups(), 0);
});
for (const patch of [
  { sub: "other" }, { session_id: "forged" }, { role: "service_role" }, { aud: "anon" },
  { iss: "https://attacker.test/auth/v1" }, { iat: now + 1 }, { exp: "9999999999" }, { exp: NaN },
]) test("malformed or mismatched verified claims deny: " + JSON.stringify(patch), async () => {
  const f = fixture(); Object.assign(f.claims, patch);
  assert.equal((await authorizeAdmin(f.ports, policy, "workspace:read")).ok, false);
  assert.equal(f.lookups(), 0);
});
for (const aal of ["aal1", "", undefined, "aal3"]) test("MFA assurance denied: " + String(aal), async () => {
  const f = fixture(); Object.assign(f.claims, { aal });
  assert.deepEqual(await authorizeAdmin(f.ports, policy, "workspace:read"), { ok: false, code: "mfa_required" });
});
test("expired session denied", async () => {
  const f = fixture(); f.claims.exp = now;
  assert.deepEqual(await authorizeAdmin(f.ports, policy, "workspace:read"), { ok: false, code: "session_expired" });
});
for (const patch of [
  { contracts_verified: false }, { session_active: false }, { version: 2 }, { user_id: sessionId }, { session_id: userId },
  { assignments: [] }, { assignments: [{ kind: "reviewer", active: false, permissions: ["workspace:read"] }] },
  { assignments: [{ kind: "student", active: true, permissions: ["workspace:read"] }] },
  { assignments: [{ kind: "manager", active: true, permissions: ["workspace:read"] }] },
  { assignments: [{ kind: "administrator", active: true, permissions: ["all"] }] },
  { assignments: [{ kind: "reviewer", active: true, permissions: ["access:manage", "workspace:read"] }] },
]) test("untrusted/missing/revoked access denied: " + JSON.stringify(patch), async () => {
  const f = fixture(); Object.assign(f.access, patch);
  assert.equal((await authorizeAdmin(f.ports, policy, "workspace:read")).ok, false);
});
for (const key of ["idle_expires_at", "absolute_expires_at"] as const) test(key + " enforced independently of JWT", async () => {
  const f = fixture(); f.access[key] = now;
  assert.deepEqual(await authorizeAdmin(f.ports, policy, "workspace:read"), { ok: false, code: "session_expired" });
});
test("permission revocation is seen on next operation; page authorization cannot be reused", async () => {
  const f = fixture(); let actions = 0;
  const invoke = () => withAdminAuthorization(f.ports, policy, "applications:review", async () => ++actions);
  assert.equal((await invoke()).ok, true);
  f.access.assignments[0].active = false;
  assert.equal((await invoke()).ok, false);
  assert.equal(actions, 1); assert.equal(f.lookups(), 2);
});
test("server-auth errors are safe and never reflect provider detail", async () => {
  const f = fixture(); f.ports.getClaims = async () => { throw new Error("private token details"); };
  assert.deepEqual(await authorizeAdmin(f.ports, policy, "workspace:read"), { ok: false, code: "unavailable" });
});
test("frontend flags and user metadata cannot create trusted permissions", async () => {
  const f = fixture(); f.access.assignments = [];
  Object.assign(f.user, { is_admin: true, app_metadata: { role: "administrator" }, ADMIN_MOCK_MODE: "1" });
  Object.assign(f.claims, { is_admin: true, permissions: ["workspace:read"] });
  assert.deepEqual(await authorizeAdmin(f.ports, policy, "workspace:read"), { ok: false, code: "forbidden" });
});
test("unconfirmed identity and malformed permission projection denied", async () => {
  const f = fixture(); f.user.email_confirmed_at = "";
  assert.equal((await authorizeAdmin(f.ports, policy, "workspace:read")).ok, false);
  f.user.email_confirmed_at = "2026-10-23T08:00:00Z";
  f.ports.resolveAccess = async () => null;
  assert.equal((await authorizeAdmin(f.ports, policy, "workspace:read")).ok, false);
});
test("form validation is bounded, preserves existing password rules and handles six-digit codes", () => {
  assert.equal(signInErrors(" reader@example.test ", " x ").password, "");
  assert.equal(signInErrors("", "").email, "Enter a valid email address.");
  assert.ok(signInErrors("bad", "").password);
  assert.ok(signInErrors("a".repeat(255) + "@example.test", "x").email);
  assert.ok(signInErrors("a@example.test", "x".repeat(4097)).password);
  assert.equal(mfaCodeError("123456"), "");
  for (const v of ["12345", "1234567", "abcdef", " 123456", "１２３４５６"]) assert.ok(mfaCodeError(v));
});
test("release guard cannot be enabled by an env flag; production runtime has no provider", () => {
  const source = readFileSync(new URL("../src/lib/auth/runtime.server.ts", import.meta.url), "utf8");
  assert.match(source, /import "server-only"/);
  assert.match(source, /return \{ ok: false, code: "unavailable" \}/);
  assert.doesNotMatch(source, /process\.env|createClient|createServerClient|fetch\(/);
});
