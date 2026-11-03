# H1.5B1 — Local backend security extensions

Completed 23 October 2026. **Local source and isolated in-memory tests only. Nothing was deployed, no service started, no real account/permission changed and no live manager submission enabled.** The Admin Dashboard remains disconnected and production access remains HTTP 403.

## Migration strategy and exact fingerprints

H1.3 is undeployed according to project history. Nevertheless, its established hash, deployment reviews and regression runner are preserved by adding a separate forward migration, generated using the existing Supabase CLI **2.121.0** `migration new manager_review_security` command. No migration-history repair, database push, linking or remote SQL operation was used.

Apply neither file under this phase's approval. Future approved deployment order is base then extension, in a restricted target with readiness false:

| File | SHA-256 of reviewed local bytes |
| --- | --- |
| `20261021135040_manager_verification.sql` — unchanged | `6317d6fbc72b819b09d30523029c5f815b5ec6c409785c24ece29aecd89cf8ab` |
| `20261023130036_manager_review_security.sql` — new forward extension | `c50aef02608844863200e0188809395eee5f91cee4871743bd3c27d041a73ea0` |

The extension is transaction wrapped and intentionally not an idempotent migration. It requires the base objects, `auth.jwt()` and the Auth session columns `id`, `user_id`, `aal`, `not_after`. It never changes managed Auth tables/functions, creates identities, seeds reviewer/access assignments, configures MFA factors, changes Storage buckets or enables readiness. It adds an authorization version to existing rows with default **1**, not new authorization grants.

The five H1.5 planning documents now link this update while retaining their original planning evidence. Their legacy descriptions apply to the base migration alone. H1.5A's proposed review remains a pure specification; the actual local extension has its own `manager-review` discriminator and is not silently substituted into the preview adapter.

## Security foundations implemented

1. **Current trusted reviewer admission.** Every new privileged RPC derives the actor from Auth and requires a current active private reviewer assignment. Manager approval, login intent, user metadata, an administrative-looking email, client checkboxes and caller-supplied actor flags grant nothing. Access-management actions require a second, independently assigned private scope as well as reviewer admission. No general administrator role or bootstrap endpoint was introduced.
2. **MFA and session checks on reads and writes.** Existing `is_reviewer()` now requires trusted JWT `aal2`, authenticated role, matching subject, numeric unexpired `exp`, an owned live `session_id`, a confirmed Auth user, and a matching Auth session with current AAL2 and unexpired `not_after` when set. Consequently existing cross-account application/document/history/authorization RLS and private proof policies also require this admission. Owner reads and the ordinary applicant workflow retain H1.3 behavior.
3. **Server-recorded attestations.** A v2 review command requires the exact versioned boolean checklist and expected submitted revision. Approval requires all three confirmations; needs-information/rejection require typed confirmations and meaningful feedback but not checked approval confirmations. The server records the actual reviewer/session, submitted and resulting revisions, exact attached ready proof, decision, reason and attestations. These are reviewer attestations, **not proof that a document is authentic**.
4. **Legacy bypass closure.** Both legacy review and access-change RPCs lose PUBLIC/anon/authenticated/service-role execution. Their bodies also unconditionally reject, so an accidental future EXECUTE grant alone cannot restore unchecked transitions. No UI-only enforcement or unchecked delegate remains.
5. **Transactional revisions and retries.** Review/application, authorization and note writes lock their authoritative rows. A review's expected revision must match a pending application; one decision per submitted revision is enforced by a unique constraint. Same reviewer + same request UUID + identical payload returns the recorded response without creating another grant/audit row. Changed payload/actor conflicts; a new request cannot re-decide an already-decided revision. Replaying an old approval after revocation never re-grants access. Responses are historical operation results, not current permission evidence.
6. **Confidential notes.** Private append-only note history is separate from applicant-visible feedback, public application rows, owner-state responses and public event snapshots. Only current admitted reviewers of another applicant's submitted case can read/write it. Notes accept up to 4,000 Unicode code points, including empty text to clear the current note by appending a revision. Expected application and note revisions prevent stale overwrites. Note writes cannot alter application state or permissions.
7. **Trusted audit.** Domain decisions retain existing server-generated verification events. New private events record decisions, authorization before/after changes, reviewer/access-scope assignment changes and note-revision metadata. Reviewer identity/session/time and relevant revisions are server-derived. Assignment changes record `session_user` operator attribution, including out-of-band bootstrap operations when no application Auth actor exists. Note contents never enter general audit details. Application/grant/decision/audit writes commit together; injected audit failure rolls them back.
8. **Recovery semantics.** All review decisions and note writes require readiness. Authorized note/investigation reads remain available during pause. Scoped suspension/revocation remain possible during pause, still requiring current reviewer scope, MFA/session admission and an expected authorization version. Activation requires readiness. Pause does not bypass authentication, and the existing ready-dependent workspace behavior is unchanged.

## Exact added/changed database contracts

### Five new private tables

| Relation in `campusstay_private` | Purpose |
| --- | --- |
| `access_management_assignments` | Explicit operator-assigned scope for independent manager-access changes; no seeded rows or client DML |
| `manager_review_decisions` | Immutable request/actor/session/submitted revision/proof/checklist/decision/response record; unique request UUID and application/submitted-revision pair |
| `manager_access_decisions` | Immutable request/version/result record for access changes; unique request UUID and user/previous-version pair |
| `manager_review_notes` | Application-bound immutable note revisions with author/session/time and observed application revision |
| `manager_security_events` | Private append-only decision, access, assignment and note-metadata history with actor/operator/target/time |

All five enable RLS and deny ordinary roles and `service_role` direct table/sequence access. They have **no ordinary-client permissive policies**. Narrow security-definer RPCs are the access boundary and explicitly check actor/scope/case; function search paths are empty and relation references qualified. The existing private schema must stay outside exposed Data API schemas. No ordinary private-table SELECT or DML grant was added.

Four append-only triggers reject updates/deletes to decision, access-decision, note and security-event history. Three audit triggers capture reviewer assignments, access assignments and manager authorizations. One authorization-version trigger advances exactly once on updates, including approved operator changes. New FK/actor/history indexes support the lookup and audit paths. A database operator can bypass/drop triggers or truncate data; this is not cryptographic tamper-proofing or protection from a compromised database owner.

### New public RPCs, granted only to `authenticated`

| Signature | Exact command/result and constraints |
| --- | --- |
| `cs_manager_review_v2(p_command jsonb) → jsonb` | Command: `{contract:'manager-review',version:2,request_id,application_id,expected_revision,decision,applicant_reason,checklist:{schema_version:1,applicant,business,authority}}`. No extra/missing keys or actor/MFA fields. Result: `{version:2,request_id,application:<existing H1.3 projection>}`. Current reviewer/AAL2/session, readiness, no self-review, pending exact revision, attached ready same-case proof; approval grant and events atomic |
| `cs_manager_set_authorization_v2(p_command jsonb) → jsonb` | Command: `{version:2,request_id,user_id,expected_version,state,reason}`; state active/suspended/revoked, version >=1. Current reviewer plus access-management scope, AAL2/session, no self-change, approved application/existing authorization. Result: `{version:2,request_id,user_id,state,authorization_version}`. Retry returns its stored result without applying it again |
| `cs_manager_note_write(p_application uuid,p_application_revision integer,p_note_revision integer,p_note text) → jsonb` | Expected note revision starts at 0. Current reviewer/AAL2/session, submitted other case, readiness, current application/note revisions, <=4,000 characters. Result: `{version:1,application_id,note_revision,application_revision}`; no note text or permission claim in write acknowledgment |
| `cs_manager_notes(p_application uuid,p_before_revision integer default null,p_limit integer default 50) → jsonb` | Current reviewer/AAL2/session, submitted other case. Result: `{version:1,application_id,notes:[{note_revision,application_revision,author_id,note,created_at}],next_before_revision}`. Latest page, ascending display order, exclusive earlier-revision cursor; limit 1–100. Available during pause; never owner-readable |

The extension touches 13 function definitions: ten new functions plus replacements of `is_reviewer` and the two rejected legacy functions. New private helpers handle session eligibility, locked reviewer admission, reason validation, immutable history, authority audit and authorization versions. Only the original three boolean/policy helpers retain anon/authenticated EXECUTE; the new private helpers remain uncallable by those roles. The four new RPCs explicitly revoke default PUBLIC/server-role access before the authenticated grant. The prepared proof finalizer and its server-only RPC remain unchanged.

`shared/contracts/v1/review-security.ts` provides matching local command/result/notes-write validators with no SDK, environment reader, transport, Auth client or UI integration. Its implementation metadata explicitly says local SQL/not deployed. SQL remains authoritative. The existing frontend preview's proposed contract and reason function are untouched.

### Reason-policy distinction

The new backend policy is 20–2,000 **Unicode code points**, ASCII-space trimming (matching PostgreSQL `btrim`), NFKC normalization and at least three distinct meaningful alphanumeric words, excluding known placeholders and repeated single characters. The actual shared validator mirrors this policy. The prior admin preview uses JavaScript UTF-16 length and broader JS trimming; that historical UI rule was not silently changed. Ordinary English/French/NFKC/emoji and placeholder parity inputs pass the SQL/shared corpus, but target database collation and all Unicode edge cases remain a hosted compatibility gate. Neither rule establishes truth or evidential sufficiency.

## MFA assumptions, lock ordering and remaining limits

SQL `auth.jwt()` is trustworthy only after Supabase's gateway has validated the token signature, issuer/audience/expiry and populated request claims. SQL does not validate raw JWT cryptography itself. No RPC accepts claims or an arbitrary actor/session as arguments. An attacker with direct trusted database credentials can set request GUCs; database operators are outside this ordinary-client boundary. Test claims are explicitly simulated and cannot prove real MFA enrollment/challenge or gateway validation.

The session column contract was checked against [Supabase Auth's session model](https://github.com/supabase/auth/blob/master/internal/models/sessions.go), its [not-after migration](https://github.com/supabase/auth/blob/master/migrations/20221114143122_add_session_not_after_column.up.sql), [MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa) and [session guidance](https://supabase.com/docs/guides/auth/sessions). These official source references are evidence for the local design, not confirmation of the live project's current catalog.

Mutation lock order is confirmed user → Auth session → reviewer assignment → access-management assignment if needed → readiness if required → application → authorization/note aggregate. Locking queries include the current eligibility predicates so changes committed while a writer waits are rechecked. Decisions take no network/file calls while holding locks. Readiness retains H1.3's shared-row lock. Revocations/deletions serialize with already admitted writes on the same authority rows. The PGlite runner is single-session: **real concurrent ordering, managed-role row-lock permissions, deadlocks and timing still require full PostgreSQL/Supabase tests**. A request admitted before expiry/revocation commits can complete; no claim is made about recalling already delivered evidence bytes.

This slice checks token expiry, session existence/ownership/current AAL and `not_after`. It does not implement independent website privileged-session admission, idle/absolute timeouts, step-up freshness, all Auth service inactivity/timebox configuration, user banning policy or a complete administrative capability hierarchy. No managed table is altered to add these. Those remain explicit integration gates; no proposed 30-minute/8-hour policy was silently enabled.

Required future hosted configuration/evidence: supported Auth catalog/privileges; real TOTP enrollment and challenge for specifically approved reviewers; issued AAL2 JWTs/session IDs with verified gateway settings; session removal/downgrade and stale-JWT tests; private schema non-exposure; actual Storage RLS behavior and Edge JWT compatibility. Enrolling a factor never grants review scope. Both existing real test accounts remain unchanged and receive no automatic permission or MFA assignment.

## Notes/audit retention and recovery

There is no deletion, purge, client overwrite or retention job. Note revisions/decisions/security events are retained; clearing a note adds a blank revision and preserves history. Ordinary clients cannot forge/delete audit rows, change note authorship or edit attestations. Owners cannot access notes even if they later become reviewers of other cases. New session IDs are recorded without a foreign key that would block Auth sign-out/session deletion.

Before production, approve a privacy owner, purpose-based retention period, legal holds, subject-access/redaction procedures, encrypted backup/restore coverage and operational access policy. No statutory duration is invented here. Private events still require a future scoped, paginated admin read projection; no Audit Logs UI is connected. Archive integrity/operator tamper evidence and privileged evidence-access audit are future work. Production durability is **not** established by an ephemeral in-memory database.

The forward migration deliberately closes old reviewer paths. Existing H1.3 hosted/local service runners still expect legacy non-MFA review operations and are **not extension-ready**. Do not run them or interpret earlier hosted-suite plans as B1 acceptance. Adapt their preflight fingerprints, real MFA fixtures and v2 calls under a separate isolated-integration approval. The original offline base runner remains valuable specifically for H1.3 regression compatibility.

Containment through v2 access RPCs remains MFA/scope gated. If no admitted reviewer/operator is available, any break-glass database operation requires its own explicit trusted-operator approval; no client bypass, emergency service-key web route or first-user administrator rule was added. Prefer retaining additive schema/audit and rolling back application code/closing access over restoring the unchecked base RPCs.

## Verification actually performed

| Check | Final result |
| --- | --- |
| `node scripts/check-manager-review-security.cjs` | **143/143** passed, PGlite 0.5.11 / PostgreSQL 18.6, fresh in-memory synthetic Auth/Storage catalogs and simulated claims only |
| `node scripts/check-manager-verification-sql.cjs` | **86/86** existing base checks passed; base migration unchanged |
| New/shared/security contract suites | **53/53** passed (12 new contract/static checks + 41 H1.5A checks), included in full root suite |
| Root `npm run test:all` | **1,032/1,032** passed, zero failed/skipped |
| Admin `npm test` | **84/84** passed, zero failed/skipped; includes actual production Proxy 403 and disconnected-adapter checks |
| Root/admin TypeScript | Both passed |
| Root/admin lint | Both passed with zero warnings |
| Git diff/new-file whitespace and documentation links | Passed |
| Preservation | All 286 starting Git-visible files retained; only the five documented planning updates changed; index, root cloud environment, package manifests/lockfiles, base SQL, Edge, mobile/admin UI and guards unchanged |

SQL scenarios cover unauthorized/self review; missing/AAL1/metadata-forged/expired/malformed/mismatched sessions; unconfirmed identity; RLS/proof reads; checklist/schema/input failures; exact revision/proof binding; optimistic/idempotent decisions; no auto reviewer privilege from approval; private notes and bounded history; confidential data separation; immutable/forgery denials; audit-failure atomic rollback; needs-information/resubmission/rejection; independent scoped access; paused reads/writes/containment; duplicate containment; no self-access change; and current assignment revocation with an existing JWT. They do not claim actual parallel transactions or hosted Auth enforcement.

No UI/runtime imports or dependencies changed, so native exports, browser/device execution, Next builds and Expo Doctor were not rerun in this backend-only phase. H1.5A's browser/export results remain historical. No CLI advisors or hosted queries were run because no service target is authorized; offline catalog/ACL/RLS tests do not replace hosted advisors. No package installation occurred. The installed PGlite test tool remains in its existing ignored tool workspace; these explicit SQL runners are not automatically installed/executed by the current CI.

An initial CLI version/help invocation failed attempting a sandbox-protected telemetry write. Retrying with the project's already documented, process-only telemetry/update-notifier opt-out succeeded. No profile configuration, credentials or installation was changed. The CLI was then used only to create the empty migration source, never to run it.

## Exact files changed

New files:

1. [`supabase/migrations/20261023130036_manager_review_security.sql`](../supabase/migrations/20261023130036_manager_review_security.sql).
2. [`shared/contracts/v1/review-security.ts`](../shared/contracts/v1/review-security.ts).
3. [`scripts/check-manager-review-security.cjs`](../scripts/check-manager-review-security.cjs).
4. [`scripts/manager-review-security.test.cjs`](../scripts/manager-review-security.test.cjs).
5. This report.

Existing files receive only a clearly marked current-status link; historical architecture/test evidence is retained:

6. [`docs/phase-h1-5/README.md`](phase-h1-5/README.md).
7. [`docs/phase-h1-5/contracts.md`](phase-h1-5/contracts.md).
8. [`docs/phase-h1-5/identity-and-admin.md`](phase-h1-5/identity-and-admin.md).
9. [`docs/phase-h1-5/workflows.md`](phase-h1-5/workflows.md).
10. [`docs/phase-h1-5/deployment-and-roadmap.md`](phase-h1-5/deployment-and-roadmap.md).

Ignored logs and byte-preservation manifests are in `.expo/phase-h1-5b1/`. No reset, clean, commit, push, real user/role/data change, cloud operation, Docker/WSL operation or recovery-backup access occurred.

## Decisions and gates requiring separate approval

1. Review/accept the two exact migration fingerprints, v2 reason/attestation/idempotency semantics, reviewer/access-scope split and confidential-note retention/access policy. Neither old service runner is approved for extension testing as-is.
2. Approve an isolated full Supabase runtime/target and, separately, its migration/Edge deployment and synthetic MFA/user/role/file fixtures. Docker recovery/capacity and any cloud resource/spending decisions retain their existing independent boundaries. Never repurpose CampusStay or Mumus Property for tests.
3. Verify real MFA issuance, managed-session lock/read privileges, RLS/Storage/Edge byte isolation, concurrent reviewer/revocation/pause ordering, Unicode/collation parity, effective grants and private schema non-exposure. Keep readiness off except during explicitly approved synthetic tests.
4. Approve the remaining privileged-session/SSR/admin authorization work separately. No browser integration, admin account creation or default-role bootstrap is authorized here. Production routes remain 403.
5. Before any eventual live deployment, approve a fresh read-only inventory, verified Supabase backup/recovery procedure, target-specific artifacts/order and containment plan. Reviewer designation by verified Auth UUID/MFA, readiness activation and administrative route enablement each require their own concrete approval; none follows automatically from deploying SQL.

Stopped after H1.5B1. No deployment or live integration was started.
