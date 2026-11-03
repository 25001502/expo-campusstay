# H1.5 — Current versus future contract inventory

[Plan index](README.md) · [Identity](identity-and-admin.md) · [Workflows](workflows.md) · [Deployment](deployment-and-roadmap.md)

E = repository implementation; H = dated remote evidence; P = proposed; B = blocked/unverified. Every H1.3 application object below is **E, not deployed, B for hosted verification**. Proposed identifiers are design names, not existing SQL or executable deployment instructions.

**H1.5B1 update:** this inventory describes the original H1.5/base-H1.3 baseline. A second local migration, `20261023130036_manager_review_security.sql`, now implements versioned review/access operations, session/MFA enforcement and confidential notes. After that extension is applied, both legacy write RPCs below are denied and reviewer RLS requires AAL2/live-session eligibility. See the [current local contracts and exact hashes](../phase-h1-5b1-manager-review-security.md). Existing property/admin-web proposals remain unimplemented; no migration has been deployed.

## 1. Historical remote baseline, not a fresh inventory

The [21 October read-only preflight](../phase-h1-3-read-only-preflight.md) observed the CampusStay project with PostgreSQL **17.11** (`170011`), Auth 2.197.0 and PostgREST 14.18; two confirmed Auth users; no objects in `public`; no application migration-history schema; zero buckets/Storage object rows and no relevant policies; no deployed Edge Functions. Managed `auth`, `storage`, `realtime`, `extensions`, `graphql`, `graphql_public` and `vault` schemas existed. The preflight did not verify a recoverable backup.

Those observations may have aged. No hosted catalog was queried in H1.5; do not present absence or account counts as current confirmation. Managed Auth/Storage/Realtime migration histories are not CampusStay application migrations and must not be replayed or repaired. Mumus Property's schema is not inventoried or touched by this plan.

## 2. Exact existing local H1.3 objects

Only one file exists in `supabase/migrations/`: `20261021135040_manager_verification.sql`. It is additive, transaction-wrapped, intentionally non-idempotent, and currently never deployed according to project history. It aborts on collisions or missing Storage RLS. Migration convention is timestamped SQL; future files must be generated with the then-verified CLI, reviewed and applied in order. Do not rewrite any migration once applied to any retained environment.

| Relation | Existing purpose and constraints | Client authority |
| --- | --- | --- |
| `campusstay_private.verification_configuration` | Singleton; `contract_version=1`; `finalizer_ready=false` seed | No app table grants; approved operator only |
| `campusstay_private.reviewer_assignments` | Auth UUID PK, active, assigned_at/by, required 5–1000-character reason; no seed reviewers | No app table grants; confirmed active assignment drives `is_reviewer()` |
| `public.manager_verification_applications` | UUID; unique applicant Auth UUID; name/phone/business/location/relationship; five states; revision; proof reference; timestamps/reviewer/reason | Authenticated SELECT under owner or submitted-case reviewer RLS; no client DML |
| `public.manager_verification_documents` | UUID; same-owner/application composite FK; unique canonical owner/application/document path; PDF/JPEG/PNG, 1–5,242,880 bytes; reserved/ready, SHA-256, timestamps | Owner or submitted-case reviewer SELECT; no client DML |
| `public.manager_authorizations` | User PK; same-owner application FK; active/suspended/revoked; reviewer/reason/timestamps | Own or reviewer SELECT; no client DML |
| `public.manager_verification_events` | Bigint identity; application/actor/document; action/time/reason/revision and whitelisted application snapshot | Owner or authorized submitted-case reviewer SELECT; no client event writes |

All six tables enable RLS. The public identity sequence has no ordinary-client privileges. Eleven explicit FK/queue/history indexes supplement PK/unique indexes. `capture_verification_event` is a BEFORE INSERT trigger that fills each event snapshot through `application_json`. Snapshot content excludes object paths/hashes and internal notes; it is not a full manager-authorization snapshot.

Four SELECT policies are `manager_application_read`, `manager_document_read`, `manager_history_read`, `manager_assignment_read`. A reviewer cannot browse an applicant's never-submitted draft. A case returned for information retains `submitted_at`, so its subsequent corrections/documents are still reviewer-visible. Explicit authenticated SELECT currently covers raw table columns too: RPC whitelisting does not hide raw `reviewer_id`, document paths or hashes from an otherwise permitted table SELECT. Review column-level/data-minimization changes before admin adapters expose these records; never add confidential notes to owner-readable rows.

### Public RPC contracts as implemented

All seven use `SECURITY DEFINER`, empty `search_path` and qualified names. Ordinary-role EXECUTE is explicitly revoked before narrow grants.

| Exact signature / result | Actor and checks | Effect / failure |
| --- | --- | --- |
| `cs_manager_state() → jsonb` | Confirmed `auth.uid()`; own application; exact private-bucket configuration | `{version:1,ready,application,access:{state,authorized}}`; authorized only if ready + approved application + active authorization. No reviewer queue |
| `cs_manager_save_draft(p_fields jsonb,p_revision integer default null) → jsonb` | Confirmed owner, ready; fields only phone/business_name/property_location/relationship, strings; row lock, exact revision; draft/needs_information only | Creates one lifetime application per user or updates it, increments revision, `draft_saved` event. Name comes from user-editable Auth display metadata, not verified legal identity. Empty/null revision valid only for initial revision 0 |
| `cs_manager_reserve_proof(p_application uuid,p_revision integer,p_name text,p_mime text,p_size bigint) → jsonb` | Owner, ready, editable, revision; filename/extension/MIME/size; max ten reservations in rolling 24h | Returns `{id,object_name}`; reserved document and `proof_reserved` event; application revision does not advance |
| `cs_manager_finalize_proof(p_actor uuid,p_document uuid,p_revision integer,p_sha256 text) → void` | **Server credential only**, confirmed supplied actor derived by Edge, ready, owner/editable reservation under 24h, revision, object owner/size/MIME/hash | Marks ready, attaches current proof, advances application revision, `proof_verified`; current ready proof retry returns without another transition after eligibility/expiry/readiness checks |
| `cs_manager_submit(p_application uuid,p_revision integer) → jsonb` | Owner, ready, row lock, complete valid fields and attached ready proof/object | Transitions editable → pending, timestamps/revision, `submitted`. Existing pending retry returns the current application without duplicate event, but still respects ready |
| `cs_manager_review(p_application uuid,p_revision integer,p_decision text,p_reason text) → jsonb` | Confirmed current reviewer, ready, other applicant, pending, row lock and exact revision; approved/needs_information/rejected; trimmed reason **1–2,000** chars | Decision/reviewer/time/revision and event. Approval inserts active `manager_authorizations` in same transaction. No checklist, MFA, private notes or idempotency key |
| `cs_manager_set_authorization(p_user uuid,p_state text,p_reason text) → void` | Current reviewer; not self; approved application and existing authorization; active/suspended/revoked; reason 1–2,000 | Updates authorization and emits state event. Activation requires ready; suspension/revocation deliberately remain available during pause. No expected authorization revision argument |

`authenticated` can invoke state/save/reserve/submit/review/set_authorization; being able to invoke a review RPC does **not** mean an ordinary student/manager can successfully perform its privileged transition. `service_role` alone among ordinary API roles receives finalize EXECUTE; callers with trusted DB-owner authority remain outside the ordinary-client threat model.

### Private helpers

Existing helpers: `actor()`, `is_reviewer()`, `application_json(public.manager_verification_applications)`, `capture_verification_event()`, `require_ready()`, `read_proof(text)`, `write_proof(text,text)` in `campusstay_private`. Only boolean `is_reviewer`, `read_proof`, `write_proof` helpers have anon/authenticated EXECUTE for policy evaluation; the private schema is not a Data API schema. Application identity/role checks never read user metadata for authority.

`require_ready()` checks the configuration and exact private bucket contract, holding a shared configuration-row lock until commit. Pausing waits for already admitted RPCs; after pause commits new guarded writes fail. Actual two-session/service-level ordering remains B. Reads and containment revocations remain intentionally possible.

### Storage and Edge

| Contract | Actual local definition |
| --- | --- |
| Bucket | `campusstay-manager-verification`, private, exact MIME array PDF/JPEG/PNG, 5,242,880-byte maximum |
| Paths | `<applicant UUID>/<application UUID>/<document UUID>.<pdf|jpg|png>` generated by reserve RPC; never arbitrary client paths |
| Policies | Six object policies: restrictive read/insert/update/delete guards plus permissive authenticated read/insert; three restrictive bucket-config insert/update/delete guards. Update/upsert/delete of evidence are forbidden to ordinary clients |
| Read | Exact recorded object, owner or current reviewer of a submitted case. Existing reads remain available when readiness is false |
| Insert | Own reserved path/object owner, editable application, reservation younger than 24h and ready configuration; unrelated broad permissive policies cannot override restrictive guards |
| Edge endpoint | Prepared `/functions/v1/manager-verification-finalize`; `supabase/config.toml` has `verify_jwt=true`; no project link in that file |
| Request | POST JSON exactly `{document_id: UUID, revision: nonnegative safe integer}`, at most 512 body bytes; Bearer **user JWT** plus publishable API key in the appropriate header |
| Verification | Auth `getUser`, confirmed email, user-scoped `cs_manager_state` ready check, owner-filtered document query and user-scoped Storage download, actual size and magic-byte signature, SHA-256, server-only finalize RPC with derived actor |
| Responses | 200 `{ok:true,code:'verified'}`; 400 input, 401 authentication, 403 permission, 405 method, 422 file, 503 setup/unavailable; other failures return safe 409 `not_confirmed`. OPTIONS 204. Reload authoritative state before displaying successful attachment |
| CORS | `*`, POST/OPTIONS, explicit authorization/apikey/content-type/SDK retry/tracing headers; no credentialed cookie mode. This is a bearer endpoint, not the planned cookie admin BFF |
| Limits | Signature/hash checks are not malware scanning, complete file parsing, legal authority verification or authenticity verification. No replacement deletion/retention job is implemented |

There are fourteen local definer functions, thirteen SELECT/Storage policies and one explicit event trigger. Realtime publication additions cover only applications and authorizations if `supabase_realtime` exists. No realtime server availability or reliable instant delivery is established by the migration.

### Required H1.3 extensions before real admin reviews — all P

1. Current capability/MFA/session helpers used by reviewer RLS, proof-read policy and every privileged RPC, not only the Next website. Distinguish manager reviewers, property moderators and platform administrators without user-editable role metadata.
2. Versioned `cs_manager_review_v2` command with exact checklist schema/version, meaningful reason, expected revision and request UUID. Store the authoritative decision/confirmations, actor/time and grant event atomically. **Revoke ordinary execution of the legacy review RPC or replace it with a rejecting/delegating guard that cannot accept a checklist-free transition.** A BFF-only check leaves a direct API bypass.
3. Versioned access-change operation with expected authorization version/idempotency, separate administrative capability, actor/reason and before/after audit. Preserve paused suspension/revocation. Legacy reactivation must not bypass these new guards.
4. New authorized queue/detail/history and private evidence-read projections; private manager-review notes with no applicant SELECT. Contact email/city/initials are not existing H1.3 application columns. Avoid broad Auth Admin API enumeration to fill them.
5. Server-generated privilege-change audit, separate grant event or explicit authorization before/after in the approval event; reviewer-assignment edits currently lack application audit coverage. Add rejected-case appeal/reopen only after a separately approved policy; rejected is currently terminal.
6. Keep version-1 mobile state DTO compatibility or add an explicit version-negotiated successor; do not widen an existing parser using blanket casts. Historical reasons are not rewritten to meet new submission rules.

## 3. Proposed tables and invariants — not SQL/schema deployed

Use a separately reviewed security extension and a separately deployable property migration series. Names below are provisional. No automatically generated timestamps, function bodies or deploy files were created in H1.5.

| Proposed relation | Minimum fields / invariant |
| --- | --- |
| `campusstay_private.administrator_assignments` | Auth UUID, active, immutable grant ID, assigning operator reference/time/reason; no client self-grant |
| `campusstay_private.property_reviewer_assignments` | Auth UUID, active, approved scope (initially global moderation or explicitly assigned properties), attribution; no implicit manager-review capability |
| Existing `reviewer_assignments` extension | Remains canonical manager-reviewer assignment; effective capability helper unions explicit administrator/reviewer scopes rather than copying roles into profiles |
| `campusstay_private.privileged_sessions` | Verified Auth session UUID/user, server admission/MFA time, idle/absolute expiry, revoked time/version; no tokens, passwords or client-authored MFA timestamps |
| `campusstay_private.privilege_events` | Append-only assignment/session/admin changes with actor or bootstrap operator attribution and approval reference |
| `campusstay_private.manager_review_decisions` | Request UUID + hash, application/revisions, reviewer, decision/reason, checklist schema and boolean confirmations, server time; unique request and reviewed revision |
| `campusstay_private.manager_review_notes` | Application, scoped reviewer, note/version/time; confidential, no owner-readable snapshots |
| `public.properties` | Stable UUID, creator, current draft/submitted/approved pointers, responsible assignment reference, state/version; creator is not proof of legal ownership |
| `public.property_manager_assignments` | Property + Auth UUID + owner/editor responsibility, provisional/active/suspended/revoked, trusted grant evidence/actor/time/version; one explicit primary responsible assignment |
| `public.property_drafts` | Versioned editable address/description/category/contact and proposed room/media/amenity data; only permitted manager can edit; no direct moderation/publication fields |
| `public.property_revisions` | Immutable complete submission snapshot with property UUID/revision, submitter/time, address/location/contact/category/description; unique property/revision |
| `public.property_rooms` | Stable room UUID/property, Single/Shared category, retired_at; unique active kind per property. Studio only historical, never a new selectable kind |
| `public.property_room_revisions` | Composite property/revision/room FKs; capacity (Single=1, Shared≥2), integer monthly ZAR cents, declared nonnegative room count, description, furnishing/bathroom/funding claim; no live-vacancy or verified-funding inference |
| `public.property_media` | Stable ID/property/owner, private canonical key, reservation/scan/ready/quarantine state, verified size/type/dimensions/hash, sanitised derivative reference; no arbitrary remote URL |
| `public.property_revision_media` | Revision/media/optional room link, order, alt/caption; exactly one ready cover required on submission, no cross-property attachment |
| `public.property_revision_amenities` | Revision/category/declared detail, unique category, claim source; no photo-derived verification flag |
| `public.universities` / `public.property_revision_campuses` | Proposed controlled campus reference data and same-revision associations for existing Explore university filters. Approved coordinates/distance provenance are explicit; no automatic geocoding service or invented travel distance |
| `public.property_authority_documents` | Private per-property ownership/management proof metadata, independent from marketing images/student docs; reserved/checked/retained lifecycle |
| `public.property_reviews` | Immutable target revision, exact six confirmations/schema, action/reason/reviewer/time, idempotency and before/after version; one final decision per submitted revision |
| `public.property_publications` | Property/approved revision, responsible trusted assignment, requested state/version, published/unpublished/blocked time and reason; never sufficient by itself to expose data |
| `public.property_events` | Append-only property/assignment/review/publication transitions; trusted actor, target/revisions, reason and correlation ID; confidential content excluded |
| `campusstay_private.property_review_notes` | Scoped internal moderation notes, revisions and authorship, separate from manager-visible feedback |

Enable RLS and narrow explicit grants on every exposed relation in the same migration transaction. Private tables get no ordinary client DML/read grants; trusted helpers must still derive actor/capability and set empty search paths. Revoke PUBLIC EXECUTE on newly created functions and inspect effective defaults. Index FK, ownership, status/cursor and policy lookup columns. Revisit `SECURITY INVOKER` versus minimal definer helpers to avoid recursive RLS and exposed owner-bypassing views. These are proposed rules, not assertions that policies exist.

Student persistence is a separate contract gate: proposed student profile/favourites, `student_applications` with immutable property/room/rent snapshots and private `student_application_documents`. Do not create bookings, payments, messages or funding-verification schemas by inference. Their current local models remain local until separately designed and approved.

## 4. Proposed operation/adaptor map

| Domain | Proposed interface / operation | Authorization / result |
| --- | --- | --- |
| Admin identity | `cs_admin_context`; `cs_admin_open_session` / close-session | Verified identity/MFA/current assignment; minimum capabilities/readiness/session DTO. No client role choice |
| Manager review reads | `ManagerReviewReadApi.list/get/history`, `cs_admin_manager_queue/detail` projections | Submitted cases only, scoped capability, cursor pagination, whitelisted application/proof/actor display fields |
| Review write | `ManagerReviewApi.decide` → versioned guarded manager review RPC | Server validates three confirmations for approval and reason; returns actual revision/decision/time/request ID |
| Manager access | `ManagerAccessApi.setState` → hardened versioned authorization RPC | Explicit access-management capability, no self-change, expected version, containment usable while paused |
| Notes / directory / audit | Separate private notes RPCs; minimal authorised directory/aggregate/history projections | Distinct scope; no browser Auth Admin API, no generic `auth.users` SELECT, no secret-key enumeration |
| Private evidence | Proposed same-origin GET `/api/admin/manager-applications/:id/evidence/:documentId` | Current identity/AAL/capability/session and exact parent document; no arbitrary path, no-store streamed bytes |
| Manager property writes | `ManagerPropertyApi` → proposed create/save/submit/retire-room/reserve-media/finalize-media operations | Current global and property-specific access; row/revision locks and field whitelist; stable IDs and full aggregate save |
| Property moderation | `PropertyModerationApi` → proposed queue/detail/decide RPCs | Scoped moderator, self/ownership conflict denial; exact submitted revision, six checks for approval, reason/request ID |
| Publication | Proposed publish/unpublish/contain/reassign operations | Current primary property assignment + global access + approved exact revision; no manager direct published-state write |
| Student catalogue | `PublishedListingApi.list/get/rooms/media` | Same eligibility predicate on all paths; default confirmed-user access consistent with existing app |
| Student applications | Proposed `StudentApplicationApi` / `StudentDocumentApi`, separately approved phase | Own records, live eligible room at new submission, immutable historical snapshot; no local fake-success fallback |

## 5. Client contracts and environment inventory

| Existing source | Mapping / required future change |
| --- | --- |
| `src/verification/domain.ts` + `api.ts` | Actual version-1 own-state/application parser and RPC adapter; do not use as reviewer queue parser because it enforces applicant ownership |
| `src/auth/controller.ts` / `AuthContext.tsx` | Validated account identity and session-only student/manager intent; authorization remains separate |
| `src/verification/useManagerVerification.ts` | Current refresh/focus/foreground/15s fallback and Realtime invalidation; retain fail-closed transitions, add targeted error/revocation coverage |
| `src/screens/AccountScreens.tsx` | Real verification form only when ready; guarded Manager route still renders local portfolio; proposed read-only saved-status display during readiness pause |
| `src/manager.ts`, manager gallery/state providers | Local property/application/funding-review prototypes, not admin manager-verification records; substitute typed remote repository only in approved phase |
| `src/data.ts`, `ApplicationContext.tsx`, `navigation/types.ts` | Current static catalogue and full Property route objects; application submission explicitly looks up static properties. Move to ID/repository resolution and immutable snapshots before real catalogue IDs enter Apply |
| Admin `contracts.ts` | `ManagerApplication` matches H1.3 DTO; `ApplicationView` email/city/notes/history are UI projections. Split read DTOs and privileged command DTOs |
| Admin H1.4.1 preview envelope | Confirmation string, synthetic reviewer and preview timestamp are client metadata, never trusted server evidence |
| Admin `property-contracts.ts` | Frontend-only model. SVG literal paths, synthetic source, float major-unit rent and `published_example` are not a real schema. Add separately discriminated server DTO and authenticated media descriptors, integer-cent conversion and real publication state |
| Admin `future-adapter.ts` | Intentionally throws, no network client; remains disconnected until approved DAL/API integration |

No shared monorepo package exists. Start with versioned pure contracts/runtime decoders in a deliberately approved location; avoid importing native code or the web React tree into one another. Generated DB types must come from an approved verified schema artifact, not a guessed live introspection or service key in CI.

The published listing DTO must cover the existing discovery needs deliberately: university association, city/address, optional reviewed coordinates and distance provenance, rules and declared amenities/room mix. Do not fill missing ratings, reviews, response times, funding eligibility or generic `verified` fields with fixture values. Those have no approved persistence/verification contract. Public contact fields require explicit listing consent and moderation; an Auth email is not automatically a public property contact.

| Variable / location | Existing or proposed use |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | E: mobile public project settings, root local `.env.local` (Git ignored); no values read/printed here |
| `EXPO_PUBLIC_ENABLE_MANAGER_PREVIEW=false` | E: requires development build + exact `true` + verified user; production denies preview |
| `ADMIN_MOCK_MODE=1` | E: development-only admin flag; production build/server reject it. Not a real integration switch |
| Edge `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` / fallback `SUPABASE_ANON_KEY` | E: runtime URL/public key; user-scoped client |
| Edge `SUPABASE_SECRET_KEY` / fallback `SUPABASE_SERVICE_ROLE_KEY` | E: Edge runtime only, narrow finalizer use; never mobile/web public configuration |
| `ADMIN_SUPABASE_URL`, `ADMIN_SUPABASE_PUBLISHABLE_KEY`, `ADMIN_ORIGIN`, `ADMIN_INTEGRATION_ENABLED` | P: server-only web configuration in admin-specific ignored env/deployment store. Disabled by default; no Next public credentials needed for the recommended server-only BFF |
| Optional `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | P alternative only if a separately approved browser-auth SSR design is chosen; absent today. Never a privileged key |
| `H13_STAGING_REF`, `H13_APPROVED_STAGING_REF`, `H13_STAGING_URL`, `H13_ALLOW_STAGING_MUTATIONS` | E: guarded hosted runner target/approval inputs; not configured/run here |
| `H13_STAGING_PUBLISHABLE_KEY`, `H13_STAGING_SERVER_KEY`, `H13_STAGING_MANAGEMENT_TOKEN`, `H13_STAGING_EXPIRED_JWT` | E: private isolated-test inputs only; no live credentials/CI defaults |
| `H13_MODE=local-staging`, `H13_LOCAL_URL`, `H13_LOCAL_DATABASE`, `H13_LOCAL_PROJECT_ID`, `H13_ALLOW_LOCAL_TESTS` | E: strict local-runner gates; generated credentials loaded only after runtime identity checks; no root dotenv inheritance |

No env file or variable was created or changed. Staging/domain names, new callback origin and exact package versions for planned SSR dependencies require later approval/compatibility verification.
