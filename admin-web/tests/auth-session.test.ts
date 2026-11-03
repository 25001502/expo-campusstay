import assert from "node:assert/strict";
import { test } from "node:test";
import { createCookieBridge, isSameOriginMutation, parseCallback, type CookieOptions } from "../src/lib/auth/session";
import { createAuthFlows, type AuthFlowPort } from "../src/lib/auth/flows";
const origin = "https://admin.example.test";
const callback = origin + "/auth/callback";
const url = callback + "?code=synthetic_code_12345";
function flowFixture(ready = true) {
  let calls = 0, clears = 0;
  const ok = async () => { calls++; return { error: null }; };
  const port: AuthFlowPort = { signInWithPassword: ok, resetPasswordForEmail: ok, challengeAndVerify: ok, exchangeCodeForSession: ok, signOut: ok };
  return { port, flows: createAuthFlows(port, () => { clears++; }, ready), calls: () => calls, clears: () => clears };
}
test("cookie batches preserve chunks and expiry, force secure host-only HttpOnly policy", () => {
  const writes: { name: string; value: string; options: CookieOptions }[] = [];
  const bridge = createCookieBridge({ getAll: () => [
    { name: "__Host-cs-admin-auth.0", value: "synthetic" },
    { name: "__Host-cs-admin-auth-code-verifier", value: "synthetic" },
    { name: "__Host-cs-admin-auth-code-verifier.0", value: "synthetic-chunk" },
    { name: "unrelated", value: "untouched" },
  ], set: (name, value, options) => { writes.push({ name, value, options }); } });
  assert.equal(bridge.getAll().length, 3);
  bridge.setAll([{ name: "__Host-cs-admin-auth.0", value: "", options: { httpOnly: false, secure: false, path: "/wrong", sameSite: "none", maxAge: 0 } }]);
  assert.deepEqual(writes[0].options, { httpOnly: true, secure: true, path: "/", sameSite: "lax", maxAge: 0, domain: undefined });
  bridge.clear(); assert.equal(writes.length, 4);
  assert.ok(writes.every(w => w.options.maxAge === 0));
});
test("cookie bridge rejects entire invalid batch without partial writes", () => {
  let writes = 0;
  const bridge = createCookieBridge({ getAll: () => [], set: () => { writes++; } });
  for (const cookie of [
    { name: "foreign", value: "", options: {} },
    { name: "__Host-cs-admin-auth", value: "", options: { domain: "example.test" } },
    { name: "__Host-cs-admin-auth", value: "", options: { maxAge: NaN } },
  ]) assert.throws(() => bridge.setAll([{ name: "__Host-cs-admin-auth.0", value: "synthetic", options: {} }, cookie]));
  assert.equal(writes, 0);
});
test("callback accepts only fixed approved HTTPS origin/path, bounded code and fixed destination", () => {
  assert.deepEqual(parseCallback(url, origin), { code: "synthetic_code_12345", destination: "/admin" });
  for (const value of [
    url + "&next=https://attacker.test", url + "&code=duplicate_code_123", url + "#access_token=forged",
    "https://attacker.test/auth/callback?code=synthetic_code_12345", callback + "?error=denied",
    origin + "/other?code=synthetic_code_12345", callback + "?code=x", callback + "?code=" + "x".repeat(513),
  ]) assert.equal(parseCallback(value, origin), null);
  assert.equal(parseCallback(url, "http://admin.example.test"), null);
  assert.equal(parseCallback(url, origin + "/"), null);
});
test("BFF mutation guard rejects cross-origin, missing origin, form bodies and state-changing GET", () => {
  const request = (extra: RequestInit = {}) => new Request(origin + "/auth/sign-in", { method: "POST", headers: { origin, "content-type": "application/json", "sec-fetch-site": "same-origin" }, ...extra });
  assert.equal(isSameOriginMutation(request(), origin), true);
  for (const invalid of [
    request({ method: "GET" }), request({ headers: { origin: "https://attacker.test", "content-type": "application/json" } }),
    request({ headers: { "content-type": "application/json" } }),
    request({ headers: { origin, "content-type": "application/x-www-form-urlencoded" } }),
    request({ headers: { origin, "content-type": "application/json", "sec-fetch-site": "cross-site" } }),
  ]) assert.equal(isSameOriginMutation(invalid, origin), false);
  assert.equal(isSameOriginMutation(request(), "http://admin.example.test"), false);
});
test("unverified readiness never calls sign-in, recovery, MFA, callback or sign-out provider", async () => {
  const f = flowFixture(false);
  for (const result of [
    await f.flows.signIn("reader@example.test", "synthetic"),
    await f.flows.recover("reader@example.test", callback),
    await f.flows.verifyMfa("factor", "123456", ["factor"]),
    await f.flows.callback(url, origin), await f.flows.signOut(),
  ]) assert.deepEqual(result, { ok: false, code: "unavailable" });
  assert.equal(f.calls(), 0); assert.equal(f.clears(), 1);
});
test("sign-in and MFA success only advance to permission verification, never authorize", async () => {
  const f = flowFixture();
  assert.deepEqual(await f.flows.signIn("reader@example.test", "synthetic"), { ok: true, next: "verify_permissions" });
  assert.deepEqual(await f.flows.verifyMfa("factor", "123456", ["factor"]), { ok: true, next: "verify_permissions" });
  assert.equal(f.calls(), 2);
});
test("validation blocks malformed credentials, unowned MFA factors and invalid codes", async () => {
  const f = flowFixture();
  assert.equal((await f.flows.signIn("invalid", "")).ok, false);
  assert.equal((await f.flows.verifyMfa("foreign", "123456", ["factor"])).ok, false);
  assert.equal((await f.flows.verifyMfa("factor", "abc123", ["factor"])).ok, false);
  assert.equal(f.calls(), 0);
});
test("bad credentials and MFA failures never reveal provider messages", async () => {
  const f = flowFixture();
  f.port.signInWithPassword = async () => ({ error: { message: "private failure" } });
  f.port.challengeAndVerify = async () => ({ error: { message: "private failure" } });
  assert.deepEqual(await f.flows.signIn("reader@example.test", "synthetic"), { ok: false, code: "credentials_invalid" });
  assert.deepEqual(await f.flows.verifyMfa("factor", "123456", ["factor"]), { ok: false, code: "mfa_invalid" });
});
test("recovery does not reveal whether an account exists or claim email delivery", async () => {
  const f = flowFixture();
  assert.deepEqual(await f.flows.recover("reader@example.test", callback), { ok: true, next: "recovery_requested" });
  f.port.resetPasswordForEmail = async () => ({ error: { message: "not found" } });
  assert.deepEqual(await f.flows.recover("missing@example.test", callback), { ok: true, next: "recovery_requested" });
  assert.equal((await f.flows.recover("reader@example.test", "http://unsafe.test/auth/callback")).ok, false);
});
test("callback mocks enforce one-use exchange and clear partial cookies on replay", async () => {
  const f = flowFixture(); let used = false;
  f.port.exchangeCodeForSession = async () => {
    if (used) return { error: { message: "already used" } };
    used = true; return { error: null };
  };
  assert.deepEqual(await f.flows.callback(url, origin), { ok: true, next: "verify_permissions" });
  assert.deepEqual(await f.flows.callback(url, origin), { ok: false, code: "unavailable" });
  assert.equal(f.clears(), 1);
  assert.equal((await f.flows.callback(url + "&next=/admin", origin)).ok, false);
});
test("sign-out failure and expiry still clear local cookies without claiming remote success", async () => {
  const f = flowFixture();
  f.port.signOut = async () => { throw new Error("offline"); };
  assert.deepEqual(await f.flows.signOut(), { ok: false, code: "unavailable" });
  f.flows.expire(); assert.equal(f.clears(), 2);
  f.port.signOut = async () => ({ error: null });
  assert.deepEqual(await f.flows.signOut(), { ok: true, next: "signed_out" });
  assert.equal(f.clears(), 3);
});
