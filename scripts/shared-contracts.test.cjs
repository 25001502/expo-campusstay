const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { loadSharedContract } = require('./load-shared-contracts.cjs');
const f = require('./shared-contract-fixtures.cjs');
const core = loadSharedContract('core');
const h13 = loadSharedContract('manager-verification');
const proposed = loadSharedContract('proposed');
const copy = value => JSON.parse(JSON.stringify(value));
const invalid = (fn, code = 'invalid_input') => assert.throws(fn, error => error.name === 'ContractError' && error.code === code && !/private|secret|token/.test(error.message));

test('shared version and implemented/proposed/preview catalogs are explicit', () => {
  assert.equal(core.CONTRACT_VERSION, 1);
  assert.equal(h13.H13_CONTRACT.deployment, 'not-deployed');
  assert.equal(proposed.PROPOSED_CONTRACT.implementation, 'proposed-not-implemented');
  assert.equal(loadSharedContract('preview').PREVIEW_CONTRACT.implementation, 'frontend-only-preview');
});
test('identity references contain only version and a UUID, never role or credential fields', () => {
  assert.deepEqual(copy(core.parseIdentityReference({ version: 1, user_id: f.owner })), { version: 1, user_id: f.owner });
  for (const value of ['', 'student-1', null, 1, ` ${f.owner}`, f.owner + '/proof']) invalid(() => core.parseIdentityReference({ version: 1, user_id: value }));
  invalid(() => core.parseIdentityReference({ version: 2, user_id: f.owner }), 'unsupported_version');
  for (const extra of ['role', 'user_metadata', 'access_token', 'service_role']) invalid(() => core.parseIdentityReference({ version: 1, user_id: f.owner, [extra]: 'secret' }));
});
test('PostgreSQL revisions allow zero/int4 maximum but never fractions, strings, negatives or overflow', () => {
  assert.equal(core.revision(0), 0); assert.equal(core.revision(2147483647), 2147483647);
  for (const n of [-1, 0.5, NaN, Infinity, '3', null, 2147483648, Number.MAX_SAFE_INTEGER + 1]) invalid(() => core.revision(n));
});
test('application DTO returns a fresh whitelisted value and accepts partial draft fields', () => {
  const input = f.application(); assert.deepEqual(copy(h13.parseManagerApplication(input)), input);
  h13.parseManagerApplication(f.application({ status: 'draft', submitted_at: null, phone: '', business_name: '', property_location: '', relationship: '', full_name: '', proof: null }));
  assert.notEqual(h13.parseManagerApplication(input).proof, input.proof);
  h13.parseManagerApplication(f.application({ full_name: '😀'.repeat(200) })); // PostgreSQL length counts code points.
});
for (const [key, value] of [
  ['id', ''], ['applicant_id', 'wrong'], ['status', 'suspended'], ['status', 'published_example'], ['relationship', 'admin'], ['revision', -1], ['revision', '3'],
  ['full_name', 'a'.repeat(201)], ['phone', 'a'.repeat(25)], ['business_name', 'a'.repeat(161)], ['property_location', 'a'.repeat(501)], ['review_reason', 'a'.repeat(2001)], ['submitted_at', 'invalid'],
]) test(`application boundary rejects malformed ${key}: ${String(value).slice(0, 24)}`, () => invalid(() => h13.parseManagerApplication(f.application({ [key]: value }))));
test('missing, inherited and unexpected application fields are rejected, including sensitive DB fields', () => {
  for (const key of Object.keys(f.application())) {
    const input = f.application(); delete input[key]; invalid(() => h13.parseManagerApplication(input));
  }
  for (const key of ['reviewer_id', 'object_name', 'sha256', 'internalNote', 'role', 'source']) invalid(() => h13.parseManagerApplication({ ...f.application(), [key]: 'private secret' }));
  invalid(() => h13.parseManagerApplication(Object.create(f.application())));
  for (const value of [null, [], 'private', 1]) invalid(() => h13.parseManagerApplication(value));
});
test('evidence metadata enforces bounded safe fields and rejects Storage-internal details', () => {
  const proof = f.application().proof;
  for (const patch of [{ id: 'missing' }, { file_name: '' }, { file_name: '../private.pdf' }, { file_name: 'bad\n.pdf' }, { mime_type: 'text/html' }, { byte_size: 0 }, { byte_size: 5242881 }, { object_name: 'private-path' }, { sha256: 'secret' }]) invalid(() => h13.parseEvidenceMetadata({ ...proof, ...patch }));
  assert.equal(h13.parseEvidenceMetadata({ ...proof, byte_size: 5242880 }).byte_size, 5242880);
});
test('own application and state require exact owner and fail closed when permissions disagree', () => {
  invalid(() => h13.parseOwnApplication(f.application(), f.other), 'forbidden');
  invalid(() => h13.parseOwnState(f.state(), '' ));
  for (const patch of [{ version: 2 }, { ready: 'true' }, { access: { state: 'active', authorized: 'true' } }, { role: 'admin' }, { access: { state: 'admin', authorized: true } }]) assert.throws(() => h13.parseOwnState(f.state(patch), f.owner));
  const approved = f.application({ status: 'approved' });
  assert.equal(h13.parseOwnState(f.state({ application: approved, access: { state: 'active', authorized: true } }), f.owner).access.authorized, true);
  for (const accessState of ['none', 'suspended', 'revoked']) assert.equal(h13.parseOwnState(f.state({ application: approved, access: { state: accessState, authorized: true } }), f.owner).access.authorized, false);
  for (const patch of [{ ready: false }, { application: null }, { application: f.application() }, { access: { state: 'active', authorized: false } }]) assert.equal(h13.parseOwnState(f.state({ application: approved, access: { state: 'active', authorized: true }, ...patch }), f.owner).access.authorized, false);
});
test('legacy review command mirrors SQL reason bounds without claiming preview checklist enforcement', () => {
  assert.equal(h13.parseH13ReviewCommand(f.review({ p_reason: ' x ' })).p_reason, 'x');
  assert.equal(h13.parseH13ReviewCommand(f.review({ p_reason: '😀'.repeat(2000) })).p_reason.length, 4000);
  for (const patch of [{ p_reason: ' ' }, { p_reason: 'a'.repeat(2001) }, { p_reason: null }, { p_decision: 'active' }, { p_revision: null }, { p_application: '' }, { confirmations: {} }, { actor_id: f.owner }]) invalid(() => h13.parseH13ReviewCommand(f.review(patch)));
});
test('review target preflight rejects wrong IDs, stale revisions and impossible state transitions', () => {
  assert.equal(h13.checkH13ReviewTarget(f.review(), f.application()).p_decision, 'needs_information');
  invalid(() => h13.checkH13ReviewTarget(f.review({ p_application: f.other }), f.application()), 'forbidden');
  invalid(() => h13.checkH13ReviewTarget(f.review({ p_revision: 2 }), f.application()), 'conflict');
  for (const status of ['draft', 'needs_information', 'approved', 'rejected']) invalid(() => h13.checkH13ReviewTarget(f.review(), f.application({ status })), 'forbidden');
  invalid(() => h13.checkH13ReviewTarget(f.review({ p_revision: 2147483647 }), f.application({ revision: 2147483647 })), 'conflict');
});
test('proposed v2 review requires exact versioned checklist, reason, IDs and revision', () => {
  assert.equal(proposed.parseProposedManagerReview(f.proposedReview()).decision, 'approved');
  for (const patch of [{ contract: 'live' }, { applicant_reason: 'x' }, { applicant_reason: 'placeholder '.repeat(5) }, { checklist: { applicant: true, business: true, authority: true } }, { request_id: '' }, { expected_revision: '3' }, { internal_notes: 'secret' }, { actor_id: f.owner }, { confirmation: 'confirmed-in-dialog' }]) invalid(() => proposed.parseProposedManagerReview(f.proposedReview(patch)));
  invalid(() => proposed.parseProposedManagerReview(f.proposedReview({ version: 1 })), 'unsupported_version');
  invalid(() => proposed.parseProposedManagerReview(f.proposedReview({ checklist: { schema_version: 2, applicant: true, business: true, authority: true } })), 'unsupported_version');
  for (const key of ['applicant', 'business', 'authority']) {
    invalid(() => proposed.parseProposedManagerReview(f.proposedReview({ checklist: { ...f.proposedReview().checklist, [key]: false } })));
    invalid(() => proposed.parseProposedManagerReview(f.proposedReview({ checklist: { ...f.proposedReview().checklist, [key]: 'true' } })));
  }
  for (const decision of ['needs_information', 'rejected']) proposed.parseProposedManagerReview(f.proposedReview({ decision, checklist: { schema_version: 1, applicant: false, business: false, authority: false } }));
});
test('finalizer shape follows current Edge; int4/safe-integer mismatch stays explicit', () => {
  h13.parseFinalizeRequest({ document_id: f.documentId, revision: Number.MAX_SAFE_INTEGER });
  invalid(() => core.revision(Number.MAX_SAFE_INTEGER));
  for (const patch of [{ document_id: 'wrong' }, { revision: -1 }, { revision: '3' }, { revision: NaN }, { owner: f.owner }]) invalid(() => h13.parseFinalizeRequest({ document_id: f.documentId, revision: 3, ...patch }));
  for (const code of h13.finalizerErrorCodes) assert.equal(h13.parseFinalizeResponse({ ok: false, code }).code, code);
  assert.equal(h13.parseFinalizeResponse({ ok: true, code: 'verified' }).ok, true);
  for (const value of [{ ok: true }, { ok: true, code: 'permission' }, { ok: false, code: 'verified' }, { ok: false, code: 'secret' }, { ok: 'true', code: 'verified' }, { ok: false, code: 'file', detail: 'private-token' }]) invalid(() => h13.parseFinalizeResponse(value));
});
test('versioned result envelopes reject raw/unknown error payloads without echoing details', () => {
  for (const code of core.errorCodes) assert.equal(core.parseContractResult({ version: 1, ok: false, error: { code } }, core.parseIdentityReference).error.code, code);
  const value = core.parseContractResult({ version: 1, ok: true, data: { version: 1, user_id: f.owner } }, core.parseIdentityReference);
  assert.equal(value.data.user_id, f.owner);
  for (const error of [{ code: 'secret' }, { code: 'forbidden', message: 'private-token' }, {}, null]) invalid(() => core.parseContractResult({ version: 1, ok: false, error }, core.parseIdentityReference));
  for (const value of [null, [], { version: 1, ok: 'false', error: { code: 'forbidden' } }, { version: 1, ok: false, data: {}, error: { code: 'forbidden' } }]) invalid(() => core.parseContractResult(value, core.parseIdentityReference));
  invalid(() => core.parseContractResult({ version: 2, ok: true, data: {} }, core.parseIdentityReference), 'unsupported_version');
});
test('shared status/event vocabularies and projections agree with the actual unchanged migration', () => {
  const sql = readFileSync('supabase/migrations/20261021135040_manager_verification.sql', 'utf8');
  for (const status of h13.applicationStatuses) assert.ok(sql.includes(`'${status}'`));
  for (const action of h13.verificationEventTypes) assert.ok(sql.includes(`'${action}'`));
  const projection = sql.split('create function campusstay_private.application_json')[1].split('create function public.cs_manager_state')[0];
  for (const key of Object.keys(f.application())) assert.ok(projection.includes(`'${key}'`));
  for (const key of ['object_name', 'sha256', 'internal_notes']) assert.ok(!projection.includes(`'${key}'`));
});
