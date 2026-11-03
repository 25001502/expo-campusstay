# H1.3 read-only deployment preflight — 2026-10-21

**Decision: no observed remote object conflicts; NOT ready to enable live manager submissions. No deployment or activation was performed.**

The existing CampusStay production project was inspected through its already authenticated Supabase dashboard. The CLI had no saved access token; the installed Supabase plugin exposed no callable project tools in this session. Neither connection was reconfigured. The existing `supabase/preflight-manager-verification.sql` was executed, followed by supplementary catalog-only SELECT queries, each enclosed in `BEGIN READ ONLY` / `ROLLBACK`. No migration, bucket/policy change, Edge deployment, reviewer/manager assignment, login, upload or readiness change was executed. SQL Editor queries were not explicitly saved as snippets; the service may retain ordinary query history/access logs.

Only this local report was added. Existing implementation files, environment configuration, dependencies and Git index were preserved. No credentials, private documents, account emails or sensitive environment values are included.

## 1. Actual remote inventory and conflicts

| Item | Observed result |
| --- | --- |
| Target | Existing **CampusStay**, `main` / production, West EU (Ireland); dashboard reported Healthy |
| PostgreSQL | `server_version_num = 170011` (17.11); dashboard build `17.11.0.003` |
| Other service versions | Auth `2.197.0`; PostgREST `14.18` |
| Auth accounts | **2**, both email-confirmed; still 2 at the final SQL check |
| Application schema | `public` has **no tables, views, materialized views, sequences, columns or functions** |
| Application migrations | `supabase_migrations` schema / `supabase_migrations.schema_migrations` absent; dashboard reports **No migrations**. There is no existing application migration history to reconcile |
| H1.3 collisions | `campusstay_private`, all four proposed public tables and all `public.cs_manager_*` functions absent |
| Buckets and files | **0 buckets, 0 Storage object rows**; proposed bucket absent |
| Existing relevant policies | **0** policies in `public`, `campusstay_private` or `storage`; no conflicting policy names |
| Storage RLS | Enabled on both `storage.buckets` and `storage.objects`; not forced; owner `supabase_storage_admin` |
| Edge Functions | Dashboard shows **Deploy your first Edge Function**; no existing deployed function to replace |
| Data API | Exposed schemas: `public`, `graphql_public`; extra search path: `public`, `extensions`; automatic new-table exposure enabled; max rows 1000. No settings were changed |
| Realtime | `supabase_realtime` exists, not FOR ALL TABLES, currently contains **no tables**. `supabase_realtime_messages_publication` also exists |
| Backup | Project overview reports **No backups**. No recoverable backup/restore point was verified |

Other non-system schemas present: `auth`, `extensions`, `graphql`, `graphql_public`, `realtime`, `storage`, `vault`, plus the empty `public` schema. No private Vault values were queried.

Managed service migration histories are distinct from application migrations: Auth has **82** entries, latest `20260831180000`; Storage has **74** entries, IDs **0–73**, latest `73 / revoke-grants-to-unused-operations`; Realtime has **91** entries, latest `20261009120000`. Their version/name records were read without changing them. They must not be copied into, repaired as, or replayed through CampusStay's application migration history.

Required Storage columns exist with compatible types: objects `owner_id text`, `metadata jsonb`, `bucket_id text`, `name text`; buckets `public boolean`, `file_size_limit bigint`, `allowed_mime_types text[]`. Newer hosted columns default to Standard bucket type, disabled versioning, null lifecycle controls, and false object version/delete-marker flags. The proposed INSERT omits these fields and is consistent with those defaults. The bucket name is below the hosted 100-character limit. Existing lifecycle protection functions were read: they do not reject this proposed null-lifecycle INSERT on the inspected conditions. This is a catalog/source compatibility finding, not a write probe.

Remote `postgres` and `service_role` bypass RLS; `anon` / `authenticated` do not, are not login roles, cannot create roles, and have no membership path granting them `service_role`. `authenticator` is the normal NOINHERIT API switching role. The inspected SQL execution role is `postgres`, not a superuser and not a member of `supabase_storage_admin`. Managed Storage policy DDL must use the supported deployment path; no CREATE POLICY probe was attempted, even inside rollback. Validate that path in matched staging; do not change managed ownership or grant managed roles to bypass an error.

Default privileges for objects created by `postgres` in `public` currently grant table rights to `anon`, `authenticated`, `service_role`; function EXECUTE to those roles; sequence rights to them as well. The migration explicitly revokes PUBLIC/anon/authenticated rights on its new objects before granting narrow access. Existing service-role defaults remain trusted server access. There are **no global default-ACL entries**. No unexpected custom API role grants were found. Recheck effective ACLs after a future approved deployment rather than relying on automatic Data API exposure.

**Conflict conclusion:** no existing application objects, migration versions, bucket data or relevant policies conflict with the proposal. Exact hosted DDL execution, Storage HTTP semantics and deployed Edge behavior remain untested. The locally tested PostgreSQL engine is 18.6, not this target's 17.11.

## 2. Complete proposed migration inventory

Source: `supabase/migrations/20261021135040_manager_verification.sql`.

SHA-256: `4f920fc82e6ce6a8f82e1b015193e5b8eb0e480ba1254e76008aee93e754942f`.

One transaction; additive, intentionally not idempotent. It first aborts if either Storage table lacks RLS. Name collisions cause rollback rather than replacement. No DROP, TRUNCATE, Auth-user update, account seed, reviewer seed or manager grant is present.

### Six tables, one identity sequence, eleven explicit indexes

| Table | Fields and purpose |
| --- | --- |
| `campusstay_private.verification_configuration` | Singleton key, contract version constrained to 1, `finalizer_ready` default false. Seeds only `(true,1,false)` |
| `campusstay_private.reviewer_assignments` | Verified reviewer Auth UUID, active flag, assignment time, optional assigning Auth UUID, required 5–1000-character reason. Initially empty |
| `public.manager_verification_applications` | Stable UUID, unique applicant Auth UUID, name/phone/business/location/relationship, draft/pending/needs_information/approved/rejected status, revision, current proof ID, creation/update/submission/review times, reviewer UUID and reason |
| `public.manager_verification_documents` | Stable UUID, same-owner application composite FK, filename/MIME/size, unique owner/application/document path, reserved/ready state, SHA-256, creation/verification times |
| `public.manager_authorizations` | Applicant Auth UUID key, same-owner approved-application reference, independent active/suspended/revoked state, granting reviewer/time, update time and reason |
| `public.manager_verification_events` | Identity bigint key, application/actor/document references, constrained action, occurrence time, reason/revision and captured JSON application snapshot |

All six tables enable RLS. Composite FKs prevent cross-owner/application proof and authorization references. Proof is PDF/JPEG/PNG, 1–5,242,880 bytes, safe filename 1–160 characters, exact UUID path and canonical extension; ready proof requires hash and verification timestamp. Application relationship is owner/authorised_manager (or blank draft); field lengths and transition requirements are constrained. One lifetime application per user; rejected-case reopening is not implemented. Auth FKs use ordinary NO ACTION semantics: later account deletion needs an explicitly designed retention/deletion procedure.

Identity sequence: `public.manager_verification_events_id_seq`.

Explicit indexes: `manager_verification_review_queue`, `manager_verification_document_owner`, `manager_verification_document_application`, `manager_verification_history`, `manager_verification_reviewer`, `manager_verification_current_proof`, `manager_authorization_application`, `manager_authorization_reviewer`, `manager_event_actor`, `manager_event_document`, `manager_reviewer_assigner`. Primary/unique constraints additionally create their supporting indexes.

### Fourteen SECURITY DEFINER functions

Every function sets an empty search path and uses qualified application/Auth/Storage relations.

| Function | Enforcement / behavior |
| --- | --- |
| `campusstay_private.actor()` | Requires `auth.uid()` and an existing email-confirmed Auth user; otherwise SQLSTATE 42501 |
| `campusstay_private.is_reviewer()` | Checks current private active assignment plus confirmed Auth identity; does not trust metadata |
| `campusstay_private.application_json(application)` | Whitelisted application DTO and current ready-proof metadata; omits object path/hash/reviewer UUID |
| `campusstay_private.capture_verification_event()` | Trigger function replaces event snapshot with current application DTO |
| `campusstay_private.require_ready()` | Rejects unless server state reports readiness; SQLSTATE 55000 |
| `campusstay_private.read_proof(text)` | Exact recorded path; owner or trusted reviewer of a previously submitted case |
| `campusstay_private.write_proof(text,text)` | Own reserved path and object owner, reservation under 24 hours old, editable application, readiness flag enabled |
| `public.cs_manager_state()` | Own state/version/readiness/access. Ready requires flag plus exact private bucket contract. Access additionally requires approved application and independent active authorization |
| `public.cs_manager_save_draft(jsonb,integer)` | Confirmed owner, readiness, whitelist/string fields, row lock/revision; name from display metadata only; saves draft/corrections and audit event |
| `public.cs_manager_reserve_proof(uuid,integer,text,text,bigint)` | Own editable application, readiness/revision, filename/MIME/size validation, random stable path and maximum 10 reservations per rolling 24 hours; audit event |
| `public.cs_manager_finalize_proof(uuid,uuid,integer,text)` | Server-only RPC; confirmed actor, own editable application, reservation expiry/revision, existing object owner/metadata/hash checks; attaches checked proof and audit atomically; current ready proof retry is idempotent |
| `public.cs_manager_submit(uuid,integer)` | Own ready/complete application, locked revision and checked existing proof; pending transition/time/audit atomically; repeated pending submit returns existing application |
| `public.cs_manager_review(uuid,integer,text,text)` | Current trusted reviewer only; denies own application, requires pending state/revision/decision/reason; records decision and actor. Approval creates independent active authorization in same transaction |
| `public.cs_manager_set_authorization(uuid,text,text)` | Current trusted reviewer only; cannot alter own permission; requires approved application/existing assignment, valid state/reason; audited activate/suspend/revoke |

One trigger: `capture_verification_event`, BEFORE INSERT FOR EACH ROW on `public.manager_verification_events`, calling the private snapshot trigger function.

### Four application SELECT policies

All are permissive SELECT policies TO `authenticated`; there are no client INSERT/UPDATE/DELETE policies on these tables.

| Policy | Table / permitted rows |
| --- | --- |
| `manager_application_read` | Applications: own, or trusted reviewer with non-null submitted time |
| `manager_document_read` | Documents: own, or trusted reviewer linked to a submitted case |
| `manager_history_read` | Events: through a parent application visible to owner/reviewer under application RLS |
| `manager_assignment_read` | Authorizations: own, or trusted reviewer |

### Bucket and nine Storage policies

INSERT one private `campusstay-manager-verification` bucket, size limit **5,242,880**, allowed MIME types exactly `application/pdf`, `image/jpeg`, `image/png`. No existing bucket is updated or reused.

| Policy | Operation / effect |
| --- | --- |
| `manager_bucket_read_guard` | Restrictive SELECT TO PUBLIC on objects: other buckets unaffected; target requires `read_proof` |
| `manager_bucket_insert_guard` | Restrictive INSERT TO PUBLIC on objects: target requires `write_proof` |
| `manager_bucket_update_guard` | Restrictive UPDATE TO PUBLIC on objects: both old/new rows must be outside target |
| `manager_bucket_delete_guard` | Restrictive DELETE TO PUBLIC on objects: target excluded |
| `manager_bucket_read` | Permissive SELECT TO authenticated on objects: target plus `read_proof` |
| `manager_bucket_insert` | Permissive INSERT TO authenticated on objects: target plus `write_proof` |
| `manager_bucket_config_update_guard` | Restrictive UPDATE TO PUBLIC on buckets: old/new target bucket excluded |
| `manager_bucket_config_delete_guard` | Restrictive DELETE TO PUBLIC on buckets: target excluded |
| `manager_bucket_config_insert_guard` | Restrictive INSERT TO PUBLIC on buckets: target excluded |

Restrictive policies continue to constrain target-bucket access if unrelated permissive policies are later added. They do not restrict trusted roles that bypass RLS. No client overwrite/upsert/delete or public/signed evidence URL is introduced.

### All privilege changes and remaining statements

- CREATE private schema; REVOKE ALL schema privileges FROM PUBLIC.
- REVOKE ALL on all private tables FROM PUBLIC, anon, authenticated. No private table grants to clients.
- REVOKE ALL on the four new public tables and new identity sequence FROM PUBLIC, anon, authenticated; GRANT SELECT on those four tables TO authenticated.
- REVOKE ALL on all private functions FROM PUBLIC, anon, authenticated.
- GRANT USAGE on private schema TO anon, authenticated; GRANT EXECUTE on only `is_reviewer()`, `read_proof(text)`, `write_proof(text,text)` TO anon, authenticated for policy evaluation. They return booleans, not private records.
- REVOKE ALL on all seven public RPC signatures FROM PUBLIC, anon, authenticated.
- GRANT EXECUTE on state, save_draft, reserve_proof, submit, review and set_authorization signatures TO authenticated.
- GRANT EXECUTE on `cs_manager_finalize_proof(uuid,uuid,integer,text)` TO service_role only among ordinary API roles. DB owner/trusted pre-existing service privileges remain administrative authority.
- If `supabase_realtime` exists, ADD only new applications/authorizations tables. No existing publication entry is removed.
- NOTIFY `pgrst` to reload schema; COMMIT.

## 3. Security conclusion and limits of confirmation

Code inspection and **64 freshly passing local PostgreSQL checks** support the following: ordinary student/manager accounts cannot directly change application status, appoint reviewers, assign themselves manager access, finalize unchecked proof or read another applicant's verification rows/files. User-editable metadata cannot confer approval. Even an assigned reviewer cannot review their own application or change their own manager authorization. Owner/reviewer checks are evaluated against current server records, not a role cached in a JWT.

**Important precision:** `authenticated` is granted EXECUTE on the review/authorization RPCs so an authenticated reviewer can use them. Ordinary users can *invoke* those endpoints; their privileged actions are rejected inside the function with 42501. The claim “no student or manager can call the functions” would be inaccurate at the SQL execution-grant level. The security guarantee intended here is that they cannot successfully perform the privileged transition without a separately trusted reviewer assignment.

Trusted reviewers intentionally read other applicants' submitted cases and private evidence. DB owners/server credentials intentionally bypass client RLS. This is not protection against a compromised privileged operator or leaked server credential.

There are currently no H1.3 objects in the live project. No hosted cross-account requests, actual Storage upload/download, gateway denial or review mutation was tested: those would require deployment/designated QA state beyond this approval. Local fixtures do not certify live behavior after deployment. Private schema non-exposure and exact effective ACLs must be rechecked after creation.

## 4. Trusted reviewer assignment

A separately approved privileged operator will designate an email-confirmed Auth UUID and create an active private assignment with an assignment reason and attribution. Record operator identity/change approval externally for bootstrap if no assigning Auth UUID exists: `assigned_by` is nullable in the prepared schema. Subsequent reviewer deactivation is also trusted administration, not a user-editable profile action. No client grant permits private-table mutation.

No hardcoded email, requested login destination, registration claim, `user_metadata.role` or `app_metadata` role is used for reviewer/manager approval. Manager approval requires the audited review RPC; it creates an independent manager assignment. Manager grants never create reviewer assignments. Do not appoint either existing test account implicitly. Reviewer designation, audit ownership and credential handling remain manual decisions; the current migration does not enforce MFA or build an admin dashboard.

## 5. Existing accounts/data preservation

The remote baseline has two confirmed Auth users and no public application tables/buckets/Storage objects. Count and a non-disclosing aggregate fingerprint of Auth IDs/update times matched across the start/end SQL checks. No login, password/session/metadata modification, user creation/deletion, document read or application mutation occurred. This fingerprint is not a complete byte-level Auth backup.

The proposed migration has no Auth-user DML and no seed applications, reviewer assignments or manager authorizations. Existing accounts/data should remain unchanged by the additive deployment. New FKs do affect future account-deletion procedures. Future QA should use an isolated staging project and separately approved synthetic identities/data; do not silently modify the two existing accounts for smoke tests.

## 6. Edge Function security and unresolved integration checks

Files: `supabase/config.toml`, `supabase/functions/manager-verification-finalize/{index,handler}.ts`, strict `supabase/functions/deno.jsonc`, pinned `deno.lock`.

- Local deployment config keeps `verify_jwt=true`. The handler independently requires a Bearer token and Auth `getUser` with confirmed email. Platform validation alone is not treated as user authorization. Supabase's [current header guidance](https://supabase.com/docs/guides/functions/auth-headers) documents the gateway and user-JWT/API-key distinction; verify the actual hosted configuration/token combination after an approved deployment.
- Owner is derived from verified identity, not request JSON. Owner-filtered document SELECT and private download use that user's client/RLS. Only the final narrow RPC uses the server credential.
- POST body capped at 512 bytes; accepts only document UUID and nonnegative safe-integer revision. Wrong method 405, missing/invalid/unconfirmed identity 401, unavailable owner record 403, malformed/extra input 400, wrong file/size 422, uncertain failure 409; missing runtime configuration 503. Platform may return its own 401 before the handler. No raw exception/credential/path is returned or logged by this code.
- Bounds file to 5 MB and declared size; checks PDF/JPEG/PNG magic bytes, computes SHA-256; server RPC checks owner/Storage metadata/revision again. This is not malware scanning or proof of legal accommodation authority.
- Runtime names: `SUPABASE_URL`; `SUPABASE_PUBLISHABLE_KEY` or injected `SUPABASE_ANON_KEY`; server-only `SUPABASE_SECRET_KEY` or injected `SUPABASE_SERVICE_ROLE_KEY`. Values were not inspected. Secret presence/function runtime injection remains unverified. Privileged keys must stay in the trusted Edge environment, never Expo/browser bundles, repository, chat or command arguments. See [Supabase environment guidance](https://supabase.com/docs/guides/functions/secrets).
- CORS currently returns `Access-Control-Allow-Origin: *`, permits authorization/apikey/content-type/x-client-info, handles OPTIONS 204 and accepts only POST for work. It does not use credentialed cookies. Wildcard CORS grants no RLS/review authority. Hosted OPTIONS/gateway behavior was not tested. The fixed allow-header list omits tracing headers supported by the pinned SDK if tracing is enabled; setup-503 responses omit CORS. Browser support needs explicit preflight/error-path testing and, if required, a separately scoped correction before claiming web readiness. See [current CORS guidance](https://supabase.com/docs/guides/functions/cors). Native Android/iOS calls are not subject to browser CORS.

## 7. Deployment, containment and recovery — plan only

1. Obtain explicit deployment approval for the exact target and reviewed migration hash. Re-run read-only collision/history/ACL inventory immediately beforehand. Establish a verified recoverable backup/restore procedure; current dashboard reports no backups.
2. Use isolated staging matching PostgreSQL 17.11 and hosted Auth/Storage semantics. Deploy/test there only with separate authorization. Complete the security/upload/reviewer matrix below using synthetic QA data before enabling production.
3. Establish an authenticated supported deployment connection securely. CLI currently lacks credentials/link; do not paste tokens here. The proposed migration is the only local application migration. An approved migration dry run must show only `20261021135040_manager_verification.sql`; no reset, Auth replacement, history repair or unrelated migration replay.
4. Apply only the approved transactional migration through the established migration-history process. Readiness remains false; no reviewers/managers are seeded. Verify six tables, fourteen functions, thirteen policies, trigger/sequence/indexes, RLS, effective privileges, bucket privacy/limits and private-schema non-exposure.
5. Deploy only the finalizer with its pinned configuration; validate server-only runtime secrets safely, gateway JWT, confirmed identity, denial/error paths, real private Storage owner/metadata behavior and CORS where applicable. Do not weaken JWT checking to clear errors.
6. Bootstrap only the separately approved reviewer with attribution/reason. Confirm no self-review, current assignment checks and separate manager grant/revocation.
7. After staging and production inactive checks pass, obtain **explicit live activation approval** before setting readiness true. The flag is global, not a QA allowlist: turning it on permits eligible confirmed users to create/submit applications. Do not describe a production enablement as merely a private pilot. Run authorized post-activation smoke checks and contain promptly if they fail.

Containment: approved readiness=false stops new draft saves, reservations, uploads and submissions and makes manager Workspace access fail its readiness check. It **does not** disable private reads, trusted reviewer RPCs or finalization of already uploaded reservations. For full write containment, separately stop the finalizer/reviewer operations or revoke their relevant execution access using a reviewed recovery action. Preserve restrictive policies/private bucket throughout.

An error inside the SQL migration rolls back that transaction; never blindly rerun after uncertain completion—inspect history/catalog first. Edge deployment is separate and must be verified independently. Prefer reverting mobile code while retaining secured additive tables/history to a destructive down migration. No destructive rollback was executed or supplied. Dropping tables/bucket after submissions would destroy evidence/audit data; Auth FKs and managed Storage delete protections also require a deliberate retention/Storage-API procedure. Never delete physical-object metadata directly with SQL. Backup/PITR recovery would affect data beyond this feature and needs its own approval.

## 8. Required checks before live activation

- Recoverable backup and approved exact target/hash; supported authenticated deployment path; matched PostgreSQL 17.11 staging migration succeeds without changing managed ownership, existing account data or unrelated ACLs.
- All six tables RLS-enabled; correct thirteen policies and exact per-object grants; no client DML/private-table access; private schema excluded from Data API; new public RPCs exposed only with intended execute permissions. Confirm no blanket exposure setting restores revoked rights.
- Bucket private, exact 5 MB and PDF/JPEG/PNG contract; owner_id and real Storage metadata agree with finalizer; arbitrary/cross-owner paths, overwrite/upsert, rename/move and delete denied; no public evidence URL. Broad-policy defense tested in staging, not by weakening production policies.
- Gateway + handler reject missing, invalid, expired and unconfirmed credentials and API-key-only requests; cross-account document/finalize requests denied; malformed/oversized/wrong-signature files rejected; no sensitive error payloads/logging. Browser OPTIONS/tracing/setup-error behavior checked if web is supported.
- Designated synthetic owner can save/reopen one stable draft; reserve/upload/finalize replacement correctly; interruption preserves old proof; revision races and reservation expiry/quota work; repeat submit stays one pending record/event. No successful UI claim before authoritative confirmation.
- Separate approved reviewer can request information, receive corrections/resubmission, reject and approve with genuine timestamps/audit history. Self-review/assignment changes, forged metadata and ordinary-user privileged calls denied. Another applicant cannot read rows/history/files. Approved application alone or active authorization alone cannot unlock access.
- Suspend/revoke and reviewer deactivation take effect without waiting for JWT refresh; Realtime/focus/foreground/15-second fallback update the app; failed revalidation closes access. Student login/routes and session-local portfolio boundaries preserved; approved manager has no reviewer authority by implication.
- Android H1.3 keyboard/navigation/picker/background/session smoke checks; iOS equivalents on a real available runtime. Existing exports are not native execution evidence.
- Human review owner, safe untrusted-file handling, support for rejected cases, retention/deletion/orphan cleanup, incident containment and monitoring agreed. Current code has no cleanup job or malware scan, and allows only one lifetime application per Auth user.
- Explicit approval to enable the global flag **after** these gates; no automatic activation from deployment approval alone.

## Checks performed in this preflight

| Check | Actual result |
| --- | --- |
| Documented remote read-only SQL | Executed successfully; supplementary catalog/config reads completed |
| Remote account/data inventory | 2 confirmed users; 0 buckets/objects; ID/update-time fingerprint unchanged |
| Collision, RLS, required columns/default ACLs | No name conflicts; required Storage RLS/columns available; default grants inspected |
| Data API / Edge inventory | Schemas/config read with Save disabled; no deployed functions |
| `node scripts/check-manager-verification-sql.cjs` | **64/64 passed**, local PGlite 0.5.11 / PostgreSQL 18.6; synthetic Auth/Storage, no network |
| `node --test --test-reporter=tap scripts/manager-verification.test.cjs` | **48/48 passed**, no failed/skipped/cancelled; handler/client/UI harness tests |
| Local preservation / whitespace | All **186** pre-existing non-environment source files hash-identical; Git index hash unchanged; only this report added. `git diff --check` passed (existing LF/CRLF notices only); report has no trailing whitespace |
| Full prior suite / compiler / exports | Prior report records 942 passing tests, typecheck/lint/Deno checks and Android/iOS exports. Not rerun or represented as fresh hosted/device evidence here |
| CLI remote discovery | Failed `AccessTokenRequiredError`; browser's existing authenticated session supplied read-only access instead |
| SQL editor diagnostic | One supplementary query initially had a buffer replacement/syntax error (42601); corrected and rerun successfully, without writes |
| Hosted migration, Storage, Edge and reviewer mutations | **NOT PERFORMED**, outside read-only approval |
| Production secrets, backup restoration, live adversarial tests, native H1.3 execution | **UNVERIFIED / required gates** |

No unresolved failure remains in the completed catalog queries. Live activation remains blocked by the explicit gates above, not by a missing remote inventory. No deployment approval is inferred from this preflight approval.

## Catalog appendix: existing managed relations relevant to scope

`auth`: audit_log_entries, custom_oauth_providers, flow_state, identities, instances, mfa_amr_claims, mfa_challenges, mfa_factors, mfa_recovery_code_sets, mfa_recovery_codes, oauth_authorizations, oauth_client_states, oauth_clients, oauth_consents, one_time_tokens, refresh_tokens, saml_providers, saml_relay_states, schema_migrations, scim_tokens, scim_users, sessions, sso_domains, sso_providers, users, webauthn_challenges, webauthn_credentials.

`storage`: buckets, buckets_analytics, buckets_vectors, migrations, objects, s3_multipart_uploads, s3_multipart_uploads_parts, vector_indexes.

`realtime`: messages, messages_2026_10_20, messages_2026_10_21, messages_2026_10_22, messages_2026_10_23, messages_2026_10_24, schema_migrations, subscription.

`vault`: secrets, decrypted_secrets. These names were read from catalogs only; no secret values were queried.

Existing non-internal triggers on inspected Storage tables: `update_objects_updated_at`, `enforce_bucket_name_length_trigger`, `protect_buckets_delete`, `protect_objects_delete`, `protect_bucket_control_insert`, `protect_bucket_control_update`, `protect_bucket_control_update_role`. No non-internal trigger on `auth.users` or `public` was returned by the inspection. Existing event triggers: `issue_graphql_placeholder`, `pgrst_ddl_watch`, `pgrst_drop_watch`, `issue_pg_cron_access`, `issue_pg_net_access`, `issue_pg_graphql_access`. They were not altered.

Installed extensions: plpgsql 1.0; pg_stat_statements 1.11; uuid-ossp 1.1; pgcrypto 1.3; supabase_vault 0.3.1. `auth.uid()` and `gen_random_uuid()` exist.
