# H1.5B2 — Admin authentication foundation

Completed locally on 23 October 2026. **No real sign-in or administrative access is activated.** Existing Supabase Auth remains the intended identity provider; no separate identity database was created. No cloud resources, accounts, assignments, documents, migrations, Docker/WSL state or credentials were changed. No SQL was executed, including the previous in-memory SQL runners.

## Independent security review before implementation

Read the five H1.5 architecture documents, H1.5A contracts, B1 report and forward migration, base H1.3 migration, Expo Auth client/configuration, admin production guards, installed Next.js Auth/cookies/Route Handler documentation, and the Apple Design and Supabase skills.

The release-blocking gap was reported before implementation: **there is no deployed, verified admin permission resolver or independent website-session admission contract.** B1 establishes local reviewer security, not a general administrator identity or working web authorization system. Consequently the provider remains disconnected, regardless of environment flags or synthetic preview state.

Source review confirmed the following local design, without claiming hosted verification:

| Area | Inspection result |
| --- | --- |
| SECURITY DEFINER | B1 helpers/RPCs use an empty search path and qualified objects. Actor/session authority is server-derived; new helper EXECUTE is revoked from ordinary roles. |
| MFA/session | `privileged_session` checks matching subject, authenticated role, numeric future expiry, AAL2, confirmed user and an owned Auth session with current AAL2 and valid `not_after`. This assumes the gateway has already verified the JWT. |
| Revocation/write admission | `require_reviewer` locks the confirmed user, Auth session, active private reviewer assignment and additional access-management assignment when required. Domain writes retain their authoritative row locks and revision checks. |
| RLS/private files | The five B1 private tables enable RLS and expose no ordinary direct table privileges. Existing application/evidence policies use the strengthened reviewer helper; ownership is not replaced with browser roles. No file adapter was connected. |
| Legacy bypass closure | Both old review/access RPCs lose PUBLIC, anon, authenticated and service-role execution, and their replacement bodies unconditionally reject. Four new public RPCs receive explicit authenticated EXECUTE after revoking default grants. |
| Grant/revoke | Manager approval, reviewer assignment and access-management scope remain different records. No seed or bootstrap assignment exists; client metadata/email/login choice grants nothing. |
| Pause/recovery | B1 review/note writes require submission readiness; investigation reads and scoped suspension/revocation have their documented recovery exceptions. B2's **deployment verification** gate is separate from a manager-submission pause. |

No additional confirmed bypass requiring SQL edits was identified in this source review. Remaining critical gates include actual gateway/Storage/RLS/managed-role behavior, real MFA, concurrent revocation, user-ban handling, independent admin-session admission and explicit capability resolution. This was not a new database execution audit. Both reviewed migration fingerprints remain unchanged:

- H1.3: `6317d6fbc72b819b09d30523029c5f815b5ec6c409785c24ece29aecd89cf8ab`
- B1: `c50aef02608844863200e0188809395eee5f91cee4871743bd3c27d041a73ea0`

## Foundation implemented

### Sign-in presentation

The existing navy/blue palette, local Outfit/Inter fonts, CampusStay brand, rounded card and input/button language are preserved. Auth-scoped CSS improves hierarchy, field alignment, readable spacing, safe-area gutters and enlarged-text wrapping without changing the dashboard stylesheet.

`/sign-in` presents disabled email/password fields and a clear unavailable notice. The safe, whitelisted `view` parameter also provides recovery, MFA, expired-session and sign-out presentation. Recovery navigation and return links work; they do not send email or authenticate anyone. MFA includes a six-digit authenticator input, not fake enrollment. Sign-out does not claim to have ended a remote session.

Reusable presentation supports safe error codes and associated field errors (`aria-invalid`, `aria-describedby`, alert/status semantics). Pure validators handle bounded email/password input and six-digit TOTP syntax; sign-in imposes no new password-creation policy and does not trim passwords. Validation/error states are tested with local fixtures, not wired to credential collection while unavailable.

### Server/browser separation and session preparation

- The only production runtime entry is marked `server-only`; `requireLiveAdmin()` unconditionally denies. There is **no environment switch** that enables live authorization.
- `/auth/[action]` GET/POST handlers return HTTP **503**, `private, no-store`, without reading bodies, callback codes or cookies, creating a provider, setting cookies, redirecting or making network requests. This includes sign-in, recovery, MFA, sign-out, callback and unknown actions. Other unsupported methods remain framework-rejected.
- No Supabase browser client is needed in the proposed same-origin BFF architecture. Presentation receives safe messages only. No token/role storage, native client import, service-role client or secret configuration was added.
- A request-scoped adapter prepares async Next.js `cookies()` integration for future Route Handlers/Server Actions. The pure cookie bridge filters a dedicated `__Host-cs-admin-auth` namespace, including Auth/PKCE chunks, validates batches before writes, preserves expiry/deletion semantics, and forces Secure, HttpOnly, host-only, `/`, SameSite=Lax settings. It is not called by the closed HTTP handlers. HTTPS is required for future real use; loopback HTTP tests do not demonstrate live cookie acceptance.
- Callback parsing permits only the configured HTTPS origin, exact `/auth/callback` path, one bounded code, no fragments, no extra/duplicate query parameters and fixed `/admin` destination. The future SDK remains responsible for PKCE verifier binding, cryptographic validation and single-use exchange. A mock exchange test demonstrates the boundary's response to replay, **not actual Supabase replay protection**. Native Expo confirmation/recovery redirects remain unchanged.
- A pure same-origin JSON POST guard rejects missing/foreign Origin, foreign request origin, cross-site Fetch Metadata, non-JSON submissions and GET mutations. It is preparation for future BFF handlers, not a claim that a full CSRF/rate-limit/session service exists.
- Sign-in, recovery, MFA, callback, sign-out and expiry orchestration use injected server-owned ports only. Successful credential/MFA/callback responses advance to **permission verification**, never administrator access. Recovery acknowledgments do not establish email delivery or reveal account existence. Sign-out clears local artifacts even on provider failure; failures do not claim remote success.

### Independently testable authorization

`authorizeAdmin` calls fresh provider `getUser()` and `getClaims()` ports, then a fresh trusted permission-resolution port. It never authorizes from `getSession()`, an unverified decoded JWT, editable metadata, a browser role flag or the login screen.

Admission requires all of:

1. Explicitly verified hosted-contract policy and a configured HTTPS Auth issuer.
2. Confirmed, valid UUID identity from verified Auth; matching subject/session UUID, issuer, authenticated audience/role, valid issue time and future expiry.
3. AAL2. Missing, AAL1, unknown or malformed assurance is denied.
4. A server-owned version-1 access projection bound to that user/session: `contracts_verified`, `session_active`, independent future absolute/idle expiries and explicit active administrator/reviewer capabilities.
5. The exact requested scope: `workspace:read`, `applications:review` or `access:manage`. Reviewer-only assignments cannot supply access-management authority. Student/manager-only, absent, revoked, malformed or unknown capabilities deny.

The identity reuses H1.5A's `IdentityReferenceV1` through an erased type import, preserving Next/Metro isolation. No shared runtime or mobile authentication code was changed.

`resolveAccess` and its projection are **proposed interfaces**, not existing H1.3/B1 RPC response shapes. They require separately approved server implementation and verification. No `ready` submissions flag is substituted for deployment verification. No actual idle/absolute duration or step-up policy is enabled here.

`withAdminAuthorization` rechecks immediately before each operation; a test revokes a fixture assignment between two operations and confirms the second callback never runs. The callback is a server-owned seam, not a browser-invocable endpoint. Future database operations must also enforce authorization/RLS/locks atomically; this wrapper alone cannot solve transaction races or recall previously delivered bytes. No generic privileged client or CRUD adapter was introduced.

## Compatibility basis

Installed versions remain **Next.js 16.4.2, React 19.2.3, TypeScript 6.0.3**. The root Expo application retains **Supabase JS 2.118.0**. Its installed Auth declarations were checked for `getUser`, `getClaims`, password sign-in, recovery, code exchange, MFA challenge/verification and local sign-out. The new ports use compatible structural method subsets; a future adapter would map `auth.mfa.challengeAndVerify` to the MFA port.

There is still **no Supabase SDK or `@supabase/ssr` installed in admin-web**. This phase prepares ports and cookie boundaries, not a connected SSR client. No package install, manifest change or lockfile change occurred. Pinning and verifying actual admin SDK/SSR versions remains part of the separately approved integration work.

The design follows the installed Next documentation's async-cookie and server authorization guidance and Supabase's [Next.js server-client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [SSR security guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa), and [session guidance](https://supabase.com/docs/guides/auth/sessions). Documentation review is not hosted behavioral evidence.

## Actual final verification

| Check | Result |
| --- | --- |
| Root `npm run typecheck` | Passed |
| Root `npm run lint` | Passed, zero warnings |
| Root `npm run test:all` | **1,032 passed**, zero failures/skips; existing offline/mobile regression suites, no SQL runners |
| Admin `npm run typecheck` | Passed |
| Admin `npm run lint` | Passed, zero warnings |
| Admin `npm test` | **138 passed**, zero failures/skips; **54 new** authentication tests plus 84 preserved tests |
| Admin `npm run build` | Passed; production build, dynamic sign-in and auth routes |
| Admin `npm run test:production` | **23 passed** against the built production app on loopback |
| Admin `npm run test:browser` | **55 passed**; existing synthetic development preview and review safeguards |
| `git diff --check` and task patch check | Passed; pre-existing Git CRLF conversion notices only |
| Preservation snapshot | All **291 starting files present**; index, cloud `.env.local`, both dependency sets/lockfiles and SQL unchanged |

Production browser evidence includes eleven existing `/admin` paths returning **403**, a forged-cookie/header/query case still denied, disabled credential controls, and GET/POST checks on six auth actions returning **503**, without reflected input, Set-Cookie or redirects. All auth views were checked at 320/390/768/1440px widths and 100/200% root text size, including horizontal-overflow and notice-content containment. Keyboard recovery/return navigation passed; loaded client scripts contain none of the tested secret/server-helper markers, and browser storage remains empty. No external browser requests occurred in the auth layout checks.

Eight sign-in screenshots were saved and representative standard/enlarged narrow layouts visually inspected. Existing preview checks cover 100/130/200% text, all six sections, case/property safeguards, notes and local-only behavior. Non-blocking existing preview warnings about illustration aspect-ratio CSS and runner color settings remain; this phase did not change those components.

Evidence is under ignored `.expo/phase-h1-5b2/`: unit/mobile/build/browser logs, eight `screenshots/auth-*.png`, preservation results and `task-only.patch`. These are local synthetic/disabled-UI checks. **No hosted Supabase sign-in, real MFA, email delivery, RLS/Storage execution, iOS/Safari or physical-device verification was performed.** No Android emulator operation was needed or attempted for this separate web foundation.

## Exact source/document files changed

Four existing files modified:

| File | Change |
| --- | --- |
| `admin-web/src/app/sign-in/page.tsx` | Dynamic server page with whitelisted presentation state |
| `admin-web/next.config.mjs` | Private/no-store auth/sign-in headers; existing CSP and guards preserved |
| `admin-web/tests/browser/production.spec.ts` | Eleven new production lock/auth/responsive/browser-boundary checks |
| `admin-web/README.md` | Link and clarify B2 status versus preserved H1.4 inventory |

Twelve files added:

| File | Purpose |
| --- | --- |
| `admin-web/src/components/auth-screen.tsx` | Accessible disabled sign-in/recovery/MFA/session views |
| `admin-web/src/app/sign-in/auth.css` | Scoped CampusStay auth polish |
| `admin-web/src/app/auth/[action]/route.ts` | Closed, non-mutating auth entry points |
| `admin-web/src/lib/auth/model.ts` | Versioned identity alias, scopes, safe messages and validators |
| `admin-web/src/lib/auth/authorization.ts` | Fresh identity/MFA/session/capability checks and operation boundary |
| `admin-web/src/lib/auth/session.ts` | Cookie bridge, callback parser and same-origin mutation guard |
| `admin-web/src/lib/auth/flows.ts` | Disconnected injectable Auth lifecycle primitives |
| `admin-web/src/lib/auth/runtime.server.ts` | Server-only release lock and async cookie bridge preparation |
| `admin-web/tests/auth-boundary.test.ts` | Authorization denial, identity, revocation and validation coverage |
| `admin-web/tests/auth-session.test.ts` | Cookie, callback, origin, readiness, MFA and lifecycle coverage |
| `admin-web/tests/auth-ui.test.tsx` | Rendering, accessibility and boundary checks |
| `docs/phase-h1-5b2-admin-authentication.md` | This implementation/security report |

Ignored task evidence also includes the initial preservation snapshot, before-file copies and a local preservation/patch-generation helper. Those are diagnostic artifacts, not new app configuration. No starting file was deleted. No production guards, dashboard data, mobile screens, SQL, dependencies or credentials were overwritten. No reset, clean, commit or push occurred.

## Gates before any live activation

- Approve the exact admin capability resolver/session-admission contract and scope matrix, including user bans, idle/absolute lifetimes, MFA freshness/step-up, revocation, pause recovery and audited admission. General administrator assignments do not exist simply because B1 reviewer assignments exist.
- Implement/verify those contracts separately, then validate base H1.3 and B1 in an approved isolated staging target. Existing legacy hosted runners require B1 adaptation; do not execute them unchanged.
- Select/pin the admin SDK/SSR adapter; configure approved server-only project identity and HTTPS website origin without importing Expo's native client or using service-role credentials. Allowlist exact web callbacks separately from the native scheme. Define password-reset completion/recovery intent securely; the present recovery screen does not change a password.
- Implement request-scoped refresh and all cookie chunks, timeout/error handling, exact-origin CSRF enforcement, rate limits, PKCE verifier/one-use callback behavior, and non-cached error/refresh paths. Assess CSP nonces, XSS controls, cookie behavior and operational log redaction before real credential entry.
- Test real MFA enrollment/challenge, verified issuer/audience/signature/expiry, deleted/downgraded/revoked sessions, cross-account access, direct-RPC bypasses, Storage/Edge behavior, concurrent authorization changes and recovery. Approve bounded evidence access, audit and data-read projections independently.
- Designate any first trusted operator only through a separately approved, audited UUID-based operation after identity/MFA verification. No automatic first-user, test-account, email allowlist or editable metadata promotion. Both existing test accounts remain untouched.
- Only after evidence passes and explicit activation approval: replace the unconditional release lock, connect approved operations and change the production 403 boundary in a separate reviewed change.

**Next approval:** a scoped isolated integration/contract implementation and testing phase, with its resource and mutation plan stated before any remote action. This delivery requests no deployment, administrator assignment or live login activation. Stopped after H1.5B2.
