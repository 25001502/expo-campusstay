# H1.5 — Identity, permissions and administrative authentication

[Plan index](README.md) · [Contracts](contracts.md) · [Workflows](workflows.md) · [Deployment/approvals](deployment-and-roadmap.md)

Everything described as a target control is proposed, not implemented or enabled. Current admin routes continue returning HTTP 403.

**Later local implementation:** [H1.5B1](../phase-h1-5b1-manager-review-security.md) implements the manager-review slice: active private assignment, trusted JWT AAL2/expiry plus owned live Auth-session checks, separate access-management scope and private notes/audit. It does not implement the full capability matrix, admin SSR, independent privileged-session admission/idle limits or hosted verification described below. Production web access remains closed.

## 1. One identity, additive capabilities

Use one existing Supabase Auth UUID per person. Do not register a second account when an existing student chooses the manager journey. Current `AccountController` already shares sign-in/registration and stores student/manager **intent** only in the current JS session. Signup sends `full_name` display metadata, not a role. Separate login forms remain navigation affordances.

An email-confirmed ordinary user can use student features under their own-record policies and submit a manager verification application. Approval through the trusted review operation creates independent manager authorization. Access additionally requires the approved application and current ready state. A user can retain student privileges after manager suspension/revocation, unless a separately authorised account-level containment action disables the whole identity.

Administrative scopes are separate again: a manager cannot administer or moderate by being approved. Recommend a platform administrator capability set, a manager-verification reviewer capability set and a distinct property-moderator capability set. Keep existing private `reviewer_assignments` canonical for manager reviewers, with separately proposed private administrator/property-reviewer assignments. One current effective-capability helper derives the union; do not maintain divergent copied role flags in profiles/JWT metadata.

### Target permission matrix

All cells assume a valid confirmed identity; privileged cells additionally require a current admitted MFA session and scoped server-controlled assignment. “Own” means enforced by database ownership, not a request's supplied user ID. These are proposed permissions, not currently deployed grants.

| Action | Student | Manager applicant | Active approved manager | Suspended/revoked manager | Manager reviewer | Property moderator | Platform administrator |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Student Home / eligible catalogue | Yes | Yes | Yes | Yes | As ordinary user | As ordinary user | As ordinary user |
| Own student applications/documents | Own, future contract | Own | Own | Own | Own only by default | Own only by default | No blanket private-file access; explicit case scope required |
| Own verification status/history/evidence | Own if present | Own | Own | Own | Own separately | Own separately | Own separately |
| Save/submit verification | New or needs-information only, ready | Same | No editing approved case | No silent reopening | Own eligible application only | Own eligible application only | No bypass of applicant state rules |
| Other submitted verification cases/evidence | No | No | No | No | Scoped read/review; never self | No unless separately assigned manager-review scope | Scoped administrative capability; never self-review |
| Approve/reject/request information | No | No | No | No | Manager cases, ready, checklist/reason as applicable | Property cases only | Applicable scoped operations, conflict checks |
| Manual manager reactivation/revocation | No | No | No | No | Not implied by review scope | No | Explicit access-management capability; no self-change |
| Private property draft/edit | No | No | Current allowed property assignment; provisional limited draft workflow | No writes; read access only if explicit retained case policy | No unless independently a permitted manager | Read submitted evidence, not arbitrary applicant drafts | Approved operational scope, audited |
| Trust a property-manager relationship | No | No | Cannot self-certify | No | Global manager approval alone insufficient | Scoped authority review/assignment action | Scoped action, evidence and conflict checks |
| Approve/publish property | No | No | Can submit/request, never set published state | No | No automatic property scope | Separate approval/publish capability | Separate approved capability |
| Private internal review notes | No | No | No | No | Assigned manager cases | Assigned property cases | Scoped need-to-know |
| Search audit/directory | Own allowed feedback only | Own allowed feedback only | Own allowed records | Own allowed records | Scoped manager events, minimal identities | Scoped property events, minimal identities | Approved administrative projection, no secret/account-hash dump |
| Appoint/deactivate admin/reviewer | No | No | No | No | No | No | Initially approved operator procedure only; no self-service role UI |

A reviewer who is also a manager is prohibited from reviewing their own manager application or property they own/manage/benefit from. The backend checks current assignments and recorded ownership interests; switching login UI cannot avoid conflicts. Define legal beneficial-interest handling before claiming comprehensive conflict detection.

## 2. First administrator and reviewer provisioning

This is a future audited operator action, never an automatic first-user rule:

1. The owner approves the specific verified Auth UUID, intended scope, operator and reason/change reference. Identity is checked out of band; an email string alone is not a trust source. Neither existing test account is selected by default. New Auth account creation requires its own approval.
2. Enrol and verify an approved MFA factor on that account. Recommend TOTP initially to avoid assuming paid SMS capability. Record evidence of verified MFA without retaining QR secrets/recovery material in application logs.
3. A separately authenticated Supabase project operator, with platform MFA, uses the approved secure management/SQL channel to create exactly the intended private assignment. No web service-role bootstrap endpoint, user-editable metadata, hardcoded email allowlist, or app client permission is used.
4. Require a second human approval for bootstrap and later administrator/reviewer scope changes. Record exact Auth UUID, old/new scope, operator identity, UTC time, approval reference and reason in proposed private privilege events plus an external protected change record. For the first grant without an assigning application Auth UUID, preserve explicit platform-operator attribution; do not impersonate a user or fabricate an `assigned_by` value.
5. Verify one row/expected effective capability, ordinary-user denial, MFA/session enforcement, self-review denial and emergency deactivation. Keep a separately approved break-glass operator, sealed access and an exercise procedure. An app administrator is not automatically a Supabase organisation Owner/Admin.

Current H1.3 only has `reviewer_assignments`, with nullable `assigned_by`, and no immutable operator-edit audit/MFA enforcement. Those gaps must be closed or explicitly controlled before activation. No assignment was made in H1.5.

## 3. Recommended Next.js SSR/BFF boundary

Use Next.js 16's existing App Router and `src/proxy.ts` convention. Add compatible, pinned `@supabase/ssr` and Supabase JS dependencies **only in an approved implementation phase**, after peer/version review. There is no such web client installed today. Installed Next guides confirm async `cookies()`, cookie mutation in writable server contexts, and authorization at the data access layer plus each Server Action/Route Handler.

Recommended design is a **server-only Auth/BFF variant**: the browser posts sign-in/MFA/sign-out to same-origin handlers; no browser Supabase data client or Auth token is needed. Create a request-scoped `createServerClient` with `getAll`/`setAll` cookie adapters. Keep tokens in secure host-only cookies, HttpOnly for this server-only variant, Secure in deployed HTTPS and SameSite=Lax with explicit CSRF protection. Process all cookie chunks, rotation and deletion correctly. Never store a user-specific client in module/global scope. This is a deliberate BFF proposal, not the default browser-client SSR example: if a browser Auth client is introduced later, its cookie/token requirements need a separate review. [Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/nextjs), [advanced SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Proxy refreshes expiring sessions, updates the request cookie view and passes all refreshed cookies/security/cache headers to the response. Do not let redirects, rewrites or error responses lose `Set-Cookie`. The request-scoped DAL independently verifies identity, MFA, current assignment/scope and session admission for every protected page/data query/action. Proxy or a shared layout alone is not authorization. Client navigation, prefetched React Server Component payloads, direct API POSTs and Server Actions receive the same checks.

### Proposed route/security behaviour

| Entry | Required handling |
| --- | --- |
| Current `/admin/**` | Unchanged 403; no current session/role integration |
| Future `/sign-in` + same-origin sign-in handler | Generic credential errors/rate limits, no registration/self-role creation, validated local return destination; no admin data before capability/MFA |
| Future MFA challenge/enrol handlers | Valid Auth identity, approved assignment eligibility, anti-CSRF and real Auth factor verification; no role from factor enrollment itself |
| Future `/auth/callback` | Exact approved HTTPS origin/allowlist, PKCE code exchange, same browser verifier, one-use replay handling; no arbitrary external `next` redirect |
| Future `/admin/**` page/data | Confirmed identity, live privileged session/AAL2, exact current capability/scope, deployment/readiness checks; unauthenticated redirect only to fixed sign-in, authenticated unauthorised 403 |
| Future `/api/admin/**` and Server Actions | Repeat guard on every call, POST-only state changes, CSRF/origin/body/schema/ID/version validation, RLS/user-JWT operation, no fallback fixtures |
| Future private media route | Repeat scope/identity/parent-record guard, stream no-store bytes, attachment by default, nosniff; no arbitrary URL/path proxy |
| Future sign-out | Same-origin POST; revoke current privileged admission, call Auth local-session sign-out and clear chunks/UI state. Do not sign out all student/mobile sessions implicitly |

All sensitive responses, errors, callbacks, session refreshes, RSC/prefetch and media return `Cache-Control: private, no-store`; avoid ISR, `use cache`, shared fetch caching and CDN session caching. Validate actual hosting cache behaviour, not just response headers. Do not cache or log bearer tokens, cookie values, passwords, MFA material, document contents or signed URLs. Cookie deletion/expiry alone is not permission revocation.

Validate the configured project/issuer and allowed audience/signing algorithm through supported Auth/JWT verification, never an unverified decoded token. Each deployment has an explicit target allowlist; tests must not inherit root cloud dotenv, management tokens or an arbitrary request-supplied Supabase URL. Web auth uses its own exact HTTPS callback; the existing native callbacks remain `campusstay://auth/confirm` and `campusstay://auth/recovery`. Domain/redirect changes require separate approval and must not break mobile PKCE recovery. Same Auth identity does not mean sharing cookies between the website and native app.

The current CSP has `form-action 'none'`, `connect-src 'self'`, `object-src 'none'` and inline framework scripts. A reviewed implementation must explicitly permit same-origin form submission, retain a server-only network model, and plan nonce-based scripts/appropriate PDF sandboxing rather than broadly relaxing CSP or adding wildcard Supabase origins. Private Next images must not pass through a shared unauthenticated image optimiser/cache: use authenticated same-origin delivery with unoptimised browser loading or an explicitly protected transform path.

## 4. Session restoration, MFA and immediate role revocation

Validate signed JWT identity and current Auth user; do not authorize from `getSession()`'s cached embedded user. Signature/expiry validation and current user/assignment lookup answer different questions. `getClaims()` is useful for verified claims/refresh, while `getUser()` obtains current Auth user information; neither a frontend context nor an old JWT role claim substitutes for current database authorization. [Supabase auth-method guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework).

Target privileged admission requires `aal2` from a trusted, validated Supabase JWT and an active private capability assignment. Enforce it in privileged database helpers/RLS/Storage gates as well as the BFF, so direct Data API calls with an AAL1 token cannot bypass the website. MFA metadata in `user_metadata` or a supplied `mfa=true` is never accepted. [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).

Proposed private session admission links the verified signed `session_id` and user UUID to server-generated admission, MFA freshness, idle/absolute expiry and revocation. Check the actual target Auth session-liveness contract/catalog before referencing managed columns; do not alter Auth's managed schema or assume JWT validity proves that its session still exists. Current H1.3 does not implement admission/session-liveness checks. Suggested limits for approval: 30-minute idle, 8-hour absolute session, 15-minute step-up freshness for access changes and sensitive evidence access. These are policy proposals, not service defaults or measured guarantees.

On each privileged operation, reread current active assignment/capability and non-revoked session admission inside the authoritative database boundary. Use version/row locking where a concurrent revocation could otherwise race a mutation. Deactivation must deny subsequent operations with the same unexpired JWT; do not wait for JWT refresh. Fail closed on Auth/authorization lookup failure and clear protected client projections. Already delivered bytes and requests admitted before a revocation transaction commits cannot be recalled; define and test that boundary.

On mobile retain existing native SecureStore chunking and validated restoration. The verification provider already resets on identity, revalidates on focus/foreground, uses Realtime invalidation and a 15-second fallback, removes old access on refresh failure, and blocks workspace interaction while backgrounded/revalidating. These improve UX but do not secure future remote writes. Every manager write still needs current database checks. Realtime is an invalidation hint, not an authority or guaranteed deadline.

## 5. Threat controls to make testable

| Threat | Required control / negative test |
| --- | --- |
| Self-grant via login, profile or JWT metadata | Private assignments, no self-DML, no trusting requested role/email; test forged metadata with ordinary JWT |
| Website-only checklist/MFA | Harden direct RPC/RLS/Storage paths; invoke legacy/direct endpoints to prove denial |
| Service-role confused deputy | Next uses user JWT for reviews; no arbitrary actor/path/target URLs; Edge derives finalizer actor from verified user, not JSON |
| IDOR / cross-property access | Scope IDs in queries, same-parent composite FKs, parent/child eligibility on every route; indistinguishable inaccessible/missing 404 where appropriate |
| Session/cache cross-user leak | Request-scoped clients, no-store all protected responses, correct cookie refresh, no shared auth fetch cache; two-browser-user tests |
| CSRF / open redirects | Same-origin POST, validated Origin/Host with trusted-proxy rules, anti-CSRF token; fixed/relative allowlisted return targets; SameSite alone insufficient |
| Stolen/stale session or demoted reviewer | Current capability/session check and database admission revocation; replay old JWT and already-open detail/modal |
| Reviewer acting on own interests | Database self/assignment conflicts, not hidden buttons; record denials privately without revealing other applicants |
| Overbroad directory/admin privileges | Minimal scoped projections, default no student private-document read, no generic Auth Admin endpoint |
| Key leakage / XSS / log disclosure | No secrets in `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*`, server-only imports, sanitized errors, bundle/log checks, CSP and no raw HTML notes |

Identity, operational scopes, cookie variant, timeout limits and first-operator choices are explicitly approval decisions in the roadmap. No authentication logic was changed in this phase.
