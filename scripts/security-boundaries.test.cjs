// Offline executed UI/adapter boundaries and pure future-policy specifications, NOT hosted authorization.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { load, harness } = require('./profile-harness.cjs');
const f = require('./shared-contract-fixtures.cjs');
const h13 = load('shared/contracts/v1/manager-verification.ts');
const proposed = load('shared/contracts/v1/proposed.ts');
const domain = load('src/verification/domain.ts');
const api = load('src/verification/api.ts', { './domain': domain });

for (const intent of ['student', 'manager']) test(`actual mobile guard: ${intent} intent and forged browser-style flags grant no workspace access`, () => {
  for (const status of ['draft', 'pending', 'needs_information', 'rejected', 'approved']) {
    const state = api.parseState(f.state({ application: f.application({ status }) }), f.owner);
    const screen = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerAccessScreen', development: false, managerPreview: 'true', auth: { phase: 'authenticated', intent, user: { id: f.owner, role: 'admin', is_manager: true, user_metadata: { manager_status: 'approved' } } }, verification: { phase: 'ready', data: state } });
    assert.equal(screen.render().some(node => node.type === 'ManagerScreen'), false);
  }
});
test('actual adapter refuses unknown fields, wrong ownership and malformed payloads without fallback', async () => {
  for (const response of [f.state({ application: { ...f.application(), internalNote: 'private' } }), f.state({ application: f.application({ applicant_id: f.other }) }), f.state({ access: { state: 'active', authorized: true, role: 'admin' } }), f.state({ role: 'admin' }), { version: 2 }]) {
    const client = { rpc: async () => ({ data: response, error: null }) };
    await assert.rejects(api.createVerificationApi(client, f.owner).state());
  }
  await assert.rejects(api.createVerificationApi(null, f.owner).state(), error => error.code === 'setup');
});
test('actual mobile finalizer adapter never accepts a malformed success envelope', async () => {
  for (const data of [{ ok: true }, { ok: true, code: 'permission' }, { ok: true, code: 'verified', token: 'private' }, { ok: false, code: 'not_confirmed' }]) {
    await assert.rejects(api.createVerificationApi({ functions: { invoke: async () => ({ data, error: null }) } }, f.owner).finalize({ id: f.documentId }, f.application()), error => error.code === 'upload');
  }
  await api.createVerificationApi({ functions: { invoke: async () => ({ data: { ok: true, code: 'verified' }, error: null }) } }, f.owner).finalize({ id: f.documentId }, f.application());
});
test('pure future contract: manager approval alone does not publish a property', () => {
  assert.equal(proposed.evaluatePublicationEligibility(f.eligibility()).eligible, true);
  assert.equal(proposed.evaluatePublicationEligibility(f.eligibility({ publication: { state: 'unpublished', revision: 4 } })).eligible, false);
  assert.equal(proposed.evaluatePublicationEligibility(f.eligibility({ review: { status: 'pending', approved_revision: null } })).eligible, false);
});
for (const status of ['draft', 'pending', 'needs_information', 'rejected']) test(`pure future contract: ${status} manager cannot publish despite supplied active authorization`, () => {
  assert.equal(proposed.evaluatePublicationEligibility(f.eligibility({ manager_application_status: status })).eligible, false);
});
for (const status of ['none', 'suspended', 'revoked']) test(`pure future contract: ${status} authorization denies publication despite approved manager`, () => {
  assert.equal(proposed.evaluatePublicationEligibility(f.eligibility({ manager_authorization: status })).eligible, false);
});
test('pure future contract: property-specific authority, exact approved revision, readiness and media are independent gates', () => {
  for (const patch of [
    { catalogue_ready: false }, { verification_ready: false }, { approved_media_ready: false },
    { publication: { state: 'blocked', revision: 4 } }, { publication: { state: 'published', revision: 5 } },
    ...['property_id', 'manager_id'].map(key => ({ assignment: { ...f.eligibility().assignment, [key]: f.other } })),
    ...['trusted', 'current', 'primary'].map(key => ({ assignment: { ...f.eligibility().assignment, [key]: false } })),
    ...['provisional', 'suspended', 'revoked'].map(state => ({ assignment: { ...f.eligibility().assignment, state } })),
  ]) assert.equal(proposed.evaluatePublicationEligibility(f.eligibility(patch)).eligible, false);
  for (const patch of [{ manager_authorization: 'admin' }, { role: 'admin' }, { catalogue_ready: 'true' }, { property_id: '' }, { review: { status: 'published_example', approved_revision: 4 } }, { publication: { state: 'published', revision: -1 } }]) assert.throws(() => proposed.evaluatePublicationEligibility(f.eligibility(patch)));
});
test('pure future contract: client confirmations cannot transform a preview or legacy request into a trusted review', () => {
  assert.throws(() => proposed.parseProposedManagerReview({ ...f.review(), confirmations: { applicant: true, business: true, authority: true } }));
  assert.throws(() => h13.parseH13ReviewCommand({ version: 1, source: 'synthetic', data: f.review() }));
  // A well-shaped command/checkbox is still untrusted. No authorizer/network operation is exported here.
  assert.equal(proposed.parseProposedManagerReview(f.proposedReview()).checklist.authority, true);
  assert.equal('authorizeAdmin' in proposed, false);
});
test('shared runtime graph is dependency-free and contains no environment, SDK, browser or native operations', () => {
  const directory = path.resolve('shared/contracts/v1');
  for (const filename of fs.readdirSync(directory).filter(name => name.endsWith('.ts'))) {
    const content = fs.readFileSync(path.join(directory, filename), 'utf8');
    const ast = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
    function inspect(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const specifier = node.moduleSpecifier.text;
        assert.ok(specifier.startsWith('./'), `${filename}: external import ${specifier}`);
        assert.ok(fs.existsSync(path.resolve(directory, `${specifier}.ts`)));
      }
      if (ts.isIdentifier(node)) assert.ok(!['process', 'fetch', 'require', 'window', 'document', 'Deno', 'eval', 'XMLHttpRequest'].includes(node.text), `${filename}: forbidden runtime ${node.text}`);
      if (ts.isCallExpression(node)) assert.notEqual(node.expression.kind, ts.SyntaxKind.ImportKeyword);
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
  const config = require('../metro.config');
  assert.ok(!config.resolver.blockList.some(rule => rule.test(path.join(directory, 'manager-verification.ts'))));
});
