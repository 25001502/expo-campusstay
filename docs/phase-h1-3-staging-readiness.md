# H1.3 — staging readiness, pause controls and recovery

Prepared 2026-10-21. **Local changes only. No live or staging project was changed or created. Remote testing, backup creation/restoration and deployment remain unapproved and unperformed.**

Basis: [read-only preflight](phase-h1-3-read-only-preflight.md). Its live catalog findings remain historical evidence, not a fresh remote check in this task. The original migration hash is superseded by the local security changes below. There are still six tables, fourteen functions, thirteen RLS/Storage policies and no automatic reviewer/manager seeds. No frontend, authentication flow, dependency, Expo or native configuration was changed.

## Findings and local fixes

| Finding | Resolution |
| --- | --- |
| A trusted reviewer could change a pending decision and grant manager authorization while readiness was off | All review decisions now require readiness; paused requests cannot approve, reject or request information |
| The server-only proof RPC could attach an already uploaded reservation during a pause | Finalization now requires readiness in SQL, including private-bucket contract checks. The Edge handler also checks readiness before document lookup/download; SQL remains authoritative if a pause occurs later |
| A trusted reviewer could reactivate access during containment | `active` requires readiness. `suspended` / `revoked` retain existing reviewer, ownership, approved-application, reason and audit checks and remain usable while paused |
| Disabling readiness could race already admitted workflow RPC writes | The readiness helper holds a shared configuration-row lock until transaction completion. The operator's pause UPDATE waits for admitted RPCs. Requests admitted after the pause commits fail. Hosted two-session verification remains required |
| Browser error/preflight headers were incomplete | Finalizer/setup responses share CORS/no-store headers; POST/OPTIONS are explicit and allowed headers match the pinned SDK, including retry and tracing headers. Unconfigured OPTIONS can return 204 without creating a client; JWT checking is unchanged |

The existing, **never-deployed** migration was refined in place, not replayed or applied remotely. Its current SHA-256 is **`6317d6fbc72b819b09d30523029c5f815b5ec6c409785c24ece29aecd89cf8ab`**. Re-review this hash rather than approving the preflight's older `4f920f…` snapshot. Any evidence of this migration having been applied elsewhere requires stopping and preparing a separate forward migration; do not rewrite applied history.

### Exact readiness-off contract

| Operation | Readiness off |
| --- | --- |
| Read own state/status, records and existing private proof | Allowed under unchanged identity/RLS ownership checks |
| Trusted reviewer reads of submitted cases/evidence | Allowed for investigation and recovery; never makes the bucket public |
| Draft save, proof reservation, new reserved-path upload, submission/retry | Denied |
| Edge document lookup/download/finalization | Authenticated paused caller receives closed 503 `unavailable` before document lookup. Unreadable state fails closed. SQL also rejects late finalization with 55000 |
| Direct service-role finalization through the supplied RPC | Denied with 55000; cannot bypass the pause merely by using a server credential |
| Reviewer approved / needs_information / rejected decision | Denied with 55000; no decision, grant, revision or audit mutation |
| Manager authorization activation/reactivation | Denied with 55000 |
| Manager authorization suspension/revocation | Allowed only through existing trusted, attributed/audited review operation |
| Private readiness changes / reviewer deactivation by an approved operator | Remain trusted administration, unavailable to app clients |

The helper is identity-independent so the finalizer can use it with its server credential; public functions retain their own user/reviewer checks. It fails closed on missing configuration or incorrect bucket privacy/limits/MIME types. No new client EXECUTE, DML or role grant was added.

**Limits:** a pause is not a rollback or cancellation of already completed work. In-progress Storage HTTP uploads can leave private reserved objects after a pause; they cannot subsequently become attached proof through the finalizer until readiness is restored. Existing reads are deliberately retained. Privileged database owners/server credentials remain trusted and can write tables directly; this is not protection against a compromised administrator. Native workspace UI revalidation is asynchronous; the pause does not introduce a new immediate client push channel. Always pause and wait for commit before bucket/configuration maintenance. Orphan cleanup and retention remain separate approved work.

## Isolated staging resources

**Recommended:** a fresh, independent Supabase project named **CampusStay-H13-Staging**, in `eu-west-1`, with no imported live accounts or evidence. It needs PostgreSQL **17.11** / compatible hosted build, Auth, private Storage, Data API, one Edge Function and the existing two-table Realtime publication setup. The runner deliberately refuses a different PostgreSQL patch until compatibility is reviewed. Provisioning does not guarantee that the provider will offer that older patch; if unavailable, stop and agree a supported matching test route/version-difference assessment. Do not upgrade the live database to make staging match.

Use a project reference, publishable/server keys, Auth identities and management authorization distinct from live. Prefer staging-scoped credentials where the account plan supports them. Keep all privileged values outside Expo and ordinary CI. No production link, clone, automatic branch merge, production email recipients, webhooks or cross-project data import is required for functional staging.

Configure on staging only:

- Public Data API schema; exclude `campusstay_private`. Preserve explicit grants/RLS. New projects have stricter defaults: [Supabase's exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) makes grants necessary. The migration already explicitly grants the authenticated reads and RPC execution it needs; do not restore blanket defaults.
- A single private `campusstay-manager-verification` bucket with 5,242,880-byte limit and PDF/JPEG/PNG only, created by the reviewed migration with its policies.
- Deploy only `manager-verification-finalize`; `verify_jwt=true`. Safely verify injected server runtime keys without printing them. No service credential in any mobile build.
- Keep confirmation enabled. The automated synthetic suite uses confirmed QA users created by the Admin API, not disabled confirmation. Separately test actual confirmation/recovery emails through an approved test mailbox/SMTP sandbox; those tests are not replaced by the Admin API fixture.
- Existing app callbacks are `campusstay://auth/confirm` and `campusstay://auth/recovery`; do not change live allowlists. A future side-by-side staging native build should have a distinct app ID and scheme with matching app code and staging redirect allowlist, under separate approval. For the first API suite no native build/config change is needed. Never overwrite the live `.env` to run it.
- Four synthetic QA identities in total: a dedicated expired-token fixture, then three generated student/manager/reviewer identities. No real student files. PDF/JPEG fixtures exercise signatures, not document rendering, legal validation or malware scanning.

Before producing an expired fixture, designate its synthetic identity explicitly. Obtain a real staging session, verify it while valid, retain the token securely with its expiry and a non-secret evidence fingerprint, and wait until expired. Leave that identity in staging. The runner permits at most that one exact fixture Auth UUID initially, and requires all application/evidence/reviewer state empty; it then creates three new random identities. It independently verifies the expired token's ES256/RS256 signature against staging's public JWKS before counting its rejection as expiry evidence. Use staging asymmetric signing keys; unsupported/rotated-away keys fail closed, not as a passing expiry test. No live signing-key change or Auth identity deletion is required or performed.

### Indicative costs — USD, checked 2026-10-21

| Choice | Estimate, not authorization |
| --- | --- |
| Eligible spare Free project | $0 within quota; Free currently allows two active projects and may pause after inactivity |
| Additional Micro project in an already paid organization | From about $10/month compute, billed hourly, before usage/tax |
| Separate new Pro organization for staging | From $25/month including one Micro-equivalent compute credit; avoids changing live's subscription |
| Temporary separate recovery target | Another project/compute allocation; budget an additional approximately $10/month at Micro, prorated while active, subject to actual restore size |
| Optional PITR | Listed from $100/month per seven days of retention, plus eligible plan/compute costs; not required or enabled by this task |

Prices, credits, quotas, usage and taxes must be confirmed before purchase. See [official pricing](https://supabase.com/pricing). No paid plan, add-on, project, branch or backup storage was purchased. Choose and approve a cost ceiling before provisioning. Provider-matched versions and account quota remain unresolved until approval/provisioning.

## Prepared hosted integration suite

`scripts/run-manager-verification-hosted.cjs` is **offline by default**. `--plan` prints its scenarios and makes no requests. `--run` mutates only an explicitly approved isolated target; it rejects the live reference, mismatched URL/reference, missing credentials/opt-in, nonempty application state, unexpected Auth accounts, wrong PostgreSQL patch, enabled readiness or an unhardened finalizer. It does not create a cloud project, deploy, read the app `.env`, delete data or assign a live role.

The opt-in is an accidental-execution guard, **not human authorization**. Run it only after the user approves the exact staging reference and actions. A valid configuration alone is not approval.

Required private environment names (values must never be printed):

```text
H13_STAGING_REF
H13_APPROVED_STAGING_REF
H13_STAGING_URL
H13_ALLOW_STAGING_MUTATIONS=I_APPROVE_ISOLATED_H13_TESTS
H13_STAGING_PUBLISHABLE_KEY
H13_STAGING_SERVER_KEY
H13_STAGING_MANAGEMENT_TOKEN
H13_STAGING_EXPIRED_JWT
```

Store the private file only in an approved ignored/restricted location, for example `.expo/phase-h1-3/staging.env`. Node's explicit `--env-file` is used only for this future runner; no file was created or loaded here. CLI deployment uses its own securely supplied credentials. The runner calls the documented [Management SQL API](https://supabase.com/docs/reference/api/v1-run-a-query) with bound parameters for staging controls. That endpoint is beta: unexpected output or errors stop the suite, without printing raw responses or retrying mutations.

| Coverage | Expected hosted evidence |
| --- | --- |
| Student versus manager | Both start without Workspace authorization even with forged user metadata; login intent grants no role. A confirmed student may deliberately apply to become a manager, but cannot approve themselves |
| RLS isolation | Other account sees no populated application/proof/history/authorization rows; cross-owner submit fails; direct approval/private assignment writes fail |
| Private Storage | Real authenticated PDF/PNG/JPEG signature-fixture uploads, exact owner downloads, anonymous/public/cross-owner denial; no overwrite/delete mutation |
| Finalizer | Wrong signature 422, cross-owner 403, valid owner proof attached only after actual Edge response and authoritative state reload |
| Pause | Reserved uploads, Edge and direct server finalization, submit and all reviewer decisions fail; compare before/after data and audit snapshots |
| Duplicate submit | Concurrent same-revision requests yield the same pending application/revision and exactly one initial submitted event |
| Reviewer/self-approval | Ordinary student/manager calls fail; an assigned reviewer cannot approve their own genuine pending case |
| Review journey | Needs information → correction → resubmit → approval retains one application; access requires approved status plus independent active authorization |
| Revocation/recovery | Paused activation denied, suspension/revocation succeed; reopening readiness does not undo revocation; trusted reactivation works only after reopening; deactivated reviewer loses cross-owner reads/operations with their old JWT |
| JWT/CORS | Hosted config still verifies JWT; missing/invalid/real expired/API-key-only requests rejected; browser OPTIONS POST and tracing headers accepted |

The suite records only fixed case labels/counts, not credentials, addresses, private paths, exception payloads or account details. It attempts to leave readiness false in `finally` after adopting the empty target. If that request fails (network loss, terminated process), stop and explicitly disable staging readiness; do not assume cleanup succeeded. It retains all synthetic identities, documents and history for inspection. It refuses rerun on the resulting nonempty state; any cleanup or fresh project requires another approved action, not a reset loop.

Additional required manual/staging checks: real browser CORS response visibility, actual mobile student/manager routes and private file selection, unconfirmed valid-session denial, unsupported MIME/size/reservation expiry limits, optimistic revision conflicts, Realtime/fallback revocation timing, and the transaction ordering test below. API/Node tests do not prove native execution.

### Two-session pause ordering test

On synthetic staging only, prepare a pending application, a verified reviewer and enabled readiness. Session A starts a transaction, calls the real review RPC with that reviewer's Auth identity, then holds the transaction briefly open. Session B runs the readiness=false UPDATE with a bounded lock timeout. Verify B waits for A to commit; after B commits, every new review/finalize/activation RPC is denied. Reverse the ordering and verify the workflow RPC sees disabled readiness and makes no writes. Repeat an upload already in progress and verify that any retained private object cannot be finalized/attached while paused. Record transaction outcomes, times and counts only; no JWTs/files. Do not describe the shared-row lock's local syntax test as proof of hosted concurrency behavior.

## Verifiable live backup and recovery procedure — not executed

The preflight reported **no backup**. A backup gate passes only after a restore drill, not after files are created. Assign an operator, encrypted/restricted destination, retention/access policy, maintenance window, recovery-point objective and recovery-time objective. Proposed initial objectives for approval: a consistent checkpoint immediately before deployment and a one-hour recovery target demonstrated by the drill; these are goals, not measured guarantees. Stop if existing secure DB access is unavailable; do not reset live passwords to obtain it.

**Preferred managed route:** approve an eligible paid backup option separately, wait for a completed physical backup, record its UTC checkpoint/ID/retention, and restore it to a new restricted **CampusStay-H13-Recovery** project. Confirm scope/cost beforehand. The provider route carries database/Auth data and its encryption root key, but external services need separate recovery. Review cron/webhooks/extensions before cloning: a physical clone can start external jobs immediately. See [restore-to-new-project documentation](https://supabase.com/docs/guides/platform/clone-project). Do not use that account-containing recovery copy for the synthetic hosted suite.

**Logical route if staying on Free:** install approved PostgreSQL 17 backup/restore tooling (psql and pg_dump were not found here). Use an existing approved secure source connection, not a CLI login flow that could create a just-in-time remote database role. Native pg_dump creates a consistent custom archive, including readable Auth data, for selective recovery; a default Supabase schema dump excludes managed schemas and is insufficient evidence of account coverage. See [PostgreSQL pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [Supabase backup/restore considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) and [CLI dump exclusions](https://supabase.com/docs/reference/cli/supabase-db-dump). Review managed-schema compatibility and encrypted-column/root-key handling privately; if those cannot be recovered, the backup gate fails. Do not reset source credentials or create new source roles to get access.

Read-only export commands below require separate approval because they copy sensitive live account records to an external backup destination. They are **plans, not commands executed here**. Use a fresh encrypted `$taskBackupRoot` outside the repository/sync folders. The restricted libpq service `h13-live-backup` must point to the existing live database with verified TLS and existing approved credentials, never passwords in command arguments. See [connection service files](https://www.postgresql.org/docs/17/libpq-pgservice.html). No service file was created or loaded here.

```powershell
# taskBackupRoot must be an approved fresh encrypted/restricted absolute directory.
pg_dump --dbname 'service=h13-live-backup' --format=custom --file "$taskBackupRoot\database.dump"
pg_dumpall --dbname 'service=h13-live-backup' --roles-only --no-role-passwords --file "$taskBackupRoot\roles.sql"
pg_restore --list --file "$taskBackupRoot\archive-toc.list" "$taskBackupRoot\database.dump"
```

Check each exit code/warning before continuing; permission-denied or incomplete coverage fails the gate. Inspect the archive privately and verify Auth users, identities and related records are included. Capture source-role definitions without role passwords ([pg_dumpall](https://www.postgresql.org/docs/17/app-pg-dumpall.html)); custom login credentials, if any, need separate secret-manager recovery. Build a reviewed table-of-contents/restore manifest selecting **one source per table**. Never replay the entire managed-schema archive over a fresh Supabase project: select required Auth data/custom application objects, exclude managed schema-migration rows/DDL and external jobs, and review role/grant compatibility. Preserve application migration history only if present (absent in the preflight). Capture policy/grant/bucket/publication configuration, Auth/redirect/provider settings, extension/service versions, Edge source/import map/lock and secret *names*. Required secret values stay in an approved secrets manager. Account hashes, sessions and archives are sensitive; custom-format compression is not encryption. Restrict/encrypt before off-site transfer and record checksums, byte counts and UTC times. No dump was produced here.

Database backups do **not** include Storage file bytes. Export private objects separately through a trusted Storage API process with an encrypted path/hash manifest; verify restored bytes and owner mapping. The last inventory had no objects, but recheck rather than assuming that remains true. Recreate/verify private bucket policies and settings before exposing restored evidence. [Database backup scope](https://supabase.com/docs/guides/platform/backups).

For a logical drill, provision a new restricted recovery target on matching managed schema versions. Apply the reviewed role/schema/data manifest in a single error-stopping restore transaction, with explicit target connection service configuration. Restore-only trigger suppression, where required by the official Auth encryption procedure, must be confined to that transaction and reset before validation. Example execution shape after the manifest has been reviewed:

```powershell
# h13-recovery must point ONLY to the separately approved new recovery project.
# reviewed.list is a reviewed selection from the archive TOC, not supplied here.
pg_restore --no-owner --use-list "$taskBackupRoot\reviewed.list" --file "$taskBackupRoot\restore-reviewed.sql" "$taskBackupRoot\database.dump"
# restore-reviewed.sql must be privately checked together with any needed
# custom-role, ACL and encrypted-data steps before executing it on recovery.
psql -X --dbname 'service=h13-recovery' --single-transaction --set ON_ERROR_STOP=1 --file "$taskBackupRoot\restore-reviewed.sql"
```

This is not yet an executable, verified recovery package: secure connection setup, dump coverage, role compatibility and managed encrypted data handling require the actual authorized export/drill. Never replay raw managed Auth/Storage DDL, duplicate schema-migration rows or change source managed ownership to get past an error. A failed restore remains an explicit deployment blocker.

**Drill acceptance evidence:** capture source checkpoint counts and non-disclosing digests; restore both Auth user UUIDs, identities/confirmation state and necessary related records; verify password-hash/metadata equivalence with private aggregate checks without displaying them. Obtain separately approved test-account login checks against recovery if needed; they create recovery sessions, not live changes. Verify zero unintended role assignments, table/FK/RLS/ACL/index/publication parity, private object hashes/owner mapping, function configuration and known secret-name availability. Disable outgoing emails/webhooks/jobs in recovery through an approved isolation procedure. Record elapsed restore/validation time and resulting RPO/RTO. Never point production at the recovery project or issue new passwords/sign-in messages implicitly.

Recovery order after a later deployment incident: contain with readiness=false and wait for commit; retain reads and audited revocation; pause/restrict the finalizer separately if necessary; preserve logs/private evidence. Prefer reverting app/function code with secured additive schema retained. A database restore, changing live connection targets, deleting objects/users or dropping verification tables can lose post-checkpoint data and needs its own explicit incident approval. No destructive down migration or automatic cleanup was added.

## First trusted administrator/reviewer

The application reviewer is distinct from a Supabase organization Owner/Admin. Designate a human reviewer through an explicit approval naming the verified Auth UUID and scope, verify identity out of band, use an account with MFA, and separately approve any new Auth account. Neither existing live test user is selected automatically. No email string or user-editable role metadata is a trust source.

An approved platform operator inserts only a private reviewer assignment, not a manager authorization. Use a parameterized query via the trusted management/SQL channel, check exactly one inserted row and retain the approval/operator record. A bootstrap without a corresponding assigning Auth user may use nullable `assigned_by`; record that platform operator externally. The schema does not itself enforce MFA or immutable auditing of operator edits, so those operational controls remain explicit gates.

```sql
-- Approved target only; parameters supplied securely, not literal emails.
insert into campusstay_private.reviewer_assignments(user_id,assigned_by,reason)
select u.id,$2::uuid,$3::text
from auth.users u
where u.id=$1::uuid and u.email_confirmed_at is not null
  and not exists(select 1 from campusstay_private.reviewer_assignments)
returning user_id,assigned_at;
```

For the first assignment, `$1` is the approved verified reviewer, `$2` is an approved assigning Auth UUID or null for platform bootstrap, `$3` records the approval and reason. No ON CONFLICT overwrite or automatic self-assignment. This reviewer cannot review their own manager application or activate their own manager permission. Additional reviewer appointment/removal remains separately approved private administration; reviewers do not gain an app RPC to appoint reviewers. Deactivation must remove current authorization even with an existing JWT. Retain a secure recovery operator so suspension/revocation does not depend on an unavailable review UI.

## Exact actions awaiting approval

No row below is authorized merely by the local-work request.

| Approval | Exact scope / action |
| --- | --- |
| S1 — resource/budget | Create the fresh CampusStay-H13-Staging project through the Dashboard, `eu-west-1`, agreed plan/cost ceiling and verified PostgreSQL 17.11 compatibility; no clone of live accounts. Dashboard entry keeps the generated database password out of shell arguments |
| S2 — staging deployment | Approve the resulting exact reference. Read-only preflight; then the explicit-ref dry run and migration/one-function deploy below; no role/seed/prune/Vault updates |
| S3 — staging fixtures/tests | Configure staging-only keys/Auth redirects/mail sandbox; create the expired-token synthetic identity and prepare its genuine session fixture; run the guarded suite, which creates three additional synthetic identities, proof rows/files, one staging reviewer assignment, decisions, grants/revocations and readiness transitions. It finally disables readiness and retains data |
| B1 — backup/export | Approve secure source connection, encrypted backup destination/operator, sensitive Auth export scope and retention; run the reviewed read-only backup commands. No source password reset |
| B2 — recovery resources/drill | Approve any backup-plan purchase, separate recovery target/cost and copying the two existing Auth accounts/necessary encrypted data there; execute the reviewed restore manifest and validations. No source restore or cutover |
| L1 — eventual live deployment | A separate future decision after staging and recovery gates. Recheck catalog, migration hash and backups; deploy only reviewed artifacts with readiness false |
| L2 — live reviewer | Separate explicit verified-UUID designation/private assignment; no default use of either test account |
| L3 — live activation | Separate explicit global readiness activation only after all gates; deployment alone never authorizes enabling submissions |
| Cleanup/incident | Any deletion, project teardown, restoration over live, live-role change or key rotation needs its own concrete approval. None is automated here |

S2 command plan, after S1 returns a real reference and approval names it:

```powershell
$taskSupabaseCli = '.\.expo\phase-h1-3\tools\node_modules\.bin\supabase.cmd'
# taskStagingRef must equal the newly approved staging reference, never the live ref.
& $taskSupabaseCli db query --project-ref $taskStagingRef --file supabase/preflight-manager-verification.sql
& $taskSupabaseCli db push --project-ref $taskStagingRef --skip-vault --dry-run
# STOP unless the dry run lists ONLY 20261021135040_manager_verification.sql.
& $taskSupabaseCli db push --project-ref $taskStagingRef --skip-vault
& $taskSupabaseCli functions deploy manager-verification-finalize --project-ref $taskStagingRef --use-api --import-map supabase/functions/deno.jsonc
```

No `--no-verify-jwt`, `--prune`, `--include-all`, role/seed inclusion, `db reset`, broad config push, migration-history repair or live link. Confirm every exit code/target before the next step. These commands are not an instruction to run them before approval.

```powershell
# Safe now: offline scenario list only.
node scripts/run-manager-verification-hosted.cjs --plan
# S3 approval required; private staging.env must already be supplied securely.
node --env-file=.expo/phase-h1-3/staging.env scripts/run-manager-verification-hosted.cjs --run
```

## Deployment-readiness checklist

- [x] Inspect old preflight/current implementation and preserve existing work.
- [x] Locally gate finalization, review decisions and activation; preserve audited suspension/revocation and private recovery reads.
- [x] Local SQL/handler tests for paused mutations, unchanged data/audit, safe retries, missing/misconfigured readiness and retained containment.
- [x] Prepare hosted suite and fail-closed production/target/approval guards; no cloud execution.
- [ ] Approve budget/target, create isolated compatible staging, validate supported Storage policy DDL and deployed configuration/ACLs.
- [ ] Execute hosted integration matrix and two-session ordering; validate real JWT fixture, browser behavior, mobile runtime and actual confirmation/recovery.
- [ ] Approve backup route/operator/destination, produce complete backups and restore/validate them in a separate restricted target; record measured recovery objectives.
- [ ] Select trusted human reviewer and MFA/attribution/recovery/retention procedures; no automatic test-user privileges.
- [ ] Re-review updated hash, actual staging evidence, backup proof and outstanding limitations before any live deployment approval.
- [ ] Separately approve live reviewer assignment and global activation; otherwise leave submissions disabled.

## Local verification and exact files

No hosted pass, backup existence, restoration success, device execution or new cloud resource is claimed by this document.

| Check | Actual result |
| --- | --- |
| Local SQL security runner | **79/79 passed**, PostgreSQL 18.6 via PGlite 0.5.11 with synthetic Auth/Storage catalogs; not target PostgreSQL 17.11 or a full Supabase stack |
| Full existing/new Node suite | **951/951 passed**, no failed/skipped/cancelled, after the final signature guard was added |
| Focused handler/client/UI and target-guard reruns | **56/56 passed**; final **5/5** target/signature guards passed; all current affected cases are also included in the full suite |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings; initial missing Buffer imports in new Node scripts were corrected |
| Deno 2.9.6 Edge typecheck | Passed with existing node_modules, `--node-modules-dir=manual --no-remote --cached-only --frozen-lockfile`; no package install or lockfile change. Global-cache mode initially attempted unavailable downloads, so the existing local dependency tree was used |
| Hosted runner `--plan` / Node syntax checks | Passed offline; no hosted execution |
| Git preservation / whitespace | Git index unchanged; all **187** starting non-environment files remain; exactly six intended existing files changed and three related files added; other **181** starting files hash-identical. `git diff --check` passed with existing line-ending notices only |
| Remote resources, hosted integration, backup/restore drill, native runtime | **Not performed — approval/environment gates remain** |

Changed existing files:

1. `supabase/migrations/20261021135040_manager_verification.sql` — readiness/locking and selective recovery semantics.
2. `supabase/functions/manager-verification-finalize/handler.ts` — early readiness denial and shared CORS headers.
3. `supabase/functions/manager-verification-finalize/index.ts` — user-scoped readiness read, setup/OPTIONS headers.
4. `scripts/check-manager-verification-sql.cjs` — paused mutation/recovery regression checks.
5. `scripts/manager-verification.test.cjs` — Edge pause, denial and SDK/header/setup regressions.
6. `docs/phase-h1-3-manager-verification.md` — link marking this follow-up as the current deployment/containment procedure.

New files: this plan, `scripts/run-manager-verification-hosted.cjs`, `scripts/manager-verification-hosted-guard.test.cjs`. No package, lockfile, Auth controller, screen or native file was edited.
