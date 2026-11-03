const assert = require('node:assert/strict');
const test = require('node:test');
const { load, harness } = require('./profile-harness.cjs');
const globals = { queueMicrotask, Request, Response, Blob, ArrayBuffer, Uint8Array, TextDecoder };
const domain = load('src/verification/domain.ts');
const { VerificationController } = load('src/verification/controller.ts', { './domain': domain }, globals);
const { createVerificationApi, parseState } = load('src/verification/api.ts', { './domain': domain }, globals);
const { createFinalizer } = load('supabase/functions/manager-verification-finalize/handler.ts', {}, globals);
const copy = (value) => JSON.parse(JSON.stringify(value));
const fields = { phone: '+27 72 123 4567', business_name: 'Campus Residence', property_location: '1 Campus Road', relationship: 'owner' };
const owner = '10000000-0000-4000-8000-000000000001', id = '20000000-0000-4000-8000-000000000001', documentId = '30000000-0000-4000-8000-000000000001';
const application = (patch = {}) => ({ ...fields, id, applicant_id: owner, full_name: 'Thandi', revision: 1, status: 'draft', proof: null, submitted_at: null, reviewed_at: null, review_reason: null, ...patch });
const state = (app = null, patch = {}) => ({ version: 1, ready: true, application: app, access: { state: 'none', authorized: false }, ...patch });
const proof = () => ({ id: documentId, file_name: 'proof.pdf', mime_type: 'application/pdf', byte_size: 5 });
function fixture(options = {}) {
  let saved = options.application ?? null, access = options.access ?? { state: 'none', authorized: false }, releases = 0;
  const calls = [];
  const api = {
    state: async () => { calls.push('state'); if (options.stateError) throw options.stateError; return state(saved, { ready: options.ready ?? true, access }); },
    save: async (fields, revision) => { calls.push(['save', copy(fields), revision]); if (options.saveError) throw options.saveError; saved = application({ ...saved, ...fields, revision: (saved?.revision ?? 0) + 1 }); return copy(saved); },
    reserve: async () => { calls.push('reserve'); return { id: documentId, object_name: `${owner}/${id}/${documentId}.pdf`, mime_type: 'application/pdf' }; },
    upload: async () => { calls.push('upload'); if (options.uploadError) throw options.uploadError; },
    finalize: async () => { calls.push('finalize'); if (options.finalizeError) throw options.finalizeError; saved = { ...saved, proof: proof(), revision: saved.revision + 1 }; },
    submit: async () => { calls.push('submit'); if (options.submitError) throw options.submitError; saved = { ...saved, status: 'pending', submitted_at: '2026-10-21T14:00:00Z', revision: saved.revision + 1 }; },
  };
  const evidence = { name: 'proof.pdf', mime: 'application/pdf', bytes: Uint8Array.from([37, 80, 68, 70, 45]).buffer, dispose() { releases++; } };
  return { api, controller: new VerificationController(api), calls, evidence, options, get releases() { return releases; }, get saved() { return saved; }, set saved(a) { saved = a; }, set access(value) { access = value; } };
}
test('manager validation requires appropriate contact, business, location and declaration', () => {
  assert.equal(Object.keys(domain.validateVerification(fields)).length, 0);
  assert.deepEqual(Object.keys(domain.validateVerification(domain.emptyFields())).sort(), ['business_name', 'phone', 'property_location', 'relationship']);
  assert.ok(domain.validateVerification({ ...fields, phone: 'abc12345' }).phone);
  assert.ok(domain.validateVerification({ ...fields, business_name: 'a'.repeat(161) }).business_name);
  assert.ok(domain.validateVerification({ ...fields, property_location: 'a'.repeat(501) }).property_location);
});
test('backend readiness is required before collecting/saving/picking proof', async () => {
  const f = fixture({ ready: false }); await f.controller.refresh();
  assert.equal(f.controller.getSnapshot().phase, 'unavailable');
  await f.controller.save(); await f.controller.choose(async () => { throw new Error('must not pick'); });
  assert.equal(f.calls.length, 1); assert.match(f.controller.getSnapshot().error, /awaiting secure setup/);
});
test('draft values are saved remotely and resumed by a fresh controller', async () => {
  const f = fixture(); await f.controller.refresh(); for (const [key, value] of Object.entries(fields)) f.controller.update(key, value);
  assert.equal(await f.controller.save(), true); assert.equal(f.saved.applicant_id, owner);
  const next = new VerificationController(f.api); await next.refresh(); assert.deepEqual(copy(next.getSnapshot().fields), fields);
  assert.equal(next.getSnapshot().data.application.id, id); assert.match(f.controller.getSnapshot().notice, /Draft saved/);
});
test('draft save failure preserves user entries and never claims persistence', async () => {
  const f = fixture({ saveError: new Error('secret token path') }); await f.controller.refresh(); f.controller.update('phone', fields.phone);
  assert.equal(await f.controller.save(), false); assert.equal(f.controller.getSnapshot().fields.phone, fields.phone);
  assert.equal(f.controller.getSnapshot().notice, ''); assert.doesNotMatch(f.controller.getSnapshot().error, /secret|token|path/);
});
test('form progress validates current fields and preserves entered values when going back', async () => {
  const f = fixture(); await f.controller.refresh(); f.controller.move(1); assert.equal(f.controller.getSnapshot().step, 0);
  f.controller.update('phone', fields.phone); f.controller.move(1); assert.equal(f.controller.getSnapshot().step, 1);
  f.controller.move(2); assert.equal(f.controller.getSnapshot().step, 1);
  for (const [key, value] of Object.entries(fields)) f.controller.update(key, value);
  f.controller.move(2); f.controller.move(0); assert.equal(f.controller.getSnapshot().fields.business_name, fields.business_name);
});
test('proof cancellation preserves the current proof and makes no upload request', async () => {
  const f = fixture({ application: application({ proof: proof() }) }); await f.controller.refresh(); await f.controller.choose(async () => null);
  assert.equal(f.controller.getSnapshot().data.application.proof.id, documentId); assert.deepEqual(f.calls, ['state']);
});
for (const [name, patch] of [['wrong signature', { bytes: Uint8Array.from([1, 2, 3]).buffer }], ['wrong extension', { name: 'proof.exe' }], ['oversized', { bytes: new ArrayBuffer(domain.PROOF_LIMIT + 1) }]]) {
  test(`proof ${name} is rejected before network upload and its resource released`, async () => {
    const f = fixture(); await f.controller.refresh(); await f.controller.choose(async () => ({ ...f.evidence, ...patch }));
    assert.equal(f.calls.includes('upload'), false); assert.equal(f.releases, 1); assert.match(f.controller.getSnapshot().error, /5 MB/);
  });
}
test('successful proof upload uses reservation/upload/server finalizer and authoritative reload', async () => {
  const f = fixture(); await f.controller.refresh(); await f.controller.choose(async () => f.evidence);
  assert.deepEqual(f.calls.map((x) => Array.isArray(x) ? x[0] : x), ['state', 'save', 'reserve', 'upload', 'finalize', 'state']);
  assert.equal(f.controller.getSnapshot().data.application.proof.id, documentId); assert.equal(f.releases, 1);
});
for (const failure of ['uploadError', 'finalizeError']) test(`${failure} keeps prior proof and never claims upload/submission success`, async () => {
  const f = fixture({ application: application({ proof: { ...proof(), id: 'old-proof' } }), [failure]: new Error('private signed url') });
  await f.controller.refresh(); await f.controller.choose(async () => f.evidence);
  assert.equal(f.controller.getSnapshot().data.application.proof.id, 'old-proof'); assert.equal(f.releases, 1);
  assert.equal(f.controller.getSnapshot().notice, ''); assert.doesNotMatch(f.controller.getSnapshot().error, /signed url/);
});
test('submission waits for genuine backend pending state and timestamp', async () => {
  const f = fixture({ application: application({ proof: proof() }) }); await f.controller.refresh(); await f.controller.submit();
  assert.equal(f.saved.status, 'pending'); assert.equal(f.controller.getSnapshot().notice, 'Application submitted');
  assert.equal(f.controller.getSnapshot().data.application.submitted_at, '2026-10-21T14:00:00Z');
});
test('submission failure never displays success and keeps the saved draft', async () => {
  const f = fixture({ application: application({ proof: proof() }), submitError: new Error('offline') }); await f.controller.refresh();
  assert.equal(await f.controller.submit(), false); assert.equal(f.saved.status, 'draft'); assert.equal(f.controller.getSnapshot().notice, '');
});
test('repeated submit taps generate only one active server request', async () => {
  const f = fixture({ application: application({ proof: proof() }) }); let finish;
  f.api.submit = async () => { f.calls.push('submit'); await new Promise((r) => { finish = r; }); f.saved = { ...f.saved, status: 'pending' }; };
  await f.controller.refresh(); const pending = f.controller.submit(); await new Promise((r) => setImmediate(r));
  assert.equal(await f.controller.submit(), false); finish(); await pending; assert.equal(f.calls.filter((x) => x === 'submit').length, 1);
});
test('pending and rejected records cannot be edited or resubmitted', async () => {
  for (const status of ['pending', 'rejected', 'approved']) {
    const f = fixture({ application: application({ status }) }); await f.controller.refresh(); f.controller.update('phone', 'changed'); await f.controller.save();
    assert.equal(f.controller.getSnapshot().fields.phone, fields.phone); assert.deepEqual(f.calls, ['state']);
  }
});
test('needs-information allows corrections and resubmission without discarding the review request', async () => {
  const f = fixture({ application: application({ status: 'needs_information', review_reason: 'Clarify address', proof: proof() }) }); await f.controller.refresh();
  assert.equal(f.controller.getSnapshot().data.application.review_reason, 'Clarify address');
  f.controller.update('property_location', '2 Campus Road'); await f.controller.submit(); assert.equal(f.saved.status, 'pending');
});
test('dirty fields survive automatic refresh and concurrent changes require an explicit reload', async () => {
  const f = fixture({ application: application() }); await f.controller.refresh(); f.controller.update('phone', '+27 82 000 0000'); await f.controller.refresh();
  assert.equal(f.controller.getSnapshot().fields.phone, '+27 82 000 0000'); assert.equal(f.controller.getSnapshot().conflict, false);
  f.saved = { ...f.saved, revision: 2, phone: '+27 83 111 1111' }; await f.controller.refresh();
  assert.equal(f.controller.getSnapshot().conflict, true); assert.equal(await f.controller.save(), false);
  await f.controller.reload(); assert.equal(f.controller.getSnapshot().fields.phone, '+27 83 111 1111'); assert.equal(f.controller.getSnapshot().conflict, false);
});
test('permission revalidation removes access on revocation or connection failure', async () => {
  const f = fixture({ application: application({ status: 'approved' }), access: { state: 'active', authorized: true } }); await f.controller.refresh();
  f.access = { state: 'revoked', authorized: false }; await f.controller.refresh(); assert.equal(f.controller.getSnapshot().data.access.authorized, false);
  f.options.stateError = new Error('offline'); await f.controller.refresh(); assert.equal(f.controller.getSnapshot().data, null);
});
test('sign-out/disposal during a picker result prevents further requests and releases evidence', async () => {
  const f = fixture(); await f.controller.refresh(); let finish;
  const choosing = f.controller.choose(() => new Promise((r) => { finish = r; })); f.controller.dispose(); finish(f.evidence); await choosing;
  assert.deepEqual(f.calls, ['state']); assert.equal(f.releases, 1);
});
test('effect replay retains controller; actual unmount disposes it', async () => {
  const f = fixture(), release = f.controller.retain(); release(); const releaseAgain = f.controller.retain();
  await Promise.resolve(); assert.equal(await f.controller.refresh(), true); releaseAgain(); await Promise.resolve(); assert.equal(await f.controller.refresh(), false);
});
test('DTO requires matching applicant and independent server permission, never approved status alone', () => {
  assert.equal(parseState(state(application({ status: 'approved' })), owner).access.authorized, false);
  assert.equal(parseState(state(application({ status: 'pending' }), { access: { state: 'active', authorized: true } }), owner).access.authorized, false);
  assert.equal(parseState(state(application({ status: 'approved' }), { access: { state: 'revoked', authorized: true } }), owner).access.authorized, false);
  assert.throws(() => parseState(state(application({ applicant_id: 'other' })), owner));
  assert.equal(parseState(state(application({ status: 'approved' }), { access: { state: 'active', authorized: true } }), owner).access.authorized, true);
});
test('API handles undeployed RPC truthfully and never falls back to a fabricated record', async () => {
  const api = createVerificationApi({ rpc: async () => ({ data: null, error: { code: 'PGRST202' } }) }, owner);
  await assert.rejects(api.state(), (error) => error.code === 'setup');
});
test('API uploads ArrayBuffer with no overwrite/public URL and no role-bearing payload', async () => {
  let captured;
  const api = createVerificationApi({ storage: { from: (bucket) => ({ upload: async (...args) => { captured = { bucket, args }; return { error: null }; } }) } }, owner);
  const f = fixture(); await api.upload({ object_name: 'private-path' }, f.evidence);
  assert.equal(captured.bucket, 'campusstay-manager-verification'); assert.equal(captured.args[1], f.evidence.bytes);
  assert.equal(captured.args[2].upsert, false); assert.equal(captured.args[2].contentType, 'application/pdf');
});

function edgeFixture(options = {}) {
  const calls = [], reads = [], bytes = options.bytes ?? [37, 80, 68, 70, 45];
  const document = { id: documentId, applicant_id: owner, object_name: 'private-no-log', mime_type: 'application/pdf', byte_size: bytes.length, ...options.document };
  const handler = createFinalizer({
    authenticate: async () => options.unauthenticated ? null : { id: owner },
    ready: async () => { if (options.readinessError) throw new Error('private readiness failure'); return options.ready ?? true; },
    document: async () => { reads.push('document'); return options.missing ? null : document; },
    download: async () => { reads.push('download'); return new Blob([Uint8Array.from(bytes)]); },
    hash: async () => 'a'.repeat(64),
    finalize: async (...args) => { calls.push(args); if (options.fail) throw new Error('private URL secret'); },
  });
  const request = (body = { document_id: documentId, revision: 1 }, headers = { Authorization: 'Bearer synthetic' }) => new Request('https://example.invalid', { method: 'POST', headers, body: JSON.stringify(body) });
  return { handler, request, calls, reads };
}

test('paused or unreadable readiness prevents document lookup, download and finalization', async () => {
  for (const options of [{ ready: false }, { readinessError: true }]) {
    const f = edgeFixture(options), response = await f.handler(f.request());
    assert.equal(response.status, options.ready === false ? 503 : 409);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.calls, []);
    assert.doesNotMatch(await response.text(), /private|token|readiness failure/);
  }
});

test('a database pause rejection cannot produce a successful finalization response', async () => {
  const f = edgeFixture({ fail: true }), response = await f.handler(f.request());
  assert.equal(response.status, 409); assert.equal((await response.json()).ok, false);
});

test('CORS preflight permits POST and SDK tracing headers without reading documents', async () => {
  const f = edgeFixture({ ready: false });
  const response = await f.handler(new Request('https://example.invalid', { method: 'OPTIONS' }));
  assert.equal(response.status, 204);
  assert.match(response.headers.get('Access-Control-Allow-Methods'), /POST/);
  const { corsHeaders } = require('@supabase/supabase-js/cors');
  for (const header of corsHeaders['Access-Control-Allow-Headers'].split(', ')) assert.ok(response.headers.get('Access-Control-Allow-Headers').includes(header));
  assert.deepEqual(f.reads, []); assert.deepEqual(f.calls, []);
});

test('Edge entrypoint returns CORS preflight and setup errors without configured credentials', async () => {
  let handler;
  load('supabase/functions/manager-verification-finalize/index.ts', {
    '@supabase/supabase-js': { createClient() { throw new Error('must not create a client'); } },
    './handler.ts': load('supabase/functions/manager-verification-finalize/handler.ts', {}, globals),
  }, { ...globals, Deno: { env: { get() {} }, serve(callback) { handler = callback; } } });
  const preflight = await handler(new Request('https://example.invalid', { method: 'OPTIONS' }));
  assert.equal(preflight.status, 204);
  const setup = await handler(new Request('https://example.invalid', { method: 'POST' }));
  assert.equal(setup.status, 503); assert.equal((await setup.json()).ok, false);
  assert.equal(setup.headers.get('Access-Control-Allow-Origin'), '*');
});
test('server finalizer requires authentication and owner-bound document lookup', async () => {
  const f = edgeFixture(); assert.equal((await f.handler(f.request(undefined, {}))).status, 401);
  for (const options of [{ unauthenticated: true }, { missing: true }, { document: { applicant_id: 'another' } }]) {
    const e = edgeFixture(options); assert.ok((await e.handler(e.request())).status >= 400); assert.equal(e.calls.length, 0);
  }
});
test('server finalizer rejects caller-supplied paths/owners and invalid request revisions', async () => {
  const f = edgeFixture();
  for (const body of [{ document_id: documentId, revision: 1, owner }, { document_id: documentId, revision: 1, path: 'other' }, { document_id: documentId, revision: -1 }]) assert.equal((await f.handler(f.request(body))).status, 400);
  assert.equal(f.calls.length, 0);
});
test('server finalizer bounds JSON request bodies before parsing them', async () => {
  const f = edgeFixture(); assert.equal((await f.handler(f.request({ document_id: 'a'.repeat(2048), revision: 1 }))).status, 400); assert.equal(f.calls.length, 0);
});
for (const [name, options] of [['PDF', {}], ['PNG', { bytes: [137, 80, 78, 71, 13, 10, 26, 10], document: { mime_type: 'image/png' } }], ['JPEG', { bytes: [255, 216, 255], document: { mime_type: 'image/jpeg' } }]]) test(`server independently verifies ${name} bytes before privileged finalization`, async () => {
  const f = edgeFixture(options); assert.equal((await f.handler(f.request())).status, 200); assert.equal(f.calls[0][0], owner); assert.equal(f.calls[0][1], documentId);
});
for (const [name, options] of [['wrong content', { bytes: [0, 0, 0] }], ['wrong size', { document: { byte_size: 999 } }], ['oversized', { bytes: new Uint8Array(domain.PROOF_LIMIT + 1) }]]) test(`server denies ${name} without attaching proof`, async () => {
  const f = edgeFixture(options); assert.equal((await f.handler(f.request())).status, 422); assert.equal(f.calls.length, 0);
});
test('server finalizer failures return closed copy with no path, token or exception details', async () => {
  const f = edgeFixture({ fail: true }); const response = await f.handler(f.request()); assert.equal(response.status, 409);
  assert.doesNotMatch(await response.text(), /private|URL|secret/);
});

const find = (s, label) => s.render().find((n) => n.props.accessibilityLabel === label || n.props.label === label || (n.type === 'Btn' && n.props.children === label));
function form(f, options = {}) {
  return harness('src/components/ManagerVerificationForm.tsx', { ...options, exportName: 'ManagerVerificationForm', props: { get value() { return f.controller.getSnapshot(); }, controller: f.controller, fullName: 'Thandi', onWorkspace() {}, onHome() {}, onSignOut() {}, onHelp() {} } });
}
test('ready form uses existing fields and accessible relationship selection without identity-number collection', async () => {
  const f = fixture(); await f.controller.refresh(); let s = form(f);
  assert.equal(find(s, 'Full name').props.disabled, true); assert.ok(find(s, 'Contact phone number'));
  for (const [key, value] of Object.entries(fields)) f.controller.update(key, value); f.controller.move(1); s = form(f);
  assert.ok(find(s, 'Accommodation or business name')); assert.ok(s.render().some((n) => n.type === 'SelectField'));
  assert.equal(s.render().some((n) => /identity number/i.test(n.props.label ?? '')), false);
});
test('pending/status screens render genuine timestamp/reason and keep workspace locked', async () => {
  const f = fixture({ application: application({ status: 'pending', submitted_at: '2026-10-21T14:00:00Z' }) }); await f.controller.refresh(); const s = form(f);
  assert.equal(find(s, 'Submit for review'), undefined); assert.equal(find(s, 'Open Manager Workspace'), undefined);
  assert.ok(s.render().some((n) => n.type === 'Text' && /Submitted:/.test(String(n.props.children))));
});
test('workspace route requires ready trusted access and visibly identifies local portfolio data', () => {
  const f = fixture(); const base = { phase: 'ready', data: state(application({ status: 'approved' }), { access: { state: 'active', authorized: true } }), controller: f.controller, busy: '', foreground: true };
  const s = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerAccessScreen', verification: base });
  assert.ok(s.render().some((n) => n.type === 'ManagerScreen')); assert.ok(s.render().some((n) => /Workspace portfolio data/.test(n.props.children)));
  for (const state of ['revoked', 'suspended']) {
    const denied = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerAccessScreen', verification: { ...base, data: { ...base.data, access: { state, authorized: false } } } });
    assert.equal(denied.render().some((n) => n.type === 'ManagerScreen'), false);
  }
});
test('actual form callbacks progress through contact/accommodation/proof and keep previous entries', async () => {
  const f = fixture(); await f.controller.refresh(); const s = form(f);
  find(s, 'Contact phone number').props.onChangeText(fields.phone); find(s, 'Continue').props.onPress();
  find(s, 'Accommodation or business name').props.onChangeText(fields.business_name); find(s, 'Property address or location').props.onChangeText(fields.property_location);
  s.render().find((n) => n.type === 'SelectField').props.onChange('authorised_manager'); find(s, 'Continue').props.onPress();
  assert.ok(find(s, 'Choose supporting proof')); find(s, 'Previous').props.onPress(); assert.equal(find(s, 'Accommodation or business name').props.value, fields.business_name);
});
test('verification route mounts functional form only after a ready backend response', () => {
  const f = fixture();
  for (const ready of [false, true]) {
    const s = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerRequestScreen', verification: { ...f.controller.getSnapshot(), phase: ready ? 'ready' : 'unavailable', data: state(null, { ready }), controller: f.controller } });
    assert.equal(s.render().some((n) => n.type === 'ManagerVerificationForm'), ready);
  }
});
test('workspace remains mounted but interaction is blocked during revalidation/backgrounding', () => {
  const f = fixture();
  const s = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerAccessScreen', verification: { phase: 'ready', data: state(application({ status: 'approved' }), { access: { state: 'active', authorized: true } }), controller: f.controller, busy: 'refreshing', foreground: false } });
  assert.ok(s.render().some((n) => n.type === 'ManagerScreen'));
  assert.ok(s.render().some((n) => n.type === 'View' && n.props.pointerEvents === 'none' && n.props.importantForAccessibility === 'no-hide-descendants'));
});
test('pending verification or a connection failure never silently falls back to the development workspace', () => {
  for (const verification of [{ phase: 'ready', data: state(application({ status: 'pending' })) }, { phase: 'error', data: null }]) {
    const s = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerAccessScreen', development: true, managerPreview: 'true', verification });
    assert.equal(s.render().some((n) => n.type === 'ManagerScreen'), false);
  }
});
test('shared provider refreshes trusted status on validated session restoration and listens for assignment changes', async () => {
  const effects = [], subscriptions = [], states = [], focus = [];
  let refreshed = 0, removed = 0;
  const controller = { subscribe() {}, getSnapshot: () => ({ phase: 'ready', data: state(application()) }), retain: () => () => {}, refresh: async () => { refreshed++; return true; } };
  const channel = { on: (...args) => { subscriptions.push(args); return channel; }, subscribe: () => channel };
  const auth = { phase: 'authenticated', user: { id: owner } };
  const module = load('src/verification/useManagerVerification.ts', {
    react: { createContext: () => ({ Provider: 'Provider' }), createElement: (type, props, children) => ({ type, props, children }), useMemo: (fn) => fn(), useState: () => [false, (value) => states.push(value)], useSyncExternalStore: (_subscribe, snapshot) => snapshot(), useEffect: (fn) => effects.push(fn), useCallback: (fn) => fn, useContext() {} },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_event, fn) => { focus.push(fn); return { remove() {} }; } } },
    '@react-navigation/native': { useFocusEffect() {} }, '../state/AuthContext': { useAuth: () => auth },
    '../auth/client': { supabase: { channel: () => channel, removeChannel: async () => { removed++; } } },
    './api': { createVerificationApi: () => ({}) }, './controller': { VerificationController: function () { return controller; } },
  }, { setInterval: () => 1, clearInterval() {} });
  module.ManagerVerificationProvider({ children: null }); const cleanups = effects.map((fn) => fn()); await Promise.resolve();
  assert.equal(refreshed, 1); assert.equal(subscriptions.length, 2);
  assert.equal(subscriptions[0][1].filter, `user_id=eq.${owner}`);
  focus[0]('background'); assert.equal(states.at(-1), false); focus[0]('active'); await Promise.resolve(); assert.equal(refreshed, 2);
  cleanups.forEach((fn) => fn?.()); assert.equal(removed, 1);
});
for (const platform of ['ios', 'android']) for (const fontScale of [1, 1.3, 2]) test(`${platform} verification retains shared keyboard/safe-area shell at ${fontScale * 100}% text`, async () => {
  const f = fixture(); await f.controller.refresh();
  const s = harness('src/screens/AccountScreens.tsx', { exportName: 'ManagerRequestScreen', platform, width: 320, fontScale, insets: { top: 47, bottom: 34, left: 12, right: 9 }, verification: { ...f.controller.getSnapshot(), controller: f.controller } });
  const shell = s.render().filter((n) => n.type === 'KeyboardForm'); assert.equal(shell.length, 1);
  const padding = Object.assign({}, ...shell[0].props.contentContainerStyle); assert.ok(padding.paddingTop > 47); assert.ok(padding.paddingBottom > 34);
  assert.ok(padding.paddingLeft > 12); assert.ok(padding.paddingRight > 9);
  const content = form(f, { platform, width: 320, fontScale }); assert.equal(content.render().some((n) => n.type === 'KeyboardAvoidingView'), false);
});
