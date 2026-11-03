import type { IdentityReferenceV1 } from "../../../../shared/contracts/v1/core";

// Types are references, never proof of identity. No runtime import crosses the app boundary.
export type AdminIdentity = IdentityReferenceV1 & {
  sessionId: string;
  assurance: "aal2";
  permissions: readonly Permission[];
};
export const permissions = ["workspace:read", "applications:review", "access:manage"] as const;
export type Permission = typeof permissions[number];
export type AuthFailure = "unavailable" | "session_required" | "session_invalid" |
  "session_expired" | "mfa_required" | "forbidden";
export type Authorization = { ok: true; identity: AdminIdentity } | { ok: false; code: AuthFailure };

export const authMessages: Record<AuthFailure, string> = {
  unavailable: "Account access is currently unavailable. Please check back later.",
  session_required: "Sign in to continue to the admin workspace.",
  session_invalid: "Your session could not be verified. Please sign in again.",
  session_expired: "Your session has expired. Please sign in again.",
  mfa_required: "Verify with your authenticator to continue.",
  forbidden: "This account does not have access to the admin workspace.",
};

export function signInErrors(email: string, password: string) {
  return {
    email: email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "" : "Enter a valid email address.",
    // Sign-in must not impose new password creation rules or trim a password.
    password: password.length > 0 && password.length <= 4096 ? "" : "Enter your password.",
  };
}
export const mfaCodeError = (code: string) => /^\d{6}$/.test(code) ? "" : "Enter the six-digit code from your authenticator.";
