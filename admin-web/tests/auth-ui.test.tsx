import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthScreen, authViews } from "../src/components/auth-screen";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
test("every auth view is explicitly unavailable, accessible and collects no credentials", () => {
  for (const view of authViews) {
    const html = renderToStaticMarkup(<AuthScreen view={view} />);
    assert.match(html, /Account access unavailable/);
    assert.match(html, /No credentials are collected/);
    assert.match(html, /<fieldset disabled=""/);
    assert.match(html, /aria-labelledby="auth-title"/);
    assert.match(html, /role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /name="(?:password|email|code)"|supabase\.co|service_role/);
  }
});
test("accessible field errors associate labels, invalid controls and safe error text", () => {
  const html = renderToStaticMarkup(<AuthScreen failure="session_invalid" invalid={{ email: true, password: true }} />);
  assert.match(html, /aria-describedby="email-error auth-help"/);
  assert.match(html, /aria-describedby="password-error"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Your session could not be verified/);
  assert.match(html, /aria-invalid="true"/);
  const mfa = renderToStaticMarkup(<AuthScreen view="mfa" invalid={{ code: true }} />);
  assert.match(mfa, /aria-describedby="code-error code-help"/);
  assert.match(mfa, /inputMode="numeric"/);
});
test("browser presentation never imports auth orchestration, cookie runtime, Expo client or secrets", () => {
  const component = readFileSync(new URL("../src/components/auth-screen.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /authorization|runtime.server|createAuthFlows|localStorage|sessionStorage|process\.env|createClient|src\/auth\/client/);
  const files = readdirSync(resolve("src/lib/auth"));
  for (const file of files) {
    const source = readFileSync(resolve("src/lib/auth", file), "utf8");
    assert.doesNotMatch(source, /service_role|sb_secret_|EXPO_PUBLIC_|NEXT_PUBLIC_/);
  }
  const route = readFileSync(new URL("../src/app/auth/[action]/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /\.json\(|\.text\(|fetch\(|exchangeCodeForSession\(/);
  assert.match(route, /runtime.server/);
});
