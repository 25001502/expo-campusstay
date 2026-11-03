import { mfaCodeError, signInErrors } from "./model";
import { parseCallback } from "./session";

/** Server-only provider factory seam, compatible with Supabase Auth method shapes.
 * Returned sessions are intentionally discarded: sign-in/MFA never grant authorization.
 * Not wired to HTTP routes, environment variables or the live project.
 */
export interface AuthFlowPort {
  signInWithPassword(input: { email: string; password: string }): Promise<{ error: unknown }>;
  resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<{ error: unknown }>;
  challengeAndVerify(input: { factorId: string; code: string }): Promise<{ error: unknown }>;
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  signOut(input: { scope: "local" }): Promise<{ error: unknown }>;
}
export type FlowResult = { ok: true; next: "verify_permissions" | "recovery_requested" | "signed_out" } |
  { ok: false; code: "unavailable" | "invalid_input" | "credentials_invalid" | "mfa_invalid" };
const unavailable: FlowResult = { ok: false, code: "unavailable" };
export function createAuthFlows(port: AuthFlowPort, clearCookies: () => void, hostedContractsVerified: boolean) {
  return {
    async signIn(email: string, password: string): Promise<FlowResult> {
      if (!hostedContractsVerified) return unavailable;
      const errors = signInErrors(email, password);
      if (errors.email || errors.password) return { ok: false, code: "invalid_input" };
      try {
        const result = await port.signInWithPassword({ email: email.trim(), password });
        return result?.error === null ? { ok: true, next: "verify_permissions" } : { ok: false, code: "credentials_invalid" };
      } catch { return unavailable; }
    },
    async recover(email: string, approvedRedirect: string): Promise<FlowResult> {
      if (!hostedContractsVerified) return unavailable;
      if (signInErrors(email, "unused").email) return { ok: false, code: "invalid_input" };
      // The caller must supply its fixed, approved HTTPS recovery callback, never a request value.
      try {
        const redirect = new URL(approvedRedirect);
        if (redirect.protocol !== "https:" || redirect.pathname !== "/auth/callback" || redirect.search || redirect.hash || redirect.username || redirect.password) return unavailable;
        await port.resetPasswordForEmail(email.trim(), { redirectTo: approvedRedirect });
        // Deliberately identical for known/unknown accounts and provider errors. Not proof of email delivery.
        return { ok: true, next: "recovery_requested" };
      } catch { return unavailable; }
    },
    async verifyMfa(factorId: string, code: string, verifiedFactorIds: readonly string[]): Promise<FlowResult> {
      if (!hostedContractsVerified) return unavailable;
      if (mfaCodeError(code) || !verifiedFactorIds.includes(factorId)) return { ok: false, code: "invalid_input" };
      try {
        const result = await port.challengeAndVerify({ factorId, code });
        return result?.error === null ? { ok: true, next: "verify_permissions" } : { ok: false, code: "mfa_invalid" };
      } catch { return unavailable; }
    },
    async signOut(): Promise<FlowResult> {
      try {
        if (!hostedContractsVerified) return unavailable;
        const result = await port.signOut({ scope: "local" });
        return result?.error === null ? { ok: true, next: "signed_out" } : unavailable;
      } catch { return unavailable; }
      finally { clearCookies(); }
    },
    async callback(url: string, configuredOrigin: string): Promise<FlowResult> {
      if (!hostedContractsVerified) return unavailable;
      const parsed = parseCallback(url, configuredOrigin);
      if (!parsed) return { ok: false, code: "invalid_input" };
      try {
        // The future SDK adapter must enforce its stored PKCE verifier and one-use code.
        const result = await port.exchangeCodeForSession(parsed.code);
        if (result?.error === null) return { ok: true, next: "verify_permissions" };
      } catch { /* Safe failure; clear partial artifacts below. */ }
      clearCookies();
      return unavailable;
    },
    // Expiry always drops local artifacts, even if the remote provider is unreachable.
    expire: clearCookies,
  };
}
