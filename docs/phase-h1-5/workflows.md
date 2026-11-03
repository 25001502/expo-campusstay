# H1.5 — Manager verification, property moderation and storage workflows

[Plan index](README.md) · [Exact contracts](contracts.md) · [Identity/MFA](identity-and-admin.md) · [Testing/approvals](deployment-and-roadmap.md)

E refers to local implementation, never a deployment assertion. P is the recommended integration/extension. No sequence was executed against Supabase in this phase.

**Later local implementation:** [H1.5B1](../phase-h1-5b1-manager-review-security.md) adds the locally tested review/access/notes extension and blocks legacy write bypasses. Its `manager-review` v2 command supersedes the earlier proposed wire discriminator for actual future integration; the old proposal remains a pure specification. The manager/property sequences below remain the target integration architecture, not deployed or connected workflows.

## 1. Manager verification: complete request/response map

| Step, data source | Actor and permission | Operation / contract | Validation and failure handling | Audit / UI destination |
| --- | --- | --- | --- | --- |
| 1. Registration, Auth | New ordinary account; no manager/reviewer privilege | E shared `auth.signUp` with full_name and `emailRedirectTo=campusstay://auth/confirm`; manager intent is local only. Existing account signs in rather than registers again | Existing field/password checks; server confirmation required. Session returned by unexpected auto-confirm configuration is signed out locally, not treated as verification success; generic account errors | Auth service logs, not a fabricated CampusStay application event; Confirm email screen |
| 2. Email confirmation / login, Auth | Same identity, confirmed email required | E mobile validates exact callback, exchanges PKCE code and validates `getUser`; ManagerLogin sets navigation intent, not role | Reject wrong scheme/host/path, replay/invalid/expired code, callback fragment credentials and mismatched user. Recovery uses its separate flow and requires normal sign-in after password change | Auth service logs; ManagerRequest after manager sign-in, Student Home remains available after authentication |
| 3. Resume state, application/authorization/configuration | Confirmed applicant, own records | E `cs_manager_state()` returns version 1, readiness, own application/proof metadata and independent access | Missing RPC/schema or false/misconfigured ready → setup unavailable, no fake draft/submission or role. Network failure removes old workspace access. P read-only saved-status presentation while paused | Read is not a new submission event; draft/status/paused UI according to actual response |
| 4. Save draft, application table | Confirmed owner, ready, draft or needs_information | E `cs_manager_save_draft(p_fields,p_revision)` → whitelisted application DTO | Exact field whitelist/string types/revision, identity-derived applicant, display name is not verified identity. `40001` → retain unsaved fields, reload/resolve conflict; no blind overwrite | Server `draft_saved`, current revision; editable verification form |
| 5. Select/reserve evidence, document table | Same owner, ready/editable | E native/browser picker + local validation; `cs_manager_reserve_proof(application,revision,name,mime,size)` → document ID/canonical path | PDF/JPEG/PNG, ≤5 MiB, safe filename/extension/bytes, quota ten reservations/24h; cancellation makes no upload. Rate limit `54000` → safe limit message | Server `proof_reserved`; form shows uploading, never claims finished |
| 6. Private upload, Storage | Owner user JWT, exact live reservation | E upload to `campusstay-manager-verification`, content type, cacheControl 0, `upsert:false` | Storage RLS checks recorded path/owner/editable state/expiry/readiness. No arbitrary path or overwrite. Failed/unknown response → refresh current proof before retry; retain prior proof, no client deletion | Reservation remains; no current custom Storage-upload audit event. P privacy-preserving operational upload observation, not a false `proof_verified` event |
| 7. Finalize, Edge + SQL | Confirmed owner user JWT; narrow Edge server credential only for final commit | E POST `{document_id,revision}` to finalizer; owner-filtered read/download, actual size/signature/hash; privileged finalize RPC attaches proof | Gateway plus handler verification; readiness checked before byte read and inside SQL. 401 reauthenticate, 403 no permission, 422 invalid file, 503 paused/setup, 409 unknown outcome → reload state. Do not send caller-supplied owner/path/hash | Server `proof_verified` and revision advance only after commit; UI confirms only if state reload contains the reserved proof ID |
| 8. Submit, application/proof | Owner, ready, complete editable application with attached ready evidence | E save latest draft then `cs_manager_submit(id,revision)`; own-state reload | Locked row, field/proof validation, stable application ID; pending retry returns same result/event. No user-selected approval/funding/access field | Server `submitted`, real submission timestamp; Pending status. No manager workspace access yet |
| 9. Admin queue/detail, submitted records | P admitted MFA reviewer/admin with manager-review scope | P guarded BFF → user-JWT queue/detail/history projections; current H1.3 RLS admits trusted reviewers to submitted cases, not never-submitted drafts | Filter/order/cursor allowlist, bounded page size (proposed 50), exact case scope, no `auth.users` enumeration to fill sample fields; failure shows unavailable/forbidden, never synthetic fallback | P optional access event for sensitive case views; actual review queue/detail page |
| 10. Evidence review, document + private bytes | P current MFA/case-scoped reviewer, no self-review | P case/document-ID evidence route; resolve recorded path through authorized DB row, then authenticated Storage download | Parent/child ownership and ready/current-or-authorized-history selection; no-store attachment/sandbox, no arbitrary path proxy. 401/403/404 generic; no document byte/path logging | P evidence-access audit with actor/case/document/time, never bytes; manual review remains human judgement |
| 11. Information request/reject/approve, locked application | P current admitted MFA reviewer/admin, not applicant; ready | P `cs_manager_review_v2` with target, expected revision, decision, reason, request ID, checklist schema/confirmations; no old unguarded public review path | All reasons satisfy server copy rules; approval additionally all three confirmations. Validate current assignment and evidence reference; stale state 409 → reopen fresh details, no automatic replay. Same request ID+same payload returns committed result; changed payload conflicts | P authoritative decision record + H1.3 event; reviewer/UTC time/revisions from server. Manager sees applicant-visible reason, internal notes remain private |
| 12. Manager permission update, authorization | Trusted transition in same approval transaction | E legacy approval already inserts active authorization atomically; P v2 preserves this and adds explicit grant/before-after audit | No privilege merely from client status. Failed grant/decision/audit rolls back the whole transaction. Need-info/reject create no manager authorization | Approval + grant audit; manager's next own-state read determines workspace eligibility |
| 13. Workspace / status refresh, own state | Confirmed manager, ready + approved + active access | E focus/foreground/Realtime/15s fallback; ManagerAccess guard. P future portfolio operations additionally enforce current property-specific access | Revalidation/loading/background blocks interaction; permission loss/error removes protected data/access. Never fall back to production development preview | Workspace only after authoritative state. Existing contents still local until P property repository replaces them |
| 14. Suspend/revoke/reactivate, authorization | E current reviewer/no self; P separate current administrative access-management scope and MFA/session/version controls | E `cs_manager_set_authorization`; P versioned hardened replacement | Existing suspended/revoked transitions allowed during pause, active denied until ready. P same-payload idempotency/expected access version and transaction ordering. No implicit reactivation on login/readiness restore | Server state event; P explicit before/after grant data. Manager remains a student, sees access-unavailable status; future property catalogue suppresses affected listings |

Current rejected cases cannot edit/reapply because the schema has one lifetime application per applicant and the editable states are draft/needs_information. Keep rejection terminal until an explicit appeal/reopen contract is approved. Suspended/revoked are authorization states; the application can remain approved. Readiness false denies workspace access even for an approved active manager.

```mermaid
sequenceDiagram
  participant M as Manager mobile
  participant A as Supabase Auth
  participant D as PostgreSQL RPC and RLS
  participant S as Private Storage
  participant F as Prepared finalizer Edge
  participant W as Proposed admin BFF
  M->>A: Sign in / confirm existing account
  A-->>M: Validated user session, no manager role
  M->>D: Own state; save draft with expected revision
  D-->>M: Stable application ID and revision
  M->>D: Reserve proof metadata
  D-->>M: Owner-bound document ID and canonical path
  M->>S: Upload bytes with user JWT, no upsert
  S-->>M: Upload acknowledgement, not attached proof
  M->>F: User JWT + document ID + revision
  F->>A: Verify current confirmed user
  F->>D: Owner-scoped readiness/document lookup
  F->>S: Owner-JWT download; inspect bytes/hash
  F->>D: Narrow server-only finalize with derived actor
  D-->>F: Atomic proof/revision/event commit
  F-->>M: Safe response
  M->>D: Reload proof; submit; reload pending state
  D-->>M: Pending, timestamp, no workspace access
  W->>D: Future MFA/capability-checked queue and evidence access
  W->>D: Future v2 decision with revision/checks/reason/request ID
  D-->>W: Authoritative decision; approval and access grant commit together
  M->>D: Revalidate own state after invalidation/focus
  D-->>M: Ready AND approved AND active => authorised
```

## 2. Proposed property lifecycle and publication

All property tables/RPCs/Storage workflows in this section are **P**. They must deploy separately from manager verification.

### Property-specific authority is a separate gate

An H1.3 application records a business name/location and management declaration; it does not grant authority over arbitrary future property UUIDs. A globally active manager can create a private draft and receive only a **provisional draft assignment**. A scoped moderator must validate property-specific authority and activate its trusted assignment through an audited operation. Proposed private property-authority evidence is separate from marketing photos and student files; reusing H1.3 evidence requires an explicitly authorized reference and scope, never silently broader document access.

Start with one designated primary responsible assignment per publication. Additional active editors may manage according to scope but do not automatically take over publication responsibility. If the primary is revoked/suspended, block visibility even if another editor remains active. Reassignment requires a trusted action and renewed review when responsibility/authority materially changes; this conservative choice requires product approval.

### Request/response sequence

| Stage / data | Actor / required permission | Proposed operation and returned data | Validation, failure, audit and UI |
| --- | --- | --- | --- |
| Create private draft | Confirmed active platform manager | `ManagerPropertyApi.createDraft` with request UUID → one stable property UUID, provisional assignment, draft/version and distinct stable room IDs | Derived creator; global access/ready check; atomically validate/save all Single/Shared sections, no partial duplicate property on retry; `property.draft_created`; existing manager editor |
| Edit aggregate | Current allowed provisional creator or trusted property editor, active globally | Save whitelisted address/description/category/contact, room rows, amenity claims and media references using expected version | No owner/status/publication writes; Single capacity 1, Shared≥2, integer ZAR cents, nonnegative declared quantities, unique active type; same-parent FKs. Conflict preserves local form and offers authoritative reload; `property.draft_saved` |
| Reserve/upload/finalize gallery | Same permitted manager, editable draft | Reserve private media → canonical property-scoped key; JWT upload; trusted validation/sanitisation → ready media metadata | Size/type/pixel limits, no path/remote-URL injection, image decode/EXIF removal/malware decision, no overwrite. Originals private, derivative only when approved; no success until authoritative ready; media events |
| Establish property authority | Scoped MFA moderator/admin, no ownership conflict | Read submitted authority packet, record decision, activate exact assignment with evidence reference/version | Applicant declaration/checkmark insufficient. No self-grant, no cross-property evidence, no authorization from client status; `property.assignment_activated`; blocked explanation until complete |
| Submit | Permitted manager with complete editable draft | Submit expected version/request ID → immutable property revision, snapshot room/media/amenity links, pending review | Ready cover required; room/price/claim validation; same-property associations; freeze evidence version. Proposed conservative policy: unpublish previous revision on resubmission; no draft changes leak. `property.submitted`; manager status / admin queue |
| Read queue/detail | Current MFA property moderator/admin with scope | Page/cursor query and detail DTO for submitted revision, current manager/assignment eligibility, scoped media/history | Never load all private drafts into browser; missing/forbidden safe handling; sensitive evidence access audit; existing full property review UI |
| Review | Same moderator, no self/beneficial-interest conflict | Decide exact revision/version/request ID with feedback and checklist → decision DTO, server timestamp | Meaningful reason for all actions; six confirmations plus current global/property manager eligibility for approval. No checklist proves factual authenticity. Need-changes/reject do not require approval confirmations; `property.reviewed`; decision locks |
| Request changes/reject | Authorized reviewer | Changes-requested permits a new draft revision/resubmission; rejected revision remains immutable | Feedback visible only to appropriate manager, not internal notes. A new submission gets a new review revision; no old approval carried forward; event + actual status |
| Publish | Explicit publish capability, not ordinary manager | Separate publish request with approved revision, primary assignment and expected versions → current effective publication result | Recheck every eligibility condition under locks; approval alone does not publish. Both trusted manager/property-specific access and approved exact content required; `property.published`; student projection only after commit |
| Student catalogue / property / rooms / media | Default confirmed student identity, preserving current Auth gate | ID/cursor-based published DTO query with identical eligibility predicate everywhere | Only approved publication revision and active listed rooms; no draft contacts/media/revisions, no live vacancy or funding guarantee. Ineligible direct IDs return unavailable/404. No fallback to real-looking synthetic records |
| Suspend/revoke/withdraw/unpublish | Authorized containment operator; manager may request own withdrawal under policy | Transaction changes authorization/assignment or publication source; returns authoritative unavailable/blocked state | Reevaluate live reads immediately after commit; containment not blocked by submission pause. Audit actor/reason/before-after. Cache eviction/status materialization follows but is not security enforcement |

Use integer minor units end-to-end for new prices; format as ZAR at presentation. Preserve immutable submitted rent/room snapshots in any future student application. Room retirement removes it from new selection, not historical records; no destructive replacement of IDs or renaming Studio to Single. Existing mobile retired Studio fixtures remain historical only and are not silently imported.

### Publication invariant

A student-visible property revision must satisfy **all** of:

1. Catalogue-serving readiness is enabled; initial integration also respects H1.3's current ready-dependent manager authorization semantics.
2. A publication record explicitly targets this exact immutable approved revision and is not manually unpublished/withdrawn/blocked.
3. The primary responsible assignment belongs to this property and manager, is trusted/active and has not expired/revoked.
4. That manager still has an approved manager application and active independent global authorization.
5. Required approved media is ready, links belong to this revision/property, and the requested room is part of this approved snapshot, active/nonretired and declared listed.

Implement one audited eligibility definition shared by catalogue list/detail/search/count, room lookup, media delivery and future new-application validation. Do not expose base revisions/rooms/media to students with only a property-level predicate: child rows must match the **current approved publication revision**, otherwise a valid public parent can leak an unreviewed draft. Prefer whitelisted published-read RPCs or carefully proven `security_invoker` views/RLS; never an owner-bypassing default view exposing all columns.

Revoking a global manager authorization or primary property assignment makes new reads ineligible after that transaction commits, without waiting for Realtime, a timer or a bulk update of cached `published=true` rows. Existing materialized publication metadata may be reconciled asynchronously, but no access decision trusts it alone. Do not automatically republish after reactivation: require an explicit current publish/review eligibility check and audit. Already delivered data and in-flight responses cannot be erased; public CDN URLs are therefore not the default delivery mechanism.

```mermaid
sequenceDiagram
  participant M as Active manager
  participant D as Proposed property RPC and RLS
  participant R as Scoped moderator through admin BFF
  participant S as Student catalogue
  M->>D: Create/save complete property draft with request ID/version
  D-->>M: Stable property/room IDs; provisional scope only
  M->>D: Finalised private images and property-authority packet; submit
  D-->>M: Frozen submitted revision, not published
  R->>D: Review property authority; activate trusted property assignment
  R->>D: Decide exact submitted revision with six checks and reason
  D-->>R: Approved revision and audit, still not published
  R->>D: Explicit publish with current responsible assignment/version
  D-->>R: Eligible publication committed
  S->>D: List/get room/media with the same eligibility predicate
  D-->>S: Whitelisted approved snapshot only
  R->>D: Suspend global access or revoke primary property assignment
  D-->>R: Containment commit and audit
  S->>D: New list/detail/media/application-target request
  D-->>S: Listing unavailable, regardless of old cached publication status
```

### Locks and atomicity

Specify one lock order before implementation: capability/session admission → relevant readiness configuration → manager authorization → property assignment → property aggregate → submitted revision/decision/publication. Short trusted transactions recheck all conditions after locks; no file download, scanning, email or external HTTP occurs while holding these locks. Use statement/lock timeouts and conflict-safe retries only where idempotency proves the outcome.

Access deactivation and workflow writes must serialize on the same relevant authority rows. An admitted write can finish before containment commits; after containment commits later writes must fail. Current H1.3's shared readiness-row lock is implemented, but reviewer-assignment deactivation races and the proposed property lock order need new real two-session tests. Sequential PGlite tests do not establish concurrency correctness.

## 3. Storage separation, delivery and retention

| Data class | Existing/proposed private store | Who may write/read | Lifecycle and delivery |
| --- | --- | --- | --- |
| Manager verification evidence | E prepared `campusstay-manager-verification` | Owner reserved upload; owner/current manager reviewer of submitted case can read; Edge finalizes | No ordinary overwrite/delete/public URL; new object for replacement; old proof retained. Default admin BFF streams authenticated bytes |
| Property authority evidence | P `campusstay-property-authority` | Current applicant/assignment claimant and explicitly scoped authority reviewer, not every gallery viewer | Separate object reservations/checked attachment and confidential access audit; never a public/gallery derivative |
| Property gallery originals | P `campusstay-property-gallery-private` | Current permitted property editor; scoped moderator for submitted revision | Reserved uploads, decode/size/dimension checks, sanitised derivative, immutable revision links; originals never public |
| Approved gallery derivatives | P separate private derivative bucket, proposed `campusstay-property-gallery-approved` | Trusted processing writes; eligible listing readers only | Authenticated Storage/RLS delivery or eligibility-checked proxy, no-store/private caches initially. Approval does not make originals public |
| Student application documents | P `campusstay-student-application-documents` | Student owner; explicitly permitted current property/application recipient, with minimal categories and purpose; admin access not automatic | Independent ownership/consent/retention contract; no manager-verification bucket reuse. Current device staging remains local, not a server upload |

Private downloads support JWT-authorized retrieval and signed URLs; public bucket retrieval bypasses read access controls. Therefore initial recommendation is **no public bucket and no signed evidence URLs**. If a later approved viewer requires a signed URL, cap it at a proposed 60 seconds, issue only after fresh scope/MFA checks, never log/embed/cache it, and acknowledge that the bearer link can outlive a role change until expiry. For student gallery performance, a future public derivative bucket is optional only after explicit approval of public exposure, cache/expiry revocation bounds, takedown and privacy procedures. It cannot meet strict immediate read revocation merely through RLS. [Supabase bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Upload validators derive owner from verified JWT and keys from a server reservation, cap actual bytes, validate extension/MIME/signature and ownership, prohibit traversal/arbitrary remote URLs and reject attachment to another case/property. Proposed production processing adds full image decode/re-encode, EXIF/GPS removal, pixel limits and malware/quarantine handling; H1.3 currently checks signatures/hash only. Review proof of authority manually; neither a valid PDF nor a checkbox verifies truth.

Replacement creates a new reserved object and updates the attached reference only after verified commit; retain previous evidence/audit. Do not enable upsert to make retries convenient. Retention/deletion is trusted lifecycle work: proposed abandonment quarantine after 24h reservation expiry, proposed orphan cleanup after a reviewed grace period, legal holds and purpose-based evidence retention all require approval. Auth FKs currently have NO ACTION deletion semantics; do not delete users/documents or change cascades to resolve a retention conflict. Delete Storage bytes using supported APIs and reconcile metadata, never raw `storage.objects` deletion as file cleanup.

## 4. Durable audit and confidential notes

Existing H1.3 events are server-generated, owner/reviewer-readable under RLS and deny ordinary writes. They record actor/application/action/time/reason/revision/document and a whitelisted application snapshot. Approval currently implies an inserted authorization but has no distinct grant event/snapshot; reviewer assignment/operator changes and document views have no custom audit table. H1.4 preview arrays are not evidence to migrate.

Target audit records append immutable-in-normal-operation server events for verification submission/decision, access grants/reactivation/suspension/revocation, admin/reviewer assignment changes, property assignment/submission/review/publication/unpublication, private evidence views and relevant session containment. Store event UUID/sequence, target type/ID, Auth actor or explicitly attributed bootstrap operator, server UTC time, reason, prior/resulting revisions/state, checklist schema/decision reference and request/correlation ID. Do not place secrets, documents, private note text, tokens or full account dumps in general event JSON. A database operator can still alter data; operational tamper evidence/export controls and restricted operator access are required before claiming stronger immutability.

Decision/grant/domain event commits must be atomic; privileged write audit failure rolls back the write. Sensitive evidence delivery must record its access authorization event before releasing bytes; inability to write that event fails the delivery. Denied actions go to sanitized security logs without identifying inaccessible applicants. No notification is claimed unless a future approved delivery service/outbox confirms it.

Applicant/manager-visible reasons remain distinct from confidential internal notes. Owners may read only the intended feedback/history projection; private note tables and their history have no owner SELECT and never enter public application snapshots or general owner-visible events. Limit length, version note edits and render escaped text. Retention duration, deletion/legal hold, operator access and redaction approvals are unresolved governance decisions, not invented statutory guarantees.

Audit Logs UI mapping: action → authoritative event type; target → authorized case/property reference/name projection; actor → scoped display identity or pseudonym (never fabricated authenticated reviewer); time → UTC persisted, SAST display; outcome → committed decision/result; reason → visibility-filtered reason; revision → recorded before/after versions. Email, city and user-directory fields need separately authorized projections. Provide bounded cursor search by action/target/actor/date and indexed filters; no unauthenticated analytics/count leak. Manager-reviewer scope does not automatically expose property/student events.

## 5. Mobile integration without rewriting screens

- Keep `AccountController`, native secure session storage, separate login intent and confirmed-user Student Home. Existing account → ManagerRequest resumes its own H1.3 draft after state reload, never a second Auth account or self-assigned role.
- Retain `VerificationController`'s save/reserve/upload/finalize/reload/submit flow. Preserve dirty fields on conflicts and previous attached proof on failed uploads. Add a read-only known-status presentation during a pause without collecting new evidence or reopening Workspace; current provider can hold a ready=false state while current unavailable UI does not render that saved detail.
- Bind future `ManagerPropertyApi` to current authorized property IDs/versions, not `createManagerState` fixtures. Global manager approval unlocks only the eligibility guard today; it does not make local portfolio, tenant, funding-review or application prototypes real. Any tenant/student-data integration is a separate ownership/consent contract.
- Introduce versioned `PublishedListingApi` with runtime decoding, stable ID routes and explicit unavailable states. `Property`/Apply currently pass whole fixture objects, and `ApplicationContext.submitApplication` looks up the static `properties` array. Merely changing Explore to real IDs would break validation and permit misleading local “submission” behaviour. Coordinate repository resolution for Home/Explore/Favourites/Compare/Details/Apply, room snapshots and retirement before a live-catalog toggle.
- Do not enable real Apply against a live listing until a real, separately approved StudentApplicationApi exists. A temporary read-only live catalogue requires explicit product approval and honest unavailable Apply controls; preserve local historical application/document state as distinctly local, never silently upload/merge it. No booking, funding verification, payment or message delivery is implied by integration.
- Preserve historical room IDs/snapshots, including retired Studio references, while new selectable server offers are Single/Shared only. Do not infer a production ID mapping from matching fixture names. Current `available` fields are declared quantities, not live vacancies, and `verified` booleans must not turn moderation into guarantees of factual accuracy.
- `RemoteImage` already accepts the Expo Image source type; a future authenticated media descriptor can supply appropriate headers/private cache policy without putting tokens into URLs. Admin's SVG-literal image type needs a separate server-media DTO, not a cast. Private student local URIs/files remain under existing ownership/cleanup until an explicit upload step is approved.

No mobile screen, adapter or navigation was edited in H1.5.
