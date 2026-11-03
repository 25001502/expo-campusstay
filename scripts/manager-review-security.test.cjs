// Pure contract/static drift checks. SQL execution is the separate check-manager-review-security.cjs runner.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { loadSharedContract } = require('./load-shared-contracts.cjs');
const f = require('./shared-contract-fixtures.cjs');
const c = loadSharedContract('review-security');
const base = 'supabase/migrations/20261021135040_manager_verification.sql';
const name = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('_manager_review_security.sql'));
assert.equal(name.length, 1);
const extension = fs.readFileSync(`supabase/migrations/${name[0]}`, 'utf8');
const command = (patch = {}) => ({ ...f.proposedReview(), contract: 'manager-review', ...patch });
test('H1.3 fingerprint is unchanged and extension is ordered after it', () => {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(base)).digest('hex'), '6317d6fbc72b819b09d30523029c5f815b5ec6c409785c24ece29aecd89cf8ab');
  assert.ok(name[0] > '20261021135040_manager_verification.sql');
  assert.match(extension, /begin;/); assert.match(extension, /commit;/);
});
test('actual local review command stays separate from proposed/preview envelopes', () => {
  assert.equal(c.REVIEW_SECURITY_CONTRACT.deployment, 'not-deployed');
  assert.equal(c.parseReviewCommandV2(command()).decision, 'approved');
  assert.throws(() => c.parseReviewCommandV2(f.proposedReview()));
  assert.throws(() => c.parseReviewCommandV2({ source: 'synthetic', data: command() }));
});
for (const key of ['applicant', 'business', 'authority']) test(`local SQL review contract requires boolean checked ${key} for approval`, () => {
  for (const flag of [false, 'true', null, 1]) assert.throws(() => c.parseReviewCommandV2(command({ checklist: { ...command().checklist, [key]: flag } })));
});
test('information requests/rejections require a typed checklist without all approval attestations', () => {
  for (const decision of ['needs_information', 'rejected']) c.parseReviewCommandV2(command({ decision, checklist: { schema_version: 1, applicant: false, business: false, authority: false } }));
});
test('review contract rejects actor/MFA overrides, missing keys and invalid identifiers/revisions/status', () => {
  for (const patch of [{ actor_id: f.owner }, { mfa: true }, { reviewer_role: 'admin' }, { application_id: '' }, { request_id: '' }, { expected_revision: -1 }, { expected_revision: '3' }, { decision: 'active' }, { version: 1 }]) assert.throws(() => c.parseReviewCommandV2(command(patch)));
  for (const key of Object.keys(command())) { const input = command(); delete input[key]; assert.throws(() => c.parseReviewCommandV2(input)); }
});
test('review reason policy preserves explicit Unicode bounds and rejects placeholders/repetition', () => {
  for (const value of [null, '', 'approved', 'approved '.repeat(10), 'x'.repeat(2001), 'The '.repeat(20)]) assert.throws(() => c.parseReviewReason(value));
  for (const value of ['The supplied management authority evidence was examined.', 'Les informations fournies nécessitent une clarification.', 'The supplied document 😀 needs clarification.']) assert.equal(c.parseReviewReason(value), value);
  assert.throws(() => c.parseReviewReason('😀'.repeat(1000) + 'x'.repeat(1001)));
});
test('access command requires positive optimistic version and no caller privilege flags', () => {
  const input = { version: 2, request_id: f.other, user_id: f.owner, expected_version: 1, state: 'revoked', reason: 'The supplied management authority evidence requires clarification.' };
  assert.equal(c.parseAccessCommandV2(input).state, 'revoked');
  for (const patch of [{ expected_version: 0 }, { expected_version: 2147483648 }, { user_id: 'missing' }, { state: 'approved' }, { role: 'admin' }, { reason: 'x' }]) assert.throws(() => c.parseAccessCommandV2({ ...input, ...patch }));
});
test('private-note command cannot carry decisions, scope grants or hidden ownership fields', () => {
  const input = { application_id: f.applicationId, application_revision: 3, note_revision: 0, note: 'Internal observation' };
  assert.equal(c.parseNoteWriteCommand(input).note_revision, 0);
  assert.equal(c.parseNoteWriteCommand({ ...input, note: '' }).note, '');
  for (const patch of [{ note: 'x'.repeat(4001) }, { note_revision: -1 }, { application_revision: '3' }, { author_id: f.owner }, { decision: 'approved' }, { role: 'admin' }]) assert.throws(() => c.parseNoteWriteCommand({ ...input, ...patch }));
});
test('review result parser rejects private-note and raw-database fields', () => {
  const result = { version: 2, request_id: f.other, application: f.application() };
  assert.equal(c.parseReviewResponseV2(result).application.id, f.applicationId);
  assert.throws(() => c.parseReviewResponseV2({ ...result, internal_note: 'secret' }));
  assert.throws(() => c.parseReviewResponseV2({ ...result, application: { ...result.application, internal_note: 'secret' } }));
});
test('extension never enables readiness, seeds assignments or grants ordinary private-table access', () => {
  assert.doesNotMatch(extension, /set\s+finalizer_ready\s*=\s*true/i);
  assert.doesNotMatch(extension, /insert\s+into\s+campusstay_private\.(?:reviewer_assignments|access_management_assignments)/i);
  assert.doesNotMatch(extension, /grant\s+(?:select|insert|update|delete|all)\s+on\s+(?:table\s+)?campusstay_private/i);
  assert.match(extension, /revoke all on function public\.cs_manager_review\(uuid,integer,text,text\),public\.cs_manager_set_authorization\(uuid,text,text\) from public,anon,authenticated,service_role/);
});
