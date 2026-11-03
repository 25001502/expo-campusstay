import Link from "next/link";
import { ArrowLeft, House, LockKeyhole, ShieldCheck } from "lucide-react";
import { authMessages, type AuthFailure } from "../lib/auth/model";

export const authViews = ["sign-in", "recovery", "mfa", "expired", "sign-out"] as const;
export type AuthView = typeof authViews[number];
const copy: Record<AuthView, { title: string; description: string; button: string }> = {
  "sign-in": { title: "Admin sign in", description: "A secure workspace for trusted CampusStay administrators and reviewers.", button: "Sign-in unavailable" },
  recovery: { title: "Reset your password", description: "Account recovery will use your existing CampusStay account. No recovery email can be requested here yet.", button: "Recovery unavailable" },
  mfa: { title: "Verify your identity", description: "An authenticator code will be required after sign-in. Verification is not connected yet.", button: "Verification unavailable" },
  expired: { title: "Sign in again", description: "An expired or revoked session requires a fresh sign-in and permission check. Account access is currently unavailable.", button: "Sign-in unavailable" },
  "sign-out": { title: "End your session", description: "No live administrator session is connected here. Remote sign-out is currently unavailable.", button: "Sign-out unavailable" },
};

/** Presentation only: no credential state, SDK, browser auth storage or client permissions. */
export function AuthScreen({ view = "sign-in", failure, invalid = {} }: { view?: AuthView; failure?: AuthFailure; invalid?: { email?: boolean; password?: boolean; code?: boolean } }) {
  const content = copy[view];
  const email = ["sign-in", "expired", "recovery"].includes(view);
  const password = ["sign-in", "expired"].includes(view);
  return (
    <main className="sign-in-page admin-auth">
      <section className="sign-in-card" aria-labelledby="auth-title">
        <div className="brand light-brand">
          <span className="brand-mark"><House aria-hidden="true" /></span>
          <span>CampusStay<small>ADMIN WORKSPACE</small></span>
        </div>
        <span className="eyebrow">ADMINISTRATOR ACCESS</span>
        <h1 id="auth-title">{content.title}</h1>
        <p className="auth-description">{content.description}</p>
        <div className="auth-notice" role="status" aria-live="polite">
          <LockKeyhole size={18} aria-hidden="true" />
          <div><strong>Account access unavailable</strong><p>Sign-in and account recovery are not enabled. Please check back later.</p></div>
        </div>
        {failure && <p className="auth-error" role="alert">{authMessages[failure]}</p>}
        <form aria-describedby="auth-help" autoComplete="off">
          <fieldset disabled>
            <legend className="sr-only">Unavailable administrator account access</legend>
            {email && <><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" inputMode="email" placeholder="you@example.com" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={!!invalid.email} aria-describedby={invalid.email ? "email-error auth-help" : "auth-help"} />{invalid.email && <p id="email-error" className="auth-error" role="alert">Enter a valid email address.</p>}</>}
            {password && <><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" placeholder="Enter your password" autoComplete="current-password" aria-invalid={!!invalid.password} aria-describedby={invalid.password ? "password-error" : undefined} />{invalid.password && <p id="password-error" className="auth-error" role="alert">Enter your password.</p>}</>}
            {view === "mfa" && <><label htmlFor="admin-code">Authenticator code</label><input id="admin-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" aria-invalid={!!invalid.code} aria-describedby={invalid.code ? "code-error code-help" : "code-help"} />{invalid.code && <p id="code-error" className="auth-error" role="alert">Enter the six-digit code from your authenticator.</p>}<p id="code-help" className="small-note">Use the six-digit code from your enrolled authenticator. Never share this code.</p></>}
            <button className="button primary" type="button" disabled><LockKeyhole size={16} aria-hidden="true" />{content.button}</button>
          </fieldset>
        </form>
        {password && <Link className="auth-link" href="/sign-in?view=recovery">Forgot password?</Link>}
        {view !== "sign-in" && <Link className="auth-link" href="/sign-in"><ArrowLeft size={15} aria-hidden="true" />Back to sign in</Link>}
        <p id="auth-help" className="auth-footer"><ShieldCheck size={18} aria-hidden="true" /><span>No credentials are collected. This screen grants no access. Student or manager accounts do not automatically receive administrator permissions.</span></p>
      </section>
    </main>
  );
}
