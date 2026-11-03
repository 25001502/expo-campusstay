# H1.5A — Shared contracts and security boundary tests

Completed 23 October 2026. **Local code and offline/loopback tests only. No backend deployment, live administrative integration, role assignment or readiness activation.** The [five-document H1.5 plan](phase-h1-5/README.md) remains the architecture baseline; its historical observations are not a fresh remote inventory.

## Scope and implementation

`shared/contracts/v1/` is a small TypeScript source layer with no npm package, SDK, framework, environment reader, network operation or native dependency. The directory version is the shared contract release; it does not inject version fields into existing RPC payloads. Existing H1.3 state stays version 1, the existing Edge body remains unversioned, and the explicitly proposed review successor is version 2. Incompatible future wire changes require an explicit versioned decoder and adapter decision.

| Module | Contract category | Contents |
| --- | --- | --- |
| `core.ts` | Shared primitives; proposed adapter envelope | Identity UUID references, int4 revision semantics, safe typed errors and `ContractResultV1<T>`. An identity reference proves no identity/confirmation; the result envelope is not an existing PostgREST response |
| `manager-verification.ts` | Implemented locally in H1.3, **not deployed or hosted verified** | Application/relationship/authorization states, safe application and evidence projections, proof limits, legacy review command, verification event vocabulary, own-state and finalizer contracts |
| `preview.ts` | Frontend-only | Reviewer confirmations, synthetic envelope and property preview statuses, including `published_example`. No durable state or server authenticity implied |
| `proposed.ts` | Proposed; no backend implementation | Strict future review/checklist command, property review states, publication eligibility input specification/evaluator and future audit event vocabulary |

The mobile verification domain reuses the shared types/constants. Its existing API now uses strict own-state/application decoders and validates the finalizer response's exact success/error shape. Malformed responses fail through existing safe `VerificationIssue` messages, preserving unavailable/request/upload handling. Existing refresh/revocation behavior and navigation are unchanged. Empty partial drafts remain valid; submission completeness still belongs to the existing controller and SQL.

Admin application, decision, authorization, evidence, confirmation and event models reuse **type-only aliases**. Property preview status/decision aliases remain explicitly frontend-only. Runtime preview tuples stay local, with parity tests against the shared tuples. No external runtime import enters Next's existing Turbopack root, and Metro's existing admin exclusion is unchanged. The disconnected future adapter, production Proxy/layout restrictions, preview reducers and all UI are unchanged. Admin CI now also triggers on shared-contract changes.

## Runtime validation and limits

- Exact own-key objects reject missing, inherited or unexpected fields at every decoded object level. Raw database rows with reviewer IDs, Storage paths/hashes or private-note fields cannot be passed as application/evidence projections. Arrays, nulls, wrong scalars and unsupported versions fail safely.
- Required IDs use UUID syntax, matching the existing SQL/Edge identifier class without imposing an invented UUID version. Revisions for SQL commands/DTOs are nonnegative PostgreSQL int4 integers, not numeric strings, fractions or arbitrary JS-safe integers. The review-target preflight additionally rejects stale revision/ID, non-pending transitions and an increment that would overflow int4.
- Application strings and proof metadata use existing table limits; string bounds count Unicode code points as PostgreSQL does. Safe filenames, supported MIME types, 1–5,242,880-byte evidence and parseable generated timestamps are checked. Field values are copied into whitelisted fresh projections. Owner equality is checked only for own-state/mobile decoders, not misused as an admin permission check.
- Current state semantics remain fail closed: workspace UI needs ready + the returned authorization flag + active authorization + approved application. Parsing never grants a role; actual remote operations still require database authorization.
- The legacy review decoder deliberately accepts the existing **1–2,000 PostgreSQL-character** reason and exact four RPC fields. It rejects checklists/actor/role extras rather than pretending SQL accepts or enforces them.
- The proposed review decoder requires its discriminator/version, UUID request/application IDs, revision, supported decision, meaningful 20–2,000-character feedback and exact versioned boolean checklist. Approval requires all three confirmations. Other decisions still require the checklist shape but not checked confirmations. Tests compare representative reason inputs with the existing preview copy-quality rules. Neither rule proves factual authenticity.
- Proposed publication inputs independently require explicit publication of the exact approved revision, current global approval/active access, trusted/current/primary property-specific authority for the same IDs, both readiness gates and ready approved media. Invalid inputs throw; valid but ineligible states return false. This is **pure specification logic**, not deployed database enforcement or a production permission helper. Room/child/media read policies and concurrency remain future backend work.
- Proposed typed result envelopes allow only enumerated safe error codes and exact success/error branches; arbitrary backend error details are rejected. Existing finalizer responses use their separate real `{ok, code}` decoder.

**Shape is not provenance.** Synthetic fixtures deliberately contain valid UUIDs and can match the H1.3 shape. A source discriminator helps prevent accidental mixing but is forgeable. The existing disconnected adapter and production access denial, not UUID parsing or checkbox values, prevent live review operations. No new review transport, generic live mutation function, service key or fallback adapter was added.

These parsers are boundary shape checks, not a replacement for every SQL constraint, legal workflow transition, byte validator or trusted actor/readiness/locking check. The shared SQL test loader evaluates only pure shared modules; it does not import React Native or the mobile UI harness.

## Verified mismatches and remaining implementation gaps

| Gap | Current evidence | Required separately approved next work |
| --- | --- | --- |
| Server checklist and reason rules | Existing `cs_manager_review` has four arguments, reason minimum 1, no checklist; preview uses minimum 20 plus copy-quality checks | Forward versioned server command, atomic stored confirmations/request ID/revision/decision and closure of legacy direct-RPC bypass. Do not retroactively rewrite historical feedback |
| Administrator/reviewer MFA | H1.3 checks confirmed identity/current reviewer assignment, not AAL2 or admitted privileged sessions; admin authentication remains absent | Backend and SSR/DAL/RLS/Storage MFA/capability/session enforcement, including direct API paths; production stays 403 until approved and tested |
| Confidential reviewer notes | Preview notes are session-only; current application/event projections and existing raw table SELECT grants are not a private-note store | Separate private note contracts/storage/RLS/history, never owner-readable application snapshots; review minimum column projections |
| Trusted assignments | Private H1.3 reviewer assignments exist locally; no app administrator bootstrap, scoped capability split or operator-edit audit exists | Explicit verified UUID, out-of-band identity, MFA and attributable approved operator procedure; no auto-promotion of existing users or editable metadata |
| Property moderation/publication | Only frontend preview and pure proposed inputs exist | Independent property persistence, trusted per-property assignments, immutable revisions, explicit Publish, common current eligibility predicate for parent/child/room/media/new-application reads |
| Revocation | Existing manager own-state guard removes workspace access on revalidation failure; SQL checks current assignment and permits containment during pause | Privileged session/scoped authorization and property read enforcement, transaction ordering, stale-JWT and real multi-session tests. Polling/cached flags are insufficient |
| Durable audit | H1.3 locally generates verification events; preview history is synthetic | Durable private decision/note/privilege/property/media-access events with trusted actor, revisions, request ID, retention and access policy; atomic write/audit behavior |
| Hosted services/security | No full Supabase service or hosted test was run; Docker/staging/recovery gates in H1.5 remain unresolved | Independently approved isolated Auth/Storage/Edge/MFA/concurrency/parity tests and recovery drill. Never use either important live project as a fixture target |
| Edge/SQL revision range | Current Edge accepts nonnegative JS-safe integers while the RPC parameter is PostgreSQL int4 | Preserve/report this existing mismatch now; separately review narrowing handler input and consistent error mapping before deployment. The shared Edge input specification intentionally mirrors the existing handler |
| Student live-catalog/Apply boundary | Current static catalogue/session application prototypes remain unchanged | Coordinate real ID-based catalogue and immutable application snapshots in their approved phase; no silent synthetic import or fake successful persistence |

Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa) were checked; enforcement belongs to trusted backend boundaries, not these untrusted frontend DTOs. No project was queried through Supabase management tools.

## Tests and actual results

| Check | Final result and evidence level |
| --- | --- |
| Root `npm run typecheck` | Passed |
| Admin `npm run typecheck` | Passed; existing `next typegen && tsc --noEmit` |
| Root/admin `npm run lint` | Both passed, zero warnings |
| Two new root contract/security suites | **41/41** passed, zero failed/skipped; included in full root suite |
| Root `npm run test:all` | **1,020/1,020** passed, zero failed/skipped |
| Admin `npm test` | **84/84** passed, including seven new boundary/isolation tests; zero failed/skipped |
| `node scripts/check-manager-verification-sql.cjs` | **86/86** passed: 79 existing checks plus seven real SQL-output/decoder compatibility checks. PGlite 0.5.11 / PostgreSQL 18.6, new in-memory synthetic catalogs only |
| Admin production build | Passed, Next.js 16.4.2 / Turbopack; no new packages |
| Admin `npm run test:production` | **12/12** passed against loopback production server in Chrome. Admin routes returned HTTP 403/no-store even with mock query flags; sign-in remains disabled |
| Admin `npm run test:browser` | **55/55** passed against loopback synthetic preview, including H1.4.1/H1.4.2 dialogs, responsive layouts and local decisions. Browser-width/text checks do not prove native layouts |
| Metro production exports | Android and iOS both passed with Hermes bytecode; **1,695 / 1,698 modules**, respectively. No native device execution claimed |
| Metro/Next dependency isolation | Existing Metro exclusions passed; shared AST traversal permits only local pure imports, forbids environment/network/native runtimes; emitted admin model JS contains no imports; both actual builds passed |
| Installed trees | Root/admin `npm ls --depth=0` exited 0. Admin retains pre-existing extraneous `@emnapi/runtime` and `@img/sharp-wasm32`; no reinstall/cleanup attempted |
| Expo compatibility | `expo install --check` exited 0 using the installed SDK's map; networking disabled, CLI explicitly warned validation was unreliable offline. This is not a fresh online compatibility/advisory audit |
| Whitespace/preservation | Git diff and explicit new-file whitespace checks passed. Only the six intended existing files below changed; all other starting files, index, root cloud environment and both lockfiles preserved |

The initial root lint found three import warnings and the initial admin checks found a readonly-environment cleanup typing error plus an overly broad test regex matching `export`; all were corrected before the passing final results above. No checks were disabled or suppressed.

The first direct export invocation failed before dotenv initialization despite separate configuration validation succeeding. A process-only launcher now loads the existing production env silently and validates it before invoking Expo; no env/config file was changed. Hermes then hit a sandbox temporary-directory write denial; setting only the child process's TEMP/TMP to the dedicated writable `.expo/phase-h1-5a/tmp` allowed the full production exports. No compiler/security check was bypassed.

The first browser run was stopped when local loopback probes returned `EACCES`. The existing scripts then passed with approved execution outside that socket restriction. Production tests use port 3101, preview tests port 3100; no images/packages/services were installed. Preview launcher strips inherited Supabase/cloud app variables. Existing development image aspect-ratio warnings and Node NO_COLOR/FORCE_COLOR notices were observed; no UI cleanup was included in this phase.

Logs, the preservation manifest and native exports are in ignored `.expo/phase-h1-5a/`. These tests provide offline SQL semantics and loopback web evidence, **not hosted RLS/Auth/Storage/Edge/MFA authorization, actual concurrency, native Android/iOS runtime or recovery proof**. Expo Doctor was not rerun in this focused phase. There was no network test of either hosted project.

## Exact files changed in H1.5A

Existing files were modified in place, preserving prior work:

1. [`.github/workflows/admin-web.yml`](../.github/workflows/admin-web.yml) — trigger admin verification on shared contract changes.
2. [`src/verification/domain.ts`](../src/verification/domain.ts) — shared types/proof constants, existing domain behavior retained.
3. [`src/verification/api.ts`](../src/verification/api.ts) — shared strict DTO and finalizer-response validation, existing errors/transport retained.
4. [`admin-web/src/lib/contracts.ts`](../admin-web/src/lib/contracts.ts) — type-only shared aliases; preview-only view models retained.
5. [`admin-web/src/lib/property-contracts.ts`](../admin-web/src/lib/property-contracts.ts) — type-only preview status/decision aliases.
6. [`scripts/check-manager-verification-sql.cjs`](../scripts/check-manager-verification-sql.cjs) — seven SQL-output/decoder compatibility checks, no migration changes.

New files:

7. [`shared/contracts/v1/core.ts`](../shared/contracts/v1/core.ts).
8. [`shared/contracts/v1/manager-verification.ts`](../shared/contracts/v1/manager-verification.ts).
9. [`shared/contracts/v1/preview.ts`](../shared/contracts/v1/preview.ts).
10. [`shared/contracts/v1/proposed.ts`](../shared/contracts/v1/proposed.ts).
11. [`scripts/load-shared-contracts.cjs`](../scripts/load-shared-contracts.cjs) — pure TypeScript test loader with import containment.
12. [`scripts/shared-contract-fixtures.cjs`](../scripts/shared-contract-fixtures.cjs) — synthetic offline inputs only.
13. [`scripts/shared-contracts.test.cjs`](../scripts/shared-contracts.test.cjs).
14. [`scripts/security-boundaries.test.cjs`](../scripts/security-boundaries.test.cjs).
15. [`admin-web/tests/shared-boundaries.test.ts`](../admin-web/tests/shared-boundaries.test.ts).
16. This report.

Starting preservation manifest covered **276 Git-visible files**. Only the six intentional existing files above changed; the other **270** remain byte-for-byte unchanged. No file was removed. Git index, root `.env.local`, both package manifests/lockfiles, migration/functions/configuration, original H1.5 documents and all unrelated app work remain unchanged. No commit, push, reset, clean, deployment, cloud resource/account/role change, Docker/WSL action or recovery-backup access occurred.

## Next small phase, awaiting separate approval

Recommend a bounded **H1.5B1 local security-extension design/implementation**: agree the exact v2 review/checklist/reason/idempotency and trusted MFA/capability contracts, then add forward SQL and offline denial tests for legacy bypasses. Scope private notes and privileged-session admission as independently reviewable follow-ups rather than implementing the entire platform at once. Do not connect admin authentication/review APIs or deploy any artifacts under H1.5A approval.

Stopped after H1.5A. No hosted integration or administrator authentication is enabled.
