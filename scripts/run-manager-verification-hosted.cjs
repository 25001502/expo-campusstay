// PREPARED ONLY. --plan is offline. --run MUTATES an explicitly approved EMPTY
// staging project (at most its approved expired-JWT fixture identity). Never
// reads the app .env, deploys, creates a project or cleans data.
const { randomUUID, createHash, createPublicKey, verify } = require('node:crypto');
const { Buffer } = require('node:buffer');
const LIVE_PROJECT_REF = 'ypvboaxbxulwlmivbtaq'; // Public project ID; deny, never target.
const BUCKET = 'campusstay-manager-verification';
const CASES = [
  'empty application data on PostgreSQL 17.11 staging, hardened migration and JWT-enabled function',
  'missing, invalid, expired and API-key-only Edge credentials rejected',
  'CORS POST/tracing preflight',
  'student metadata cannot grant manager or reviewer access',
  'readiness-off draft and direct table/private assignment writes denied',
  'cross-account application/document/event/authorization RLS isolation',
  'private PDF, PNG and JPEG upload/download and public/anonymous denial',
  'cross-owner upload/download/finalization and unchecked content denied',
  'overwrite/upsert/delete denied without changing evidence',
  'pause blocks existing reservations, finalization, submissions and all review decisions',
  'paused attempts leave application, proof, audit and grants unchanged',
  'duplicate concurrent submission stays one pending application/event',
  'ordinary reviewer invocation and assigned-reviewer self-approval denied',
  'needs-information, correction and resubmission retain stable identity',
  'approval and independent authorization are both required',
  'pause retains private reads and audited suspension/revocation, denies reactivation',
  'revocation and reviewer deactivation take effect with existing JWTs',
  'finally leave staging readiness off, retain all synthetic evidence for inspection',
];
class HostedCheckError extends Error {}
function ensure(value, label) { if (!value) throw new HostedCheckError(label); }
function validateTarget(env) {
  const ref = env.H13_STAGING_REF;
  ensure(/^[a-z]{20}$/.test(ref ?? '') && ref !== LIVE_PROJECT_REF, 'Refuse production or invalid staging reference');
  ensure(env.H13_APPROVED_STAGING_REF === ref && env.H13_ALLOW_STAGING_MUTATIONS === 'I_APPROVE_ISOLATED_H13_TESTS', 'Staging mutation approval missing');
  ensure(env.H13_STAGING_URL === `https://${ref}.supabase.co`, 'Staging URL/reference mismatch');
  for (const key of ['H13_STAGING_PUBLISHABLE_KEY', 'H13_STAGING_SERVER_KEY', 'H13_STAGING_MANAGEMENT_TOKEN', 'H13_STAGING_EXPIRED_JWT']) ensure(typeof env[key] === 'string' && env[key].length > 0, 'Required staging-only credential missing');
  let expired;
  try { expired = JSON.parse(Buffer.from(env.H13_STAGING_EXPIRED_JWT.split('.')[1], 'base64url').toString()); } catch { throw new Error('Expired staging JWT fixture missing or invalid'); }
  ensure(expired.iss === `${env.H13_STAGING_URL}/auth/v1` && Number.isFinite(expired.exp) && expired.exp < Date.now() / 1000, 'Expired JWT must belong to staging and already be expired');
  ensure(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(expired.sub ?? ''), 'Expired staging fixture user missing');
  return { ref, url: env.H13_STAGING_URL, publicKey: env.H13_STAGING_PUBLISHABLE_KEY, serverKey: env.H13_STAGING_SERVER_KEY, managementToken: env.H13_STAGING_MANAGEMENT_TOKEN, expiredJwt: env.H13_STAGING_EXPIRED_JWT, fixtureUserId: expired.sub };
}
function verifyExpiredSignature(token, jwks) {
  try {
    const parts=token.split('.'), header=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    ensure(parts.length===3 && ['ES256','RS256'].includes(header.alg),'Expired fixture requires an asymmetric staging JWT');
    const jwk=jwks.keys?.find((key)=>key.kid===header.kid && (header.alg==='ES256' ? key.kty==='EC' && key.crv==='P-256' : key.kty==='RSA'));
    ensure(jwk,'Expired fixture signing key unavailable');
    const key=createPublicKey({key:jwk,format:'jwk'});
    ensure(verify('sha256',Buffer.from(`${parts[0]}.${parts[1]}`),header.alg==='ES256'?{key,dsaEncoding:'ieee-p1363'}:key,Buffer.from(parts[2],'base64url')),'Expired fixture signature invalid');
  } catch { throw new HostedCheckError('Expired fixture must have a genuine signature from staging JWKS'); }
}
// Local adapter reuses the same security scenarios, replacing only control-plane
// SQL, deployment evidence and signing-key discovery. Hosted CLI guards stay intact.
async function runVerificationSuite(config, fetcher = fetch, log = console.log, control = null) {
  const { createClient } = require('@supabase/supabase-js');
  const request = (url, options = {}) => fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: request } };
  const server = createClient(config.url, config.serverKey, options);
  const anonymous = createClient(config.url, config.publicKey, options);
  let passed = 0, ownsRun = false;
  const pass = (label) => { passed++; log(`PASS ${passed}: ${label}`); };
  async function sql(query, parameters = [], readOnly = false) {
    if (control) return control.sql(query, parameters, readOnly);
    const response = await request(`https://api.supabase.com/v1/projects/${config.ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${config.managementToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, parameters, read_only: readOnly }) });
    ensure(response.ok, 'Staging control query failed; inspect privately, do not log raw responses');
    const rows = await response.json(); ensure(Array.isArray(rows), 'Unexpected staging control response'); return rows;
  }
  const pause = (enabled) => sql('update campusstay_private.verification_configuration set finalizer_ready=$1 where singleton', [enabled]);
  const state = async (account) => {
    const result = await account.client.rpc('cs_manager_state'); ensure(!result.error && result.data?.version === 1, 'State RPC unavailable'); return result.data;
  };
  const rpc = async (account, name, args) => { const result = await account.client.rpc(name, args); ensure(!result.error, 'Expected staging RPC success'); return result.data; };
  const denied = async (account, name, args, code = '42501') => { const result = await account.client.rpc(name, args); ensure(result.error?.code === code, 'Expected RPC denial not observed'); };
  const fields = { phone: '+27 72 123 4567', business_name: 'Synthetic QA Residence', property_location: '1 Synthetic Campus Road', relationship: 'owner' };
  async function account(intent) {
    const email = `h13-${randomUUID()}@example.invalid`, password = `Qa!${randomUUID()}${randomUUID().slice(0,16)}`;
    const created = await server.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Synthetic ${intent}`, role: 'admin', is_manager: true } });
    ensure(!created.error && created.data.user?.id, 'Synthetic staging Auth creation failed');
    const client = createClient(config.url, config.publicKey, options), login = await client.auth.signInWithPassword({ email, password });
    ensure(!login.error && login.data.session?.access_token, 'Synthetic staging login failed');
    return { id: created.data.user.id, client, token: login.data.session.access_token };
  }
  async function edge(token, body, method = 'POST', extraHeaders = {}) {
    return request(`${config.url}/functions/v1/manager-verification-finalize`, { method, headers: { apikey: config.publicKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...extraHeaders }, ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}) });
  }
  async function reserve(account, app, name, mime, bytes) {
    const doc = await rpc(account, 'cs_manager_reserve_proof', { p_application: app.id, p_revision: app.revision, p_name: name, p_mime: mime, p_size: bytes.length });
    ensure(doc.object_name.startsWith(`${account.id}/${app.id}/${doc.id}.`) && /^[a-f0-9/-]+\.(pdf|jpg|png)$/.test(doc.object_name), 'Unexpected reserved path');
    const upload = await account.client.storage.from(BUCKET).upload(doc.object_name, bytes, { contentType: mime, upsert: false });
    ensure(!upload.error, 'Private upload failed'); return doc;
  }
  async function attach(account, app, name, mime, bytes) {
    const doc = await reserve(account, app, name, mime, bytes), response = await edge(account.token, { document_id: doc.id, revision: app.revision });
    ensure(response.status === 200 && (await response.json()).ok === true, 'Edge proof verification failed');
    const next = (await state(account)).application; ensure(next.proof?.id === doc.id, 'Proof not authoritatively attached');
    const download = await account.client.storage.from(BUCKET).download(doc.object_name);
    ensure(!download.error && Buffer.from(await download.data.arrayBuffer()).equals(bytes), 'Owner download differs from uploaded proof');
    return { doc, app: next };
  }
  const pdf = Buffer.from('%PDF-1.4\n% Synthetic H1.3 security fixture only\n%%EOF\n');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1sAAAAASUVORK5CYII=', 'base64');
  // Byte-signature fixtures only; these are not legal-authority documents or a malware test.
  const jpeg = Buffer.from([255, 216, 255, 224, 0, 2, 255, 217]);
  const reviewArgs = (app, decision = 'approved') => ({ p_application: app.id, p_revision: app.revision, p_decision: decision, p_reason: 'Synthetic staging review' });
  const snapshot = async () => (await sql(`select jsonb_build_object('applications',(select jsonb_agg(to_jsonb(a) order by id) from public.manager_verification_applications a),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.manager_verification_documents d),'events',(select count(*) from public.manager_verification_events),'grants',(select count(*) from public.manager_authorizations)) as value`, [], true))[0].value;
  try {
    const rows = await sql(`select current_setting('server_version_num')::int as version,(select count(*) from auth.users)::int as users,(select count(*) from public.manager_verification_applications)::int as apps,(select count(*) from public.manager_verification_documents)::int as docs,(select count(*) from public.manager_verification_events)::int as events,(select count(*) from public.manager_authorizations)::int as grants,(select count(*) from campusstay_private.reviewer_assignments)::int as reviewers,(select count(*) from storage.objects)::int as objects,(select count(*) from storage.buckets)::int as buckets,(select finalizer_ready from campusstay_private.verification_configuration where singleton) as ready,position('perform campusstay_private.require_ready()' in pg_get_functiondef('public.cs_manager_finalize_proof(uuid,uuid,integer,text)'::regprocedure))>0 as hardened`, [], true);
    const base = rows[0];
    const fixtureCount=(await sql('select count(*)::int as n from auth.users where id=$1::uuid',[config.fixtureUserId],true))[0].n;
    ensure(base?.version === 170011 && base.ready === false && base.hardened && base.buckets === 1 && base.users<=1 && base.users===fixtureCount && ['apps','docs','events','grants','reviewers','objects'].every((key) => base[key] === 0), 'Refuse nonempty, enabled, mismatched or unhardened staging');
    const bucket = await server.storage.getBucket(BUCKET);
    ensure(!bucket.error && bucket.data.public === false && Number(bucket.data.file_size_limit) === 5242880 && [...bucket.data.allowed_mime_types].sort().join() === ['application/pdf','image/jpeg','image/png'].sort().join(), 'Private bucket contract mismatch');
    if (control) await control.verifyDeployment();
    else {
      const deployment = await request(`https://api.supabase.com/v1/projects/${config.ref}/functions/manager-verification-finalize`, { headers: { Authorization: `Bearer ${config.managementToken}` } });
      ensure(deployment.ok && (await deployment.json()).verify_jwt === true, 'Hosted JWT validation must stay enabled');
    }
    ownsRun = true; pass('empty application data on isolated PostgreSQL 17.11 staging and JWT-enabled finalizer');
    if (control) await control.verifyExpiredToken(config.expiredJwt);
    else {
      const jwks=await request(`${config.url}/auth/v1/.well-known/jwks.json`,{headers:{apikey:config.publicKey}});
      ensure(jwks.ok,'Staging signing keys unavailable'); verifyExpiredSignature(config.expiredJwt,await jwks.json());
    }
    for (const token of [null, 'invalid.jwt.fixture', config.expiredJwt, config.publicKey]) ensure((await edge(token, {})).status === 401, 'Invalid, expired or key-only caller was not rejected');
    pass('missing, invalid, expired and API-key-only requests rejected');
    const cors = await edge(null, null, 'OPTIONS', { Origin: 'https://example.invalid', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,apikey,content-type,traceparent,tracestate,baggage' });
    ensure(cors.ok && /POST/.test(cors.headers.get('Access-Control-Allow-Methods') ?? '') && /traceparent/.test(cors.headers.get('Access-Control-Allow-Headers') ?? ''), 'Hosted browser preflight failed'); pass('hosted POST/tracing CORS preflight');
    const student = await account('student'), manager = await account('manager'), reviewer = await account('reviewer');
    ensure(!(await state(student)).access.authorized && !(await state(manager)).access.authorized, 'Forged user metadata granted access'); pass('student/manager intent and metadata grant no authority');
    await denied(manager, 'cs_manager_save_draft', { p_fields: fields }, '55000');
    const privateWrite = await student.client.schema('campusstay_private').from('reviewer_assignments').insert({ user_id: student.id, reason: 'forged role' }); ensure(privateWrite.error, 'Private reviewer assignment writable'); pass('readiness-off draft and private assignment denied');
    await sql('insert into campusstay_private.reviewer_assignments(user_id,reason) select id,$2 from auth.users where id=$1::uuid and email_confirmed_at is not null', [reviewer.id, 'Explicit synthetic staging reviewer bootstrap']);
    await pause(true);
    let app = await rpc(manager, 'cs_manager_save_draft', { p_fields: fields });
    const selfApprove = await manager.client.from('manager_verification_applications').update({ status: 'approved' }).eq('id', app.id); ensure(selfApprove.error, 'Direct status write allowed');
    for (const table of ['manager_verification_applications','manager_verification_documents','manager_verification_events','manager_authorizations']) {
      const result = await student.client.from(table).select('*'); ensure(!result.error && result.data.length === 0, 'Cross-applicant rows exposed');
    }
    await denied(student, 'cs_manager_submit', { p_application: app.id, p_revision: app.revision }); pass('direct approval and cross-account RLS denied');
    const bad = await reserve(manager, app, 'invalid.pdf', 'application/pdf', Buffer.from('bad'));
    ensure((await edge(manager.token, { document_id: bad.id, revision: app.revision })).status === 422 && !(await state(manager)).application.proof, 'Unchecked bytes attached'); pass('actual wrong file signature rejected');
    let proof;
    for (const [name, mime, bytes] of [['fixture.pdf','application/pdf',pdf],['fixture.png','image/png',png],['fixture.jpg','image/jpeg',jpeg]]) { proof = await attach(manager, app, name, mime, bytes); app = proof.app; }
    pass('private PDF/PNG/JPEG signature, size and owner download checks');
    for (const client of [student.client, reviewer.client, anonymous]) ensure((await client.storage.from(BUCKET).download(proof.doc.object_name)).error, 'Unsubmitted/private proof exposed');
    const publicRead = await request(`${config.url}/storage/v1/object/public/${BUCKET}/${proof.doc.object_name}`); ensure(!publicRead.ok, 'Public evidence read allowed');
    ensure((await edge(student.token, { document_id: proof.doc.id, revision: app.revision })).status === 403, 'Cross-owner Edge access allowed');
    const crossUpload = await student.client.storage.from(BUCKET).upload(`${manager.id}/${app.id}/${randomUUID()}.pdf`, pdf, { contentType:'application/pdf' }); ensure(crossUpload.error, 'Cross-owner upload allowed'); pass('private/public/cross-owner read, upload and finalization isolation');
    ensure((await manager.client.storage.from(BUCKET).upload(proof.doc.object_name, jpeg, { contentType:'image/jpeg', upsert:true })).error, 'Overwrite allowed');
    await manager.client.storage.from(BUCKET).remove([proof.doc.object_name]);
    const retained = await manager.client.storage.from(BUCKET).download(proof.doc.object_name); ensure(!retained.error && Buffer.from(await retained.data.arrayBuffer()).equals(jpeg), 'Existing evidence changed/deleted'); pass('overwrite and deletion cannot change proof');
    const pausedDoc = await reserve(manager, app, 'paused.pdf', 'application/pdf', pdf);
    const blockedUpload = await rpc(manager, 'cs_manager_reserve_proof', { p_application:app.id, p_revision:app.revision, p_name:'blocked.pdf', p_mime:'application/pdf', p_size:pdf.length });
    await pause(false); const beforeFinalize = await snapshot();
    ensure((await manager.client.storage.from(BUCKET).upload(blockedUpload.object_name,pdf,{contentType:'application/pdf'})).error,'Existing reservation uploaded while paused');
    ensure((await edge(manager.token, { document_id: pausedDoc.id, revision: app.revision })).status === 503, 'Paused Edge finalizer allowed');
    const direct = await server.rpc('cs_manager_finalize_proof', { p_actor: manager.id, p_document: pausedDoc.id, p_revision: app.revision, p_sha256: createHash('sha256').update(pdf).digest('hex') }); ensure(direct.error?.code === '55000', 'Server RPC bypassed pause');
    await denied(manager, 'cs_manager_submit', { p_application:app.id, p_revision:app.revision }, '55000');
    ensure(JSON.stringify(await snapshot()) === JSON.stringify(beforeFinalize), 'Paused finalization changed data'); pass('paused Edge/server finalization and submission leave data unchanged');
    await pause(true); ensure((await edge(manager.token, { document_id:pausedDoc.id, revision:app.revision })).ok, 'Safe finalization retry failed'); app=(await state(manager)).application;
    const submits = await Promise.all([manager.client.rpc('cs_manager_submit',{p_application:app.id,p_revision:app.revision}),manager.client.rpc('cs_manager_submit',{p_application:app.id,p_revision:app.revision})]);
    ensure(submits.every((r)=>!r.error && r.data.status==='pending') && submits[0].data.id===submits[1].data.id && submits[0].data.revision===submits[1].data.revision, 'Duplicate submit produced inconsistent state');
    app=(await state(manager)).application;
    ensure((await sql("select count(*)::int as n from public.manager_verification_events where application_id=$1::uuid and action='submitted'",[app.id],true))[0].n===1, 'Duplicate submit created duplicate events'); pass('concurrent duplicate submit produces one pending record/event');
    await denied(student,'cs_manager_review',reviewArgs(app)); await denied(manager,'cs_manager_review',reviewArgs(app)); pass('ordinary users cannot review or self-approve');
    const selfDraft=await rpc(reviewer,'cs_manager_save_draft',{p_fields:fields}); const selfProof=await attach(reviewer,selfDraft,'self.pdf','application/pdf',pdf);
    const selfPending=await rpc(reviewer,'cs_manager_submit',{p_application:selfProof.app.id,p_revision:selfProof.app.revision});
    await denied(reviewer,'cs_manager_review',reviewArgs(selfPending)); pass('assigned reviewer cannot approve own pending application');
    await pause(false); const beforeReview=await snapshot();
    for (const decision of ['approved','needs_information','rejected']) await denied(reviewer,'cs_manager_review',reviewArgs(app,decision),'55000');
    ensure(JSON.stringify(await snapshot())===JSON.stringify(beforeReview), 'Paused review changed data');
    ensure(!(await reviewer.client.storage.from(BUCKET).download(pausedDoc.object_name)).error, 'Trusted recovery evidence read unavailable'); pass('all paused review decisions denied; trusted private read retained');
    await pause(true);
    app=await rpc(reviewer,'cs_manager_review',reviewArgs(app,'needs_information'));
    app=await rpc(manager,'cs_manager_save_draft',{p_fields:fields,p_revision:app.revision}); app=await rpc(manager,'cs_manager_submit',{p_application:app.id,p_revision:app.revision});
    await rpc(reviewer,'cs_manager_review',reviewArgs(app)); ensure((await state(manager)).access.authorized && !(await state(student)).access.authorized,'Approved independent access incorrect'); pass('correction/resubmission and independent approved assignment');
    for (const table of ['manager_verification_applications','manager_verification_documents','manager_verification_events','manager_authorizations']) {
      const isolated=await student.client.from(table).select('*'); ensure(!isolated.error && isolated.data.length===0,'Cross-applicant populated records exposed');
    }
    pass('populated application, proof, history and authorization rows stay isolated');
    await pause(false);
    const accessArgs=(value)=>({p_user:manager.id,p_state:value,p_reason:'Synthetic staging containment'});
    await denied(reviewer,'cs_manager_set_authorization',accessArgs('active'),'55000');
    await rpc(reviewer,'cs_manager_set_authorization',accessArgs('suspended')); await rpc(reviewer,'cs_manager_set_authorization',accessArgs('revoked'));
    const revoked=await state(manager); ensure(revoked.access.state==='revoked' && !revoked.access.authorized && !revoked.ready,'Containment did not revoke access'); pass('paused reactivation denied; suspension/revocation retained');
    await pause(true); ensure(!(await state(manager)).access.authorized,'Reopening readiness undid revocation'); pass('revocation persists with original user JWT');
    await rpc(reviewer,'cs_manager_set_authorization',accessArgs('active')); ensure((await state(manager)).access.authorized,'Authorized recovery after reopening failed');
    await sql('update campusstay_private.reviewer_assignments set active=false where user_id=$1::uuid',[reviewer.id]);
    await denied(reviewer,'cs_manager_set_authorization',accessArgs('revoked'));
    const formerRead=await reviewer.client.from('manager_verification_applications').select('id').eq('id',app.id); ensure(!formerRead.error && formerRead.data.length===0,'Former reviewer retained cross-owner read'); pass('reviewer deactivation enforced with original JWT');
    return { passed, hosted: !control };
  } finally {
    if (ownsRun) { await pause(false); log('Staging readiness disabled; synthetic accounts/documents/audit retained. No automatic deletion.'); }
  }
}
async function runHosted(config, fetcher = fetch, log = console.log) {
  return runVerificationSuite(config, fetcher, log);
}
async function main(args = process.argv.slice(2), env = process.env, runner = runHosted) {
  if (!args.length || (args.length === 1 && args[0] === '--plan')) { console.log('OFFLINE PLAN — no requests; not hosted test evidence.'); CASES.forEach((name,i)=>console.log(`${i+1}. ${name}`)); return; }
  ensure(args.length === 1 && args[0] === '--run','Use --plan or explicitly approved --run');
  return runner(validateTarget(env));
}
module.exports = { main, validateTarget, verifyExpiredSignature, CASES, LIVE_PROJECT_REF, runVerificationSuite };
if (require.main === module) main().catch((error) => {
  // Only our fixed check labels are printable; SDK/network exceptions may carry credentials.
  console.error(error instanceof HostedCheckError ? error.message : 'Hosted staging check failed; inspect privately.');
  console.error('No credentials/raw responses logged. If containment failed, explicitly disable staging readiness before retrying.');
  process.exitCode=1;
});
