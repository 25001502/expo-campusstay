# H1.3 — Manager verification: implementation and deployment review

Prepared 2026-10-21. **Not deployed to the live Supabase project.** The mobile app retains a truthful unavailable state until the server reports that verification is ready. H1.2 Android success reported by the user is preserved as prior evidence, not claimed as H1.3 testing.

**Security follow-up:** [Staging readiness and recovery plan](phase-h1-3-staging-readiness.md) supersedes the original containment/deployment instructions below. The still-undeployed migration now blocks finalization, review decisions and authorization activation while paused; audited suspension/revocation and private reads remain available. The earlier test counts and read-only preflight hash describe their original snapshots.

## What changed

Manager verification now has a server-backed implementation prepared for deployment: personal contact, accommodation details, supporting proof, saved drafts, submission and genuine status display. The form uses CampusStay's existing fonts, colours, Input, Btn, SelectField, Feedback and safe-area/keyboard shell. Upload progress is indeterminate and describes the actual preparation/upload/check stages, not an invented percentage.

The same Supabase Auth client and verified account identity are retained. Student Login remains the default; the separate manager login/register routes, confirmation, recovery and sign-out architecture are preserved. Manager registration copy now describes continuing to verification without promising that submission is already enabled.

The shared verification provider refreshes trusted state on validated session restoration, identity refresh, manager-screen focus, foregrounding, relevant Realtime events and a 15-second foreground fallback poll for existing applications. Unsaved fields survive refreshes; a concurrent saved revision requires an explicit reload before overwrite. Sign-out disposes the old account's controller, clears its sensitive cached state and releases selected proof resources.

Approved Workspace access requires both an approved application and an independent active server assignment. The workspace is disabled during access checks/backgrounding and removed on failed/revoked access checks. The existing ManagerScreen is unchanged; a notice explains that its portfolio data still remains local to the app session. The explicit development preview remains limited to unavailable initial setup with no existing application; pending verification and connection failures cannot silently fall back to it. It remains impossible in production.

## Database migration

File: `supabase/migrations/20261021135040_manager_verification.sql`.

Generated with **Supabase CLI 2.121.0** using `supabase migration new manager_verification`, then authored and tested locally. The migration is transactional and additive. It deliberately fails on conflicting existing object/bucket names and requires Storage RLS already enabled. Remote schema and deployment history remain unverified; perform the preflight before applying it.

| Object | Purpose and access |
| --- | --- |
| `public.manager_verification_applications` | One stable application per Auth user; contact/accommodation fields, declaration, current proof, revision, submission/review timestamps and reason |
| `public.manager_verification_documents` | Owner/application-bound immutable object reservations, filename, MIME, size, server SHA-256 and completion time |
| `public.manager_verification_events` | Append-only history, reviewer/applicant actor, action, reason, revision, proof references and historical application snapshots |
| `public.manager_authorizations` | Independent active/suspended/revoked assignment linked to the same applicant's approved application |
| `campusstay_private.reviewer_assignments` | Trusted server-controlled reviewer assignments; initially empty; no client write/read grants |
| `campusstay_private.verification_configuration` | Contract version and server-only finalizer readiness flag; initially false |

Foreign keys, unique constraints, field/status constraints, ownership consistency, timestamps and review-queue/history indexes are included. One lifetime application is used in this first version; rejected records are read-only and direct users to support. Automatic reapplication/reopening is not implemented.

Application states are `draft`, `pending`, `needs_information`, `approved`, `rejected`. Permission suspension/revocation is separate. Reviewer identity and audit snapshots are recorded on privileged transitions. No user metadata or login destination grants permissions.

### Server contracts

| RPC | Caller / behavior |
| --- | --- |
| `cs_manager_state()` | Verified account; returns version/readiness, own application DTO and independent current access |
| `cs_manager_save_draft(p_fields,p_revision)` | Verified owner; whitelisted editable fields only; optimistic revision; full name derived from Auth display metadata |
| `cs_manager_reserve_proof(p_application,p_revision,p_name,p_mime,p_size)` | Verified owner of editable draft/correction; random safe object name; maximum 10 reservations in a rolling 24 hours |
| `cs_manager_finalize_proof(p_actor,p_document,p_revision,p_sha256)` | **Server credential only**; called after the Edge Function checks actual file bytes; checks owner, Storage metadata and revision again |
| `cs_manager_submit(p_application,p_revision)` | Owner; locked atomic validation/transition to pending; repeated pending submissions return the same record without duplicate audit events |
| `cs_manager_review(p_application,p_revision,p_decision,p_reason)` | Currently assigned verified reviewer only; pending records; cannot review own application; approval creates the independent assignment atomically |
| `cs_manager_set_authorization(p_user,p_state,p_reason)` | Currently assigned reviewer; separate audited activate/suspend/revoke operation; cannot change own permission |

These contracts prepare the separate Admin Dashboard. Its UI is not implemented. An admin website can page the submitted application table using its reviewer's authenticated client and RLS, read related evidence privately, and invoke the narrow review functions. Privileged credentials must never reach its browser bundle or the mobile app.

## RLS and private storage

Public verification tables have RLS and SELECT-only grants for authenticated users. Owners read only their own rows. Trusted reviewers read submitted cases; unsubmitted drafts/evidence are hidden. No client receives direct table INSERT/UPDATE/DELETE privileges or permission to enable readiness, create reviewers or assign management rights. All public RPCs have explicit execution grants. Privileged functions use an empty search path and schema-qualified objects.

The dedicated bucket is **`campusstay-manager-verification`**, private, maximum **5,242,880 bytes**, allowed MIME types exactly PDF/JPEG/PNG. Paths are `<auth UUID>/<application UUID>/<server-generated document UUID>.<canonical extension>`; original filenames are metadata, not object names.

Storage policies:

- `manager_bucket_read` / `manager_bucket_insert` permit narrowly scoped owner/reviewer reads and owner reserved-path uploads.
- `manager_bucket_read_guard`, `manager_bucket_insert_guard`, `manager_bucket_update_guard`, `manager_bucket_delete_guard` are restrictive safeguards against existing broad permissive object policies.
- `manager_bucket_config_update_guard`, `manager_bucket_config_delete_guard`, `manager_bucket_config_insert_guard` prevent unprivileged clients from making this bucket public, replacing its configuration or deleting it, even with unrelated broad bucket policies.
- No client overwrite/upsert or delete is permitted. Old proof stays linked until its replacement is uploaded and server-checked. Historical evidence/audit references remain intact.
- Reservations expire after 24 hours. Turning server readiness off also blocks reserved-path uploads. Interrupted uploads can leave private unreferenced objects; see retention limitations below.

The mobile adapter uses separate `manager-proof-*` transient handles and a bounded RAM upload buffer. It reuses only the generic backup-excluded native staging primitive, not student AttachmentSessions, categories, ownership records or a student bucket. Picker copies/manager staging are released; original user documents are never deleted. No student document implementation or native module was edited.

The `manager-verification-finalize` Edge Function keeps platform JWT validation enabled and independently validates the user with Auth `getUser`. Document lookup/download uses that user's RLS scope. It bounds JSON input, forbids caller-supplied ownership/paths, checks actual PDF/JPEG/PNG signatures and byte size, computes SHA-256 and then invokes the server-only finalization function. Errors are closed codes; private paths, tokens and exception payloads are not logged or returned.

Its server runtime uses `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` or injected `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` or injected `SUPABASE_SERVICE_ROLE_KEY`. None of these server credentials was configured, printed or copied into Expo. The existing Expo environment names and files are unchanged. No public URLs or signed URLs are created.

## Checks and actual evidence

| Check | Result |
| --- | --- |
| `node --test --test-reporter=tap scripts/*.test.cjs` | **942 passed**, zero failed/skipped/cancelled; includes 48 new H1.3 tests and existing auth/manager/student regressions |
| `node scripts/check-manager-verification-sql.cjs` | **64 passed** in PostgreSQL 18.6 via PGlite 0.5.11, entirely local |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| Deno 2.9.6 `check` on Edge entrypoint, SDK pinned to 2.118.0 | Passed |
| Expo development Android/iOS exports | Both passed, approximately 12 MB JS per platform |
| Git diff/whitespace review | Passed; focused task diff provided |
| Live schema/policies/bucket/function changes | **None performed** |
| Live Supabase verification or real evidence upload | **Not tested** |
| H1.3 Android/iOS runtime, keyboard or screen reader | **Not tested**; no emulator reset/install or iOS runtime claimed |

The SQL checks execute real PostgreSQL constraints/functions/RLS with synthetic Auth/Storage catalog fixtures, not a full Supabase service stack. They include cross-account denial, protected-field rejection, self-approval/admin-assignment denial, proof-path isolation, bucket privacy despite broad policies, reviewer draft privacy, atomic/idempotent submissions, corrections/resubmission, audited approval, suspension/revocation and stale reviewer denial. Hosted Storage HTTP semantics, deployed Edge integration and the target database version must still be verified after approval.

Frontend/handler tests cover validation, progress/navigation, draft reload/save errors, proof cancellation/replacement/failure, duplicate taps, status/timestamps, independent access, controller disposal, session-restoration refresh, bounded authenticated file verification, unavailable backend and no silent preview fallback. Android/iOS 320dp layout contracts cover 100/130/200% text with native components stubbed; these are not screenshots or device evidence.

PGlite, CLI and Deno were installed only in `.expo/phase-h1-3/tools`; no application dependencies or lockfile were changed. The mobile TypeScript project remains strict. Deno functions have their own strict config/check and are excluded from Expo's compiler because they run in a different runtime. New JS tests are included by the existing CI test glob; the local SQL/Deno commands are separate explicit checks.

Reproduce the SQL check with `node scripts/check-manager-verification-sql.cjs` after installing PGlite 0.5.11 in that ignored tools folder (or pass its absolute package directory as the first argument). The server typecheck is `.expo/phase-h1-3/tools/node_modules/.bin/deno check --config supabase/functions/deno.jsonc supabase/functions/manager-verification-finalize/index.ts` (use `deno.cmd` in PowerShell). No database URL, Auth token or `.env` is read by the SQL runner.

## Approval boundary and safe deployment procedure

**No command below has been run against the live project. Section 10 of the H1.3 brief explicitly requires user approval first.**

1. Confirm the target project reference and review `supabase/preflight-manager-verification.sql`. With approval, run that read-only preflight and check the existing migration history. Confirm the reported two test accounts still exist; do not export their credentials or personal details.
2. Stop on name collisions, unexpected existing verification data/policies, disabled Storage RLS, missing required Storage columns/roles, or an incompatible target. Confirm `public` is exposed to the Data API, the private schema is not, and hosted JWT/function configuration supports the verified account tokens. Reconcile the migration against actual infrastructure rather than dropping/replacing anything.
3. Capture the project's normal backup/recovery point and current relevant policy/bucket configuration. Prefer an isolated staging project/branch with the same server version and run the full Supabase RLS/Storage integration matrix there before production.
4. After approval for that target, apply **only** `20261021135040_manager_verification.sql` using the project's established migration process. A CLI `db push --dry-run` must list only the reviewed migration before any approved push. Do not run `db reset`, recreate users, apply unrelated pending migrations or alter existing application data. The bucket/policies are part of this transaction. Readiness remains off and no reviewer/manager is assigned.
5. Deploy only `manager-verification-finalize` with the approved project reference and `supabase/config.toml`/import map. Verify its server-only runtime credentials through the platform's secure settings; do not paste secrets into chat, mobile env files or shell command arguments. Leave platform JWT validation enabled. Check missing/invalid JWT denial and fixed responses.
6. After deployment checks, an approved privileged operator may set `campusstay_private.verification_configuration.finalizer_ready=true` for the singleton row. This enables the form only when the private bucket also passes the runtime readiness check. Complete designated-account private upload, server format rejection, draft, submit and cross-account integration tests; disable readiness again if any fail.
7. Reviewer bootstrap is a **separate explicit decision**: designate a verified Auth UUID and record who assigned it and why in the private reviewer table using trusted server administration. There is no hardcoded email or automatic reviewer assignment. Do not silently turn either existing test account into an administrator. A reviewer cannot approve their own manager application.
8. Approvals/rejections and manager grants/revocations must use the audited functions with the designated reviewer's authenticated identity. The mobile app has no admin screen. Enable/verify the two new Realtime tables where supported; foreground/focus/poll reads remain the fallback.

Expected impact on the two existing test accounts: no password, email-confirmation, session, metadata or Auth-user changes; no automatic application, reviewer assignment or manager grant. Both retain existing student access. A confirmed user may create their own draft only after readiness is enabled. A manager submission remains pending until an independently assigned reviewer acts. Existing local portfolio/application/funding data is not migrated into production tables.

### Rollback and operational limitations

- First containment is an approved privileged change setting readiness false. This locks the form/Workspace check and stops new reservations/submissions/uploads without deleting records. Existing private records, evidence and audit history should remain protected.
- Revoke/suspend assignments through the audited function where needed. Reverting mobile code is safe with the additive schema left present; H1.2 would keep production workspace access locked. Do not make the bucket public or drop safeguards during rollback.
- A destructive down migration is intentionally absent. After real submissions, dropping tables/buckets would lose sensitive evidence/history and can be blocked by foreign keys. Any removal needs a separately approved retention/export/Storage-API deletion procedure; do not delete Storage rows directly with SQL.
- Automated evidence retention/orphan cleanup is not implemented. An approved server maintenance job should remove only expired, never-attached reserved objects using Storage's API and retain necessary audit records. Completed/replaced historical proofs need a separately agreed retention policy. No user evidence was deleted in this task.
- Header/MIME/size/hash checks do not establish legal authority and are not malware scanning. Future admin evidence viewers must treat files as untrusted. Human review, retention/deletion procedures, operational monitoring and hosted integration checks remain production rollout work.
- Rejected-case reopening/reapplication, an Admin Dashboard UI, notifications and remote property/room/gallery/funding/tenant persistence are not implemented. Manager Workspace portfolio behavior remains session-local and is labelled accordingly.

## Manual Android verification after approved deployment

1. Before deployment, confirm Student Login → Manager Access → Manager Login remains intact; manager verification must show unavailable with no sensitive fields/upload/submit action. Do not treat H1.2's previous Android results as H1.3 evidence.
2. After readiness is approved/enabled, sign in with the designated manager test account. Verify account name, contact/accommodation steps, owner/authorised-manager selector, keyboard reachability, safe areas, native Back and 100/130/200% text on a narrow phone.
3. Save a partial draft, leave/reopen and restart the app; reopen verification from Profile or Manager Login and confirm the same remote draft/ID/values return. Verify Student Login still reaches student Home and all existing tabs remain available.
4. Use non-sensitive test PDF, JPG and PNG evidence. Check filename and progress, cancellation, replacement, invalid/oversized files, offline/interrupted upload and refresh after uncertain completion. The old proof must remain until a new server-checked one is attached. Never use real identity documents for QA.
5. Submit repeatedly; verify one application, real pending timestamp, read-only pending fields and locked workspace. Sign out and use another account to test application/document isolation with real authenticated requests without logging tokens/paths.
6. With a separately approved reviewer, test needs-information, corrected draft/resubmission, rejection/help and audit history. Approve and verify an independent active assignment is required before Workspace opens. Check the session-local portfolio notice; property management must not claim Supabase persistence.
7. Suspend/revoke while the manager is signed in. Verify Realtime/fallback refresh closes the workspace, background/foreground revalidates, and server operations deny stale reviewer/manager privileges. Repeat sign-out/restore and verify identity caches are cleared.
8. Run equivalent iPhone checks when available. No iOS runtime or live hosted security result is claimed here.

## Exact task files

Application/configuration:

- `App.tsx`
- `tsconfig.json`
- `src/screens/AccountScreens.tsx`
- `src/screens/RegisterScreen.tsx`
- `src/components/ManagerVerificationForm.tsx`
- `src/verification/domain.ts`
- `src/verification/controller.ts`
- `src/verification/api.ts`
- `src/verification/evidence.ts`
- `src/verification/useManagerVerification.ts`

Tests:

- `scripts/auth-journeys.test.cjs`
- `scripts/profile-harness.cjs`
- `scripts/manager-verification.test.cjs`
- `scripts/check-manager-verification-sql.cjs`

Backend/deployment sources:

- `supabase/.gitignore`
- `supabase/config.toml`
- `supabase/preflight-manager-verification.sql`
- `supabase/migrations/20261021135040_manager_verification.sql`
- `supabase/functions/deno.jsonc`
- `supabase/functions/deno.lock`
- `supabase/functions/manager-verification-finalize/index.ts`
- `supabase/functions/manager-verification-finalize/handler.ts`

Report:

- `docs/phase-h1-3-manager-verification.md`

The task-only patch, test logs and preservation proof are in `.expo/phase-h1-3/`. All 169 initial non-environment source files remain, Git staging is unchanged, and unrelated prior changes are preserved. No commit, push, reset, clean, user/document deletion, emulator reset, live migration or remote bucket/policy change was performed.

Compatibility/security references checked: [Supabase changelog](https://supabase.com/changelog), [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control), [object ownership](https://supabase.com/docs/guides/storage/security/ownership), [small uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [RN ArrayBuffer upload](https://supabase.com/docs/reference/javascript/storage-from-upload), [database functions](https://supabase.com/docs/guides/database/functions), [Edge authentication](https://supabase.com/docs/guides/functions/auth), and [PGlite](https://pglite.dev/docs/).
