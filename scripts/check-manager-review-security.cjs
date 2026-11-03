// H1.5B1 OFFLINE ONLY: in-memory PostgreSQL, synthetic catalogs/claims, no dotenv or DSN.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(path.resolve('.expo/phase-h1-3/tools/node_modules/@electric-sql/pglite'));
const { loadSharedContract } = require('./load-shared-contracts.cjs');
const contracts = loadSharedContract('review-security');
const h13 = loadSharedContract('manager-verification');
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sid = n => `90000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${quote(JSON.stringify(value))}::jsonb`;
const reason = 'The supplied management authority evidence was examined.';
const fields = { phone: '+27 72 123 4567', business_name: 'Synthetic Residence', property_location: '1 Synthetic Road', relationship: 'owner' };
async function main() {
  const db = new PGlite(); let passed = 0;
  const q = async sql => (await db.query(sql)).rows;
  const one = async sql => (await q(sql))[0];
  const check = (value, message) => { assert.ok(value, message); console.log(`ok ${++passed} - ${message}`); };
  const denied = async (sql, message, codes = ['42501']) => {
    let error; try { await q(sql); } catch (e) { error = e; }
    check(error && codes.includes(error.code), `${message}${error && !codes.includes(error.code) ? ` (unexpected SQLSTATE ${error.code})` : ''}`);
  };
  const identity = async (n, changes = {}, role = 'authenticated') => {
    const claims = { sub: id(n), session_id: sid(n), aal: 'aal2', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...changes };
    await db.exec(`reset role; select set_config('request.jwt.claim.sub',${quote(id(n))},false); select set_config('request.jwt.claims',${json(claims)}::text,false); set role ${role}`);
  };
  const operator = () => db.exec("reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claims','{}',false)");
  const review = (application, patch = {}) => ({ contract: 'manager-review', version: 2, request_id: id(100), application_id: application.id, expected_revision: application.revision, decision: 'approved', applicant_reason: reason, checklist: { schema_version: 1, applicant: true, business: true, authority: true }, ...patch });
  const decide = c => `select public.cs_manager_review_v2(${json(c)}) as result`;
  const access = (n, patch = {}) => ({ version: 2, request_id: id(200), user_id: id(n), expected_version: 1, state: 'suspended', reason, ...patch });
  const changeAccess = c => `select public.cs_manager_set_authorization_v2(${json(c)}) as result`;
  try {
    console.log((await one('select version() as engine')).engine);
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),aal text,not_after timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema auth,storage to anon,authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security; alter table storage.buckets enable row level security;
      grant select,insert,update,delete on storage.objects,storage.buckets to anon,authenticated;
      create policy unrelated_objects on storage.objects for all to public using(true) with check(true);
      create policy unrelated_buckets on storage.buckets for all to public using(true) with check(true);
    `);
    for (let n = 1; n <= 8; n++) await db.exec(`insert into auth.users values('${id(n)}',now(),'{"full_name":"Synthetic Applicant","role":"admin","mfa":true}'); insert into auth.sessions values('${sid(n)}','${id(n)}','aal2',null)`);
    await db.exec(fs.readFileSync('supabase/migrations/20261021135040_manager_verification.sql', 'utf8'));
    const migrationFiles = fs.readdirSync('supabase/migrations').filter(name => name.endsWith('_manager_review_security.sql'));
    assert.equal(migrationFiles.length, 1);
    await db.exec(fs.readFileSync(path.join('supabase/migrations', migrationFiles[0]), 'utf8'));
    check(true, 'base and forward migrations execute in one fresh in-memory PostgreSQL database');
    check((await one('select count(*)::int as n from auth.users')).n === 8, 'forward migration preserves synthetic pre-existing identities');
    check((await one('select count(*)::int as n from campusstay_private.reviewer_assignments')).n === 0, 'migration seeds no reviewers');
    check((await one('select count(*)::int as n from campusstay_private.access_management_assignments')).n === 0, 'migration seeds no access-management assignments');
    for (const value of [
      reason, 'Les informations fournies nécessitent une clarification.', 'The supplied document 😀 needs clarification.',
      'Ｔｈｅ supplied management evidence requires clarification.', 'approved approved approved approved', 'x', 'x'.repeat(2001),
    ]) {
      let clientAccepted = true, sqlAccepted = true;
      try { contracts.parseReviewReason(value); } catch { clientAccepted = false; }
      try { await one(`select campusstay_private.review_reason(${quote(value)})`); } catch { sqlAccepted = false; }
      check(clientAccepted === sqlAccepted, 'shared/SQL reason policy agrees on a bounded Unicode/placeholder input');
    }
    await identity(1, { aal: 'aal1' });
    check((await one('select public.cs_manager_state() as s')).s.ready === false, 'readiness stays disabled and own-state stays compatible without privileged MFA');
    await denied(`select public.cs_manager_save_draft(${json(fields)},null)`, 'paused applicant save still denied', ['55000']);
    await operator(); await db.exec('update campusstay_private.verification_configuration set finalizer_ready=true');
    async function createCase(n) {
      await identity(n, { aal: 'aal1' });
      const a = (await one(`select public.cs_manager_save_draft(${json(fields)},null) as a`)).a;
      const d = (await one(`select public.cs_manager_reserve_proof('${a.id}',${a.revision},'proof.pdf','application/pdf',5) as d`)).d;
      await db.exec(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('campusstay-manager-verification','${d.object_name}','${id(n)}','{"size":5,"mimetype":"application/pdf"}')`);
      await identity(n, {}, 'service_role');
      await db.exec(`select public.cs_manager_finalize_proof('${id(n)}','${d.id}',${a.revision},'${'a'.repeat(64)}')`);
      await identity(n, { aal: 'aal1' });
      const current = (await one('select public.cs_manager_state() as s')).s;
      const pending = (await one(`select public.cs_manager_submit('${a.id}',${current.application.revision}) as a`)).a;
      check(h13.parseOwnState((await one('select public.cs_manager_state() as s')).s, id(n)).application.status === 'pending', `H1.3 applicant ${n} saves/uploads/finalizes/submits without reviewer MFA`);
      return pending;
    }
    const a = await createCase(1), b = await createCase(2), c = await createCase(3), self = await createCase(4);
    const command = review(a);
    await identity(4);
    await denied(decide(command), 'AAL2 without trusted assignment cannot review');
    await denied("insert into campusstay_private.reviewer_assignments(user_id,reason) values('" + id(4) + "','Self promotion')", 'client cannot self-assign reviewer authority');
    await operator();
    await db.exec(`insert into campusstay_private.reviewer_assignments(user_id,reason) values('${id(4)}','Synthetic operator approved reviewer'),('${id(5)}','Independent synthetic reviewer')`);
    for (const [label, changes] of [
      ['missing AAL', { aal: null }], ['AAL1', { aal: 'aal1' }], ['forged metadata', { aal: 'aal1', user_metadata: { aal: 'aal2', role: 'admin', mfa: true } }],
      ['expired JWT', { exp: 1 }], ['missing expiry', { exp: null }], ['string expiry', { exp: '999999999999' }],
      ['missing session', { session_id: null }], ['malformed session', { session_id: 'bad' }], ['other user session', { session_id: sid(5) }],
      ['mismatched subject', { sub: id(5) }], ['service-role claim', { role: 'service_role' }],
    ]) {
      await identity(4, changes);
      await denied(decide(command), `${label} cannot decide`);
      check((await q('select * from public.manager_verification_applications where applicant_id<>auth.uid()')).length === 0, `${label} cannot read other cases through RLS`);
      check((await q('select * from storage.objects where owner_id<>auth.uid()::text')).length === 0, `${label} cannot read other private proof objects`);
    }
    for (const [label, mutation, restore] of [
      ['expired Auth session', `update auth.sessions set not_after=now()-interval '1 second' where id='${sid(4)}'`, `update auth.sessions set not_after=null where id='${sid(4)}'`],
      ['downgraded Auth session', `update auth.sessions set aal='aal1' where id='${sid(4)}'`, `update auth.sessions set aal='aal2' where id='${sid(4)}'`],
      ['removed Auth session', `delete from auth.sessions where id='${sid(4)}'`, `insert into auth.sessions values('${sid(4)}','${id(4)}','aal2',null)`],
      ['unconfirmed reviewer', `update auth.users set email_confirmed_at=null where id='${id(4)}'`, `update auth.users set email_confirmed_at=now() where id='${id(4)}'`],
    ]) {
      await operator(); await db.exec(mutation); await identity(4); await denied(decide(command), `${label} cannot decide`); await operator(); await db.exec(restore);
    }
    await identity(4);
    check((await q('select * from public.manager_verification_applications')).length === 4, 'current AAL2 reviewer reads submitted queue under hardened RLS');
    check((await q('select * from storage.objects')).length === 4, 'current AAL2 reviewer can read submitted private proof objects');
    await denied(`select public.cs_manager_review('${a.id}',${a.revision},'approved','Legacy unchecked approval')`, 'legacy review execution denied');
    await denied(`select public.cs_manager_set_authorization('${id(1)}','active','Legacy unchecked access')`, 'legacy access execution denied');
    await denied(decide(review(self, { request_id: id(101) })), 'assigned AAL2 reviewer cannot approve own application');
    for (const [label, patch] of [
      ['missing checklist', { checklist: null }], ['incomplete checklist', { checklist: { schema_version: 1, applicant: true, business: true, authority: false } }],
      ['string attestation', { checklist: { schema_version: 1, applicant: true, business: true, authority: 'true' } }],
      ['unknown checklist field', { checklist: { schema_version: 1, applicant: true, business: true, authority: true, verified: true } }],
      ['wrong checklist version', { checklist: { schema_version: 2, applicant: true, business: true, authority: true } }],
      ['unsupported decision', { decision: 'active' }], ['wrong command version', { version: 1 }], ['caller actor', { actor_id: id(5) }],
      ['client MFA field', { mfa: true }], ['preview contract', { contract: 'proposed-manager-review' }], ['short reason', { applicant_reason: 'x' }],
      ['repeated placeholders', { applicant_reason: 'approved approved approved approved' }], ['string revision', { expected_revision: String(a.revision) }],
    ]) await denied(decide(review(a, patch)), `${label} rejected by SQL boundary`, ['22023']);
    await denied(decide(review(a, { expected_revision: a.revision - 1 })), 'stale submitted revision cannot decide', ['40001']);
    const approved = contracts.parseReviewResponseV2((await one(decide(command))).result);
    check(approved.application.status === 'approved' && approved.application.revision === a.revision + 1, 'valid authorized attestations approve exactly the submitted revision');
    await operator();
    const stored = await one(`select * from campusstay_private.manager_review_decisions where request_id='${command.request_id}'`);
    check(stored.reviewer_id === id(4) && stored.submitted_revision === a.revision && stored.proof_document_id === a.proof.id && stored.session_id === sid(4), 'stored attestations bind actual reviewer/session/submitted revision/proof');
    check(stored.checklist.authority === true, 'server persists reviewer attestations');
    check((await q(`select * from campusstay_private.reviewer_assignments where user_id='${id(1)}'`)).length === 0
      && (await q(`select * from campusstay_private.access_management_assignments where user_id='${id(1)}'`)).length === 0, 'manager approval grants neither reviewer nor access-management authority');
    const counts = async () => one(`select (select count(*) from public.manager_authorizations) as grants,(select count(*) from campusstay_private.manager_review_decisions) as decisions,(select count(*) from public.manager_verification_events) as events,(select count(*) from campusstay_private.manager_security_events) as security`);
    const beforeRetry = await counts();
    await identity(4); const repeated = (await one(decide(command))).result;
    check(repeated.application.revision === approved.application.revision, 'identical review request returns original committed response');
    await operator(); check(JSON.stringify(await counts()) === JSON.stringify(beforeRetry), 'retry duplicates neither authorization nor decisions/audit');
    await identity(4);
    await denied(decide(review(a, { applicant_reason: 'A different reason changes the original decision.' })), 'same request with changed payload conflicts', ['40001']);
    await denied(decide(review(a, { request_id: id(102) })), 'new request cannot re-decide approved revision');
    await identity(5); await denied(decide(command), 'another reviewer cannot replay a prior reviewer request', ['40001']);
    await identity(4);
    const noteBody = 'Private synthetic reviewer observation, never applicant feedback.';
    const writeNote = (app, rev, noteRev, body = noteBody) => `select public.cs_manager_note_write('${app}',${rev},${noteRev},${quote(body)}) as note`;
    const note = (await one(writeNote(a.id, approved.application.revision, 0))).note;
    check(note.note_revision === 1, 'reviewer writes versioned private note against specific application revision');
    const notes = (await one(`select public.cs_manager_notes('${a.id}') as notes`)).notes;
    check(notes.notes[0].note === noteBody && notes.notes[0].author_id === id(4), 'authorized reviewer reads private note and server author');
    await identity(4, { aal: 'aal1' });
    await denied(`select public.cs_manager_notes('${a.id}')`, 'AAL1 reviewer cannot read private notes');
    await denied(writeNote(a.id, approved.application.revision, 1), 'AAL1 reviewer cannot append private notes');
    await identity(4);
    await denied(`select public.cs_manager_notes('${self.id}')`, 'reviewer cannot inspect private administrative notes on own application');
    await denied(writeNote(a.id, a.revision, 1), 'stale application revision cannot annotate silently', ['40001']);
    await denied(writeNote(a.id, approved.application.revision, 0), 'concurrent stale note revision rejected', ['40001']);
    await denied(writeNote(a.id, approved.application.revision, 1, 'x'.repeat(4001)), 'note size capped', ['22023']);
    await one(writeNote(a.id, approved.application.revision, 1, ''));
    check((await one(`select public.cs_manager_notes('${a.id}') as n`)).n.notes.length === 2, 'clearing a note appends history without destructive overwrite');
    const page = (await one(`select public.cs_manager_notes('${a.id}',null,1) as n`)).n;
    check(page.notes.length === 1 && page.notes[0].note_revision === 2 && page.next_before_revision === 2, 'private note history is bounded and returns older-page cursor');
    check((await one(`select public.cs_manager_notes('${a.id}',2,1) as n`)).n.notes[0].note_revision === 1, 'private history cursor retrieves earlier immutable note');
    await denied(`select public.cs_manager_notes('${a.id}',null,101)`, 'private history page size capped', ['22023']);
    await identity(1);
    await denied(`select public.cs_manager_notes('${a.id}')`, 'applicant cannot read private notes');
    await denied(writeNote(a.id, approved.application.revision, 2), 'applicant cannot write trusted review notes');
    await denied('select * from campusstay_private.manager_review_notes', 'applicant cannot bypass notes RPC with table SELECT');
    const own = (await one('select public.cs_manager_state() as s')).s;
    check(own.access.authorized === true && !JSON.stringify(own).includes(noteBody), 'H1.3 approved/active own-state stays compatible and contains no private notes');
    check(!JSON.stringify(await q('select * from public.manager_verification_events')).includes(noteBody), 'applicant-visible history excludes private note content');
    await identity(2); check((await q(`select * from public.manager_verification_applications where id='${a.id}'`)).length === 0, 'cross-applicant application isolation preserved');
    await denied(`select public.cs_manager_notes('${a.id}')`, 'cross-applicant private notes denied');
    await operator();
    check(!JSON.stringify(await q('select * from campusstay_private.manager_security_events')).includes(noteBody), 'security audit includes note revision metadata, not note content');
    check((await one(`select status,revision from public.manager_verification_applications where id='${a.id}'`)).revision === approved.application.revision, 'notes cannot mutate application status/revision');
    for (const table of ['manager_review_decisions', 'manager_access_decisions', 'manager_review_notes', 'manager_security_events']) {
      await identity(1); await denied(`delete from campusstay_private.${table}`, `applicant cannot delete ${table}`);
      await denied(`insert into campusstay_private.${table} default values`, `applicant cannot forge ${table}`);
    }
    await operator(); await denied('delete from campusstay_private.manager_security_events', 'append-only trigger protects audit even from ordinary owner DML');
    await denied(`update campusstay_private.manager_review_decisions set reviewer_id='${id(5)}'`, 'reviewer attribution cannot be overwritten');
    await identity(4);
    const unchecked = { schema_version: 1, applicant: false, business: false, authority: false };
    const needsInfo = (await one(decide(review(b, { request_id: id(110), decision: 'needs_information', checklist: unchecked })))).result;
    check(needsInfo.application.status === 'needs_information', 'information request requires reason and typed attestations but not approval confirmations');
    await identity(2, { aal: 'aal1' });
    const saved = (await one(`select public.cs_manager_save_draft(${json(fields)},${needsInfo.application.revision}) as a`)).a;
    const resubmitted = (await one(`select public.cs_manager_submit('${b.id}',${saved.revision}) as a`)).a;
    check(resubmitted.status === 'pending' && resubmitted.revision > b.revision, 'needs-information owner correction/resubmission remains compatible');
    await identity(4);
    await denied(decide(review(b, { request_id: id(111) })), 'old attestations cannot approve a resubmitted revision', ['40001']);
    // Simulate a storage/audit failure in the isolated WASM DB, not a production trigger change.
    await operator(); await db.exec(`create function campusstay_private.synthetic_audit_failure() returns trigger language plpgsql as $$begin if new.action='review_decided' then raise exception 'Synthetic failure'; end if; return new; end$$;
      create trigger synthetic_audit_failure before insert on campusstay_private.manager_security_events for each row execute function campusstay_private.synthetic_audit_failure()`);
    await identity(4); await denied(decide(review(c, { request_id: id(120) })), 'audit failure rolls back review transaction', ['P0001']);
    await operator();
    check((await one(`select status from public.manager_verification_applications where id='${c.id}'`)).status === 'pending'
      && (await q(`select * from public.manager_authorizations where user_id='${id(3)}'`)).length === 0
      && (await q(`select * from campusstay_private.manager_review_decisions where request_id='${id(120)}'`)).length === 0, 'failed audit leaves no approval, grant or decision record');
    check((await q(`select * from public.manager_verification_events where application_id='${c.id}' and action='approved'`)).length === 0
      && (await q(`select * from campusstay_private.manager_security_events where application_id='${c.id}'`)).length === 0, 'failed decision also rolls back public/private audit inserts');
    await db.exec('drop trigger synthetic_audit_failure on campusstay_private.manager_security_events; drop function campusstay_private.synthetic_audit_failure()');
    await identity(4); const rejected = (await one(decide(review(c, { request_id: id(121), decision: 'rejected', checklist: unchecked })))).result;
    check(rejected.application.status === 'rejected', 'rejection works separately without approval attestations');
    await denied(changeAccess(access(1)), 'reviewer alone lacks separate access-management scope');
    await operator(); await db.exec(`insert into campusstay_private.access_management_assignments(user_id,reason) values('${id(4)}','Synthetic approved access operator'); update campusstay_private.verification_configuration set finalizer_ready=false`);
    await identity(4);
    for (const decision of ['approved', 'needs_information', 'rejected']) await denied(decide(review(resubmitted, { request_id: id(130), decision, checklist: unchecked })), `${decision} denied while readiness off`, ['55000']);
    await denied(decide(command), 'even an idempotent review retry is denied while paused', ['55000']);
    await denied(writeNote(a.id, approved.application.revision, 2), 'note mutations denied while paused', ['55000']);
    check((await one(`select public.cs_manager_notes('${a.id}') as n`)).n.notes.length === 2, 'authorized recovery note reads remain available during pause');
    const suspended = (await one(changeAccess(access(1)))).result;
    check(suspended.state === 'suspended' && suspended.authorization_version === 2, 'AAL2 scoped suspension remains available during pause');
    await denied(changeAccess(access(1, { request_id: id(205), expected_version: 0 })), 'authorization version zero rejected', ['22023']);
    await denied(changeAccess(access(4, { request_id: id(206) })), 'scoped operator cannot change own manager access');
    const revokedCommand = access(1, { request_id: id(201), expected_version: 2, state: 'revoked' });
    const revoked = (await one(changeAccess(revokedCommand))).result;
    check(revoked.state === 'revoked' && revoked.authorization_version === 3, 'AAL2 scoped revocation remains available during pause');
    check((await one(changeAccess(revokedCommand))).result.authorization_version === 3, 'idempotent containment does not advance authorization twice');
    await denied(changeAccess(access(1, { request_id: id(202), expected_version: 1, state: 'revoked' })), 'stale authorization version cannot overwrite containment', ['40001']);
    await denied(changeAccess(access(1, { request_id: id(203), expected_version: 3, state: 'active' })), 'reactivation remains denied during pause', ['55000']);
    await identity(4, { aal: 'aal1' }); await denied(changeAccess(access(1, { request_id: id(204), expected_version: 3, state: 'revoked' })), 'containment does not bypass MFA');
    await operator(); await db.exec('update campusstay_private.verification_configuration set finalizer_ready=true');
    await identity(4); await one(decide(command)); await identity(1, { aal: 'aal1' });
    check((await one('select public.cs_manager_state() as s')).s.access.authorized === false, 'replaying old approval never re-grants subsequently revoked access');
    await operator(); await db.exec(`update campusstay_private.reviewer_assignments set active=false where user_id='${id(4)}'`);
    await identity(4); await denied(decide(review(resubmitted, { request_id: id(140) })), 'revoked reviewer denied with same unexpired JWT');
    await denied(`select public.cs_manager_notes('${a.id}')`, 'revoked reviewer loses private note access immediately');
    check((await q(`select * from storage.objects where owner_id<>auth.uid()::text`)).length === 0, 'revoked reviewer loses cross-account proof access');
    await operator();
    const event = await one("select * from campusstay_private.manager_security_events where action='reviewer_assignment_changed' order by id desc limit 1");
    check(event.details.previous_active === true && event.details.active === false && event.operator_name.length > 0, 'operator assignment changes create attributed before/after audit');
    await db.exec(`grant execute on function public.cs_manager_review(uuid,integer,text,text) to authenticated`);
    await identity(5); await denied(`select public.cs_manager_review('${b.id}',${resubmitted.revision},'approved','Legacy accidental grant')`, 'legacy body still denies if execute privilege is accidentally restored');
    console.log(`# ${passed} H1.5B1 PostgreSQL checks passed; simulated claims/catalogs only, no network or live project used.`);
  } finally { await db.close(); }
}
main().catch(error => { console.error('Offline security check failed:', error.message, error.code ?? ''); process.exitCode = 1; });
