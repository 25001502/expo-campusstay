# H1.5 — Testing, deployment safety, implementation roadmap and approvals

[Plan index](README.md) · [Contracts](contracts.md) · [Identity](identity-and-admin.md) · [Workflows](workflows.md)

**Planning only. All future commands/actions below require the indicated approval. No new implementation, cloud/local service deployment, privileged assignment or activation was performed.**

**Later status:** [H1.5B1](../phase-h1-5b1-manager-review-security.md) completes local review/MFA/notes security code and offline tests. Use its two-migration fingerprints and current contracts for further review. Full-stack, hosted parity, privileged-session admission/SSR and deployment gates remain open. Existing H1.3 hosted/local runners still target legacy review calls and must be adapted before use against the extension; their older results cannot clear B1 acceptance.

## 1. Environment constraints and a workable path

CampusStay and Mumus Property are important existing projects. The user reports both available Free project slots occupied. Do not pause, delete, repurpose, reset, upgrade or use either project for integration fixtures. No additional spending is approved. A fresh third Free project or free hosted branch is not assumed available.

The isolated workspace `.expo/phase-h1-3/local-staging` and CLI **2.121.0** were prepared with unique project ID `campusstay-h13-local-staging`, API/database/mail ports **55321/55322/55324**, locally generated credentials, no remote link and environment/identity guards. Prepared reduced services are PostgreSQL, Auth, PostgREST, gateway, Storage, Edge Runtime and mail capture. Docker limits were 4 CPUs/4 GiB RAM/2 GiB swap; capacity was never established because the single trial stopped at engine preflight. The verified Docker recovery backup is separate from a Supabase backup and must remain untouched.

The local integration adapter still assumes the Program Files Docker path, while the documented installation is per-user. That portability issue, actual port exposure, capacity/OOM behaviour, fixed bootstrap-password containment and staging function/database identity evidence must all be resolved before any local integration run. Do not fix the path or launch Docker under this planning approval.

Recommended next work is offline contracts and security-extension tests while Docker recovery remains a separate approval process. There are then two independently approved integration options:

1. Recover the existing local Docker environment non-destructively, obtain fresh capacity-trial approval, prove loopback-only bindings/resource headroom, and obtain separate migration/function/fixture-test approval. Recheck all prior assumptions rather than reusing an expired trial authorization.
2. Use an explicitly approved isolated full Supabase stack on another development machine, or an independently approved fresh hosted test environment if quota/budget later permits. No public port forwarding, copied live data, or reuse of either existing project. A native side-by-side staging app needs its own app ID/scheme/redirects and target guards; the current local mobile launcher deliberately does not launch the cloud-configured app.

Local full-stack evidence cannot establish hosted parity. Until a suitably isolated hosted target is approved, the hosted release gate remains blocked and live administrative operations remain disabled. Do not weaken RLS, JWT verification, MFA, production 403 or readiness to work around environment limitations.

The official self-hosted changelog describes gateway changes, but that does not by itself establish how this pinned CLI's local stack behaves. Re-inspect supported CLI configuration/images/network bindings before a later start; do not automatically upgrade or replace the prepared gateway. [Self-hosted gateway notice](https://supabase.com/changelog/48048-self-hosted-supabase-envoy-becomes-the-default-api-gateway-b).

## 2. Evidence tiers and required tests

| Tier | What it can establish | Required coverage / what it cannot establish |
| --- | --- | --- |
| T0: offline static/types/unit/UI | DTO compatibility, target guards, routing/decision UX, no secret imports, pure eligibility and state logic | Run existing TS/lint/unit suites; add parser/version/money/legacy-ID/source-isolation tests in approved phases. Mocks cannot prove real auth/RLS/storage |
| T1: in-memory PostgreSQL | Real SQL parsing/constraints/RLS/ACL/function semantics against synthetic catalogs | Existing runner currently **79 checks on PG18.6/PGlite**. Extend for MFA/capability/legacy-RPC bypass, idempotency, property child-revision leaks and revocation. Does not prove PG17/service semantics or real concurrent locks |
| T2: isolated full local Supabase | Real Auth/Storage/Edge/gateway operations, HTTP privacy, local networking and multi-session concurrency | Synthetic identities only, reserved uploads, finalizer, role denial, byte access, MFA/SSR and publication invalidation. Currently blocked by Docker and runtime identity/capacity evidence |
| T3: isolated hosted parity | Managed DDL/ACL/defaults, gateway JWT/key compatibility, Auth mail/MFA, hosted Storage, cache/edge deployment and concurrency | Separate approved target, exact version/config inventory, synthetic-only test suite; never either important live project. Currently no approved available target |
| T4: restricted recovery drill | Actual backup coverage and recovery of Auth/MFA/application/storage/configuration | Separately approved sensitive-data recovery target, not the synthetic staging suite. No verified live Supabase restore exists |
| T5: release smoke/native/browser | Actual Next deployment/session/caching and Android/iOS manager/student flows | Approved runtime/devices and deployment. Bundles/exports or resized desktop Chrome do not prove native iOS/Android execution |

Current H1.5 reruns: 79/79 SQL checks, 77/77 admin unit/render/security checks, 191/191 local Auth/verification/target/isolation regressions passed. No hosted/local Supabase service tests, browser, build, native execution or recovery were performed in this documentation phase. Earlier H1.4.2 browser/build results remain historical. No new dependencies or test implementation was added.

### Release-blocking matrix for later implementation

| Area | Required positive and adversarial evidence |
| --- | --- |
| Identity / dual journeys | Same account through both mobile forms, confirmed/unconfirmed, expired/replayed PKCE, wrong callback, restoration failure, local logout, stale late response, no intent/metadata role escalation |
| Admin auth | Ordinary user 403, forged cookies/JWT rejected, AAL1 cannot read/review via UI **or direct RPC/Storage**, real enrolled-factor challenge, current capability deactivation and admitted-session revocation |
| SSR isolation | Two independent users; rotation/refresh in Proxy and handlers; redirects preserve cookies, no singleton client; RSC/prefetch/direct endpoints protected; no ISR/CDN/Set-Cookie cross-user leakage; CSRF/open-redirect negatives |
| Manager review | Owner/other/reviewer/demoted reviewer RLS, exact three confirmation schema, valid reasons, legacy RPC cannot bypass, self-approval denied, separate confidential notes, concurrent decisions/idempotent retry and actual grant/audit atomicity |
| Proof security | Real PDF/JPEG/PNG fixtures, wrong bytes/type/size/owner/path, expired reservation, quota, overwritten/deleted/cross-account/public reads denied, Edge finalizer only attaches checked owner proof, no log leaks |
| Readiness | Save/reserve/upload/finalize/submit/all review decisions/activation denied while off; owner/reviewer investigation reads and audited suspension/revocation retained; missing or public/misconfigured bucket fails closed |
| Two-session ordering | Readiness pause versus review/finalize; reviewer deactivation versus decision; manager/primary-property revocation versus publish/new student application; compare both orderings and transactions admitted before containment commit |
| Property ownership | Globally approved manager cannot edit another property, self-certify authority, move rooms/media across parents, appoint another owner or write moderation/publication columns |
| Property lifecycle | One property/stable room IDs across retries; valid Single/Shared and derived totals/rent; immutable revisions; pending/needs-change/rejected decisions; private notes; all six confirmations and eligible manager needed for approval |
| Publication / revocation | Approved manager alone does not publish; approved property with inactive global/property assignment not visible; revoke with old JWT and already-open page, then list/detail/search/count/room/media/direct-ID all deny; no automatic republish on reactivation |
| Snapshot/data privacy | Published parent cannot expose draft child rows/revisions; retired Studio historical only; future student submission snapshots cannot change when rooms/prices retire; public DTO has no private contacts/proof paths/internal notes |
| Media delivery | Private originals never public; signed-link expiry if explicitly introduced; no Next optimiser/CDN leaking authenticated images; EXIF/pixel/malware/quarantine decisions tested; cache/revocation bounds documented |
| Mobile / cross-session | Resume own draft, cancel picker/no fake success, unknown upload outcome/reload, safe foreground/Realtime failure, revoked workspace, Student Home unaffected, no real Apply against unresolved local fixtures |
| Operational recovery | Effective grants/RLS on target managed PG version, recovery of Auth identities and factor compatibility, object bytes/checksums, explicit backup/drill evidence, no unexpected emails/jobs/cross-project target |

The prepared hosted suite has 18 scenario groups, refuses nonempty/unhardened/wrong-version targets, validates an independently approved target and real expired-token signature, and retains synthetic data. It pins PostgreSQL `170011`. If a new staging target uses a different supported patch, document/approve the compatibility change and update the guard deliberately; do not disable it or upgrade live to match. It is not yet a test for the proposed admin MFA/property contracts.

The hosted runner's denylist explicitly contains CampusStay, not a verified complete list of both important project references. Existing exact-approved-target and empty-state gates help, but future hardening must explicitly protect both projects plus positively verify the approved target/organisation. Do not inspect Mumus Property to obtain this under H1.5. The local adapter has stricter exact loopback/workspace/runtime guards; neither runner is authorized for `--run` now.

## 3. Backup and recovery gate — proposed, not executed

Follow the detailed existing [H1.3 recovery procedure](../phase-h1-3-staging-readiness.md), revalidating current service/backup support before an approved export. Historical preflight reported no recoverable backup; Docker disk backups do not back up hosted Supabase accounts or data.

1. Approve an operator, secure existing source connection, fresh encrypted/private destination outside the repository/sync and Docker recovery folders, sensitive account-copy scope, retention, RPO/RTO and target. Do not reset live credentials or create privileged source roles just to gain dump access.
2. Perform a separately approved fresh read-only inventory/checkpoint: application and managed versions, migrations, effective ACL/RLS/defaults/publications, account aggregates, buckets/object counts, Auth providers/redirects/mail settings, functions/import maps/source hashes and secret **names**. Keep secret values in an approved secrets manager. Do not assume the two-user/zero-object inventory remains true.
3. Produce a verifiable encrypted database/Auth backup using a provider-supported method or approved PostgreSQL-compatible logical tooling. Default CLI application dumps exclude managed schemas and do not prove Auth/MFA coverage. Capture a reviewed restore manifest selecting compatible managed data, not blindly replaying all Auth/Storage DDL/history over a managed target. Confirm encryption-key/factor/session recovery support; inability to recover required encrypted Auth data fails the gate.
4. Back up Storage bytes separately with a restricted object-ID/path/hash manifest. Database backups alone do not include file bytes. Capture policy/configuration and owner relationships; verify restored bucket privacy before permitting reads. [Supabase backup scope](https://supabase.com/docs/guides/platform/backups), [backup/restore considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
5. Verify archive sizes/checksums, completeness and private access. Restore into a separately approved restricted recovery target, not either live project and not a synthetic staging target. Disable outbound email/jobs/webhooks through an approved isolation procedure before restoring/invoking them. Do not print password hashes, factor secrets, sessions or documents.
6. Validate restored Auth UUID/identity/confirmation/factor and necessary account-state coverage, all application FK/RLS/ACL/index/migration/publication rules, private object hashes and function/configuration parity. Obtain separate approval for any recovery-account login that creates sessions. A matching archive hash proves file copying, not successful restoration or filesystem/database health.
7. Record measured checkpoint and recovery time. The earlier one-hour recovery target is a proposal, not a guarantee. Decide how to preserve writes after the checkpoint; prefer secure forward recovery, not restoring over new accounts/applications. No restore/delete/cutover is implicit in deployment approval.

No backup export, credential lookup, restore, account copy, project creation or access test was performed here.

## 4. Safe implementation, migration and activation order

These are future actions, **not commands to run now**:

1. Approve contracts/scopes/retention/publication/session decisions. Freeze and record the current H1.3 hash. Generate later migration files with verified CLI `migration new`; no hand-invented timestamps and no rewriting applied history.
2. Implement local shared decoders, hardened manager-review/session/capability contracts and their SQL/API tests while production routes remain closed. Update legacy-path denial tests and mobile version compatibility before changing an adapter.
3. After a suitable isolated runtime has its own approval and safety evidence, inventory it and deploy the reviewed base migration with readiness false, then the forward admin/security extension. Verify effective grants, private schemas, policies and no legacy checklist/MFA bypass. Deploy the exact reviewed finalizer with `verify_jwt=true`; no prune, role seed or broad config push.
4. Obtain separate approval for synthetic Auth/reviewer/admin fixtures and local/staging readiness transitions. Run real Auth/Storage/Edge/MFA/SSR and concurrency suites; leave readiness false and retain diagnostics/data afterward. No blind rerun on a now-nonempty target, automatic reset or destructive cleanup.
5. Implement/deploy the independently reviewed property series to isolated staging: ownership/drafts/rooms → media/authority → revisions/moderation → publication/read predicates/audit. Keep every new readiness/publication flag off until its tests pass. Test access revocation across the complete manager/property chain, including legacy function paths.
6. Connect approved admin/mobile adapters on staging only; preserve source discriminators so no real failure falls back to mock data. Test the exact hosting platform and real Android/iOS flows. Resolve the live-catalog/Apply contract before exposure.
7. Clear hosted parity and verifiable backup/restore gates, review all diffs/artifact hashes and fresh target inventory, and obtain **separate live deployment approval**. Explicit target/reference per command, one reviewed pending migration list/dry run, error-stopping execution. Do not use cloud linking/history repair to conceal drift.
8. Live deployment, if later approved, applies only reviewed additive artifacts **with readiness false and production admin 403 still in place**. No user/reviewer seeds or activation implied. Preserve two existing accounts and data; no test identities/uploads in production without separate scope approval.
9. Obtain explicit first-administrator/reviewer designation, MFA/session/bootstrap audit and recovery-operator approvals. No automatic upgrade of existing users. Demonstrate ordinary-user/direct-path denial before enabling any privileged web route.
10. Obtain separate restricted admin-access enablement, verification readiness, property-publication and student-catalog cutover approvals, in that order of actual dependencies. Deployment alone enables none. Monitor and keep documented containment paths available throughout.

Existing H1.3 `ready` controls both workflow writes and `access.authorized`; it is not merely a submission switch. Initially respect that contract: a pause also removes workspace eligibility and should suppress dependent live catalogue reads. If availability requires independent future flags for submissions, manager access, property publishing and catalogue serving, that is a separately versioned security/product decision with tests. Do not silently split the current kill switch while integrating.

## 5. Rollback and incident response

Assign an incident operator and approver before activation. On suspected privilege/media exposure, close admin integration and applicable readiness/publication gates through the documented trusted path; wait for containment transactions to commit. Keep owner/reviewer recovery reads and authorised suspension/revocation where safe, and explicitly disable affected document delivery if exposure is the issue. Deactivate compromised assignments/sessions and rotate exposed secrets only through approved incident operations.

Preserve sanitized logs, decision IDs, hashes and recovery evidence; never run a cleanup job to hide an incident. Prefer rolling back app/function code and disabling endpoints while retaining additive schema/evidence/audit. Do not apply an automatic destructive down migration, unregister WSL, delete Docker volumes, delete users/files, or drop verification/property tables. A live restore, losing post-checkpoint data, live connection cutover, privilege change or key rotation needs concrete incident approval and a reviewed recovery plan. Cached already-delivered public bytes cannot be recalled; this is why public buckets are not the initial media design.

## 6. Prioritised, independently reviewable roadmap

| Phase | Deliverables and dependencies | Security/tests and completion criterion | Risks and approval required |
| --- | --- | --- | --- |
| **H1.5A — Shared contracts and boundary tests** | Pure versioned decoders/commands, capability map, error/idempotency contracts, synthetic/live discriminators and adapter interfaces. Depends on accepting H1.5 decisions | Offline invalid payload/version/ID/money tests; no browser secrets/mock fallback; original auth/UI suites pass; production still 403. Done when contract review and negative tests pass | Scope creep into services; approval for **local implementation only**, no dependency/cloud/deployment changes by implication |
| **H1.5B1 — Trusted security extension** | Forward local migration for scoped assignments/MFA/admitted sessions, hardened review/access operations, legacy bypass closure, confidential notes/audit. Depends on A | PGlite plus actual target PG/full-stack tests when available; self-role/MFA/checklist/legacy/revocation negatives. Done only when declared offline limits and unresolved service gates are explicit | Managed Auth/session compatibility, lock order and overly broad reviewer scope; separate SQL implementation and later staging deployment approvals |
| **H1.5B2 — Admin authentication implementation** | Request-scoped SSR/BFF, sign-in/MFA/logout/callback/DAL, CSRF/cache/CSP/cookie handling. Depends on A/B1 contracts; real environment for full acceptance | Mock/loopback tests then real staged Auth; AAL1 direct route/RPC denial, two-user caching and logout/revocation. Keep default production 403. Done when no UI-only authorization path remains | SSR version/host/cookie compatibility; approval for compatible **admin-only packages** and local implementation, no production enablement |
| **H1.5C — Manager review API integration** | Real staged queue/detail/private evidence/v2 decisions/notes/history/access management, current mobile own-state compatibility. Depends on B and isolated deployed H1.3 | Real staged byte/RLS/Edge/role/MFA/concurrency/idempotency tests; no synthetic fallback; existing user/grant privacy. Done when workflow and containment pass end to end | Docker/staging unavailable, Auth email projection, private file handling; explicit staging/function/fixture mutation approvals |
| **H1.5D1 — Property ownership and drafts** | Stable property/room IDs, provisional/trusted assignments, atomic full draft saves, Single/Shared constraints and room retirement. Depends on B/current manager access | Cross-manager/parent-ID/self-assignment/version/partial-save tests. Done when another manager cannot read/write private records and historical refs remain stable | Property-specific authority policy; independent model/migration implementation approval |
| **H1.5D2 — Media and moderation** | Separate gallery/authority stores, validation/quarantine, immutable submissions, six-check review and private notes/audit. Depends on D1/C security patterns | Real staged upload/view/revision/self-review/checklist tests, no private/public mix. Done when complete evidence/feedback workflow passes without publication | Scanner/privacy/retention/cost choice; explicit service/bucket/function deployment and synthetic-file approvals |
| **H1.5D3 — Publication and revocation** | Explicit publishing, common eligible-read predicate for parent/children/media, containment and no auto-republish. Depends on D2 | Adversarial old-JWT/list/detail/search/count/room/media tests and real multi-session revoke/publish ordering. Done when no later read bypasses current eligibility | Cache/source-of-truth drift, mass update contention; explicit publication-policy approval, flags off |
| **H1.5E1 — Mobile manager persistence** | Typed portfolio adapter behind current guard; actual IDs/versions, real status and privilege loss. Depends on C/D | Native Android/iOS permission-loss/dirty-form/gallery tests, no local success on failed network write. Done when real portfolio data is isolated per assigned property | Manager prototype applications/tenants/funding status are unrelated to verification; approve only named persistence scope |
| **H1.5E2 — Student catalogue and application boundary** | ID-based eligible listing repository across Home/Explore/Details/Compare/Favourites, safe unavailable/retired offers and immutable snapshots. Depends on D3 | No draft/media leak, correct prices/counts, stable room preselection, no static-array submission fallback. Done when real catalogue IDs cannot enter a fake local submission | Real Apply/StudentDocumentApi not implemented; approve separate student application/document contract or explicit temporary read-only catalogue. No booking/payment/message backend implied |
| **H1.5F — Hosted security, recovery and rollout** | Independent hosted parity, protected recovery drill, operational runbooks/monitoring, verified UUID bootstrap and phased cutover. Depends on all enabled feature gates | All applicable T3–T5 evidence, fresh backups/restore, ordinary-user 403 and fail-closed outage tests. Done only after signed gate evidence and separate activation approvals | No spare Free slot, unknown budget and no hosted recovery; explicit resources/export/drill/deploy/bootstrap/admin-enable/readiness/publish/cutover approvals, not a single blanket go-live |

Do not build these as one platform-wide change. Each subphase should have its own focused diff, acceptance evidence and approval boundary. Implementation can progress offline where independent, but the word “complete integration” requires real isolated-service evidence.

## 7. Security risks and unresolved decisions

| Priority | Finding / unresolved issue | Required resolution before affected feature enables |
| --- | --- | --- |
| Critical gate | No independent available full-stack/hosted environment or demonstrated live recovery | Approve an isolated option; retain both important projects/data untouched; complete recovery drill |
| High | H1.3 legacy review grants allow a valid assigned reviewer to omit checklist/strong reason/MFA | Forward hardening of every direct path, revoke legacy bypass and prove negative tests |
| High | Manager approval is global, not property-specific ownership proof | Approve authority-evidence/assignment policy and independent property authorization workflow |
| High | A public/stale publication flag or public URL survives role changes | Same current predicate on every read/child/media path; private initial delivery and explicit cache/expiry guarantees |
| High | No confidential notes, privileged-session/MFA enforcement or audited administrator bootstrap exists | New scoped server contracts; no UI-only enforcement or unrecorded operator grant |
| High | Real catalogue IDs conflict with static student submission lookup and fixture history | Coordinate repository/snapshot/Apply boundary; no automatic synthetic import or fake-success fallback |
| High | Real document signatures are not malware/authenticity checks | Approved quarantine/validation/manual-review and privacy-safe delivery; no third-party file sharing by default |
| Medium | Readiness currently couples submissions and manager access | Approve containment/availability semantics, or defer flag separation with versioned tests |
| Medium | Current rejected application terminal; reactivation policy and appeals undefined | Decide evidence/re-review/appeal workflow; never silently unlock or create duplicate applications |
| Medium | Reviewer/beneficial-interest conflict scope, directory email projection, retention/deletion/legal holds | Assign product/privacy/security owners; explicit least-privilege field/purpose/retention decisions |
| Medium | Per-user Docker path and version-pinned integration guards | Separate approved portability fix and capacity/network/target-version evidence, no hidden retry or reset |
| Medium | Admin dev-tool advisories and host/browser/native gaps recorded in previous reports | Reassess before release under an authorised maintenance scope; no unrelated upgrades in this plan |

## 8. Exact decisions requiring owner approval

The following are recommendations awaiting decisions, **not actions authorised by H1.5**:

1. Approve H1.5A local shared-contract/negative-test implementation as the next bounded phase, retaining default production 403 and all service flags off.
2. Approve the server-only SSR/BFF cookie model, administrative capability split and separate property moderator scope; choose privileged session/step-up limits. Decide later whether any browser Auth client is actually needed.
3. Approve a forward H1.3 security extension with backend checklist/reason/MFA enforcement, legacy-RPC closure, confidential notes and durable privilege/decision events. No deployment is included.
4. Approve property-specific authority evidence, provisional/trusted assignment policy, primary responsible manager, independent Publish operation, conservative unpublish-on-resubmission and explicit re-publish after access recovery.
5. Approve private-first media, proposed short-lived link exception policy if needed, scanner/processing approach, retention/grace periods/legal holds and who may inspect student private documents. No public bucket/third-party file transfer is implicitly approved.
6. Choose an isolated integration environment. Any Docker repair/capacity start, alternate host/networking, additional hosted project/branch, paid plan or spending needs its own concrete approval. Maximum new cloud spend remains **$0 unless changed explicitly**; no current estimate is presented as a quote.
7. Approve separately: staging artifacts/target, migration/function/bucket deployment, synthetic identity/role/file test mutations and readiness transitions. Both live project references must be excluded; no real accounts/documents copied into this staging suite.
8. Approve backup/export scope, encrypted destination/operator, recovery target, sensitive Auth/MFA/object data copy, restore drill, RPO/RTO and retention. This is independent of the verified Docker recovery backup.
9. Designate the first administrator/reviewer by verified Auth UUID, scope, MFA evidence, two-person operator approval/change reference and break-glass owner. Existing test users receive no automatic assignment.
10. Approve the student live-catalog/Apply strategy and later student application/document persistence separately; do not infer authorization for bookings, payments, messaging or funding verification.
11. Only after evidence passes, approve live additive deployment, then role bootstrap, then real admin-access enablement, then verification readiness and property/student publication cutover as separate concrete operations. Any rollback restore/deletion/key rotation remains separately approved incident work.

Stop here. No implementation of H1.5A or any deployment is started by this planning package.
