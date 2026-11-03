const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { harness, load, elements, data, application, profile } = require('./profile-harness.cjs');
const { providerHarness } = require('./application-provider-harness.cjs');
const funding = load('src/funding.ts');
const manager = load('src/manager.ts');
const property = data.properties[0];
const pending = { source: 'nsfas', nsfasStatus: 'pending', paymentDiscussionRequested: false };
const find = (nodes, label) => nodes.find((n) => (n.props.accessibilityLabel ?? n.props.label ?? n.props.children) === label);
const strings = (v) => Array.isArray(v) ? v.map(strings).join('') : v && typeof v === 'object' ? strings(v.props?.children) : v == null ? '' : String(v);
const text = (nodes) => nodes.filter((n) => n.type === 'Text').map((n) => strings(n.props.children)).join(' ');
const expand = (nodes) => nodes.flatMap((n) => typeof n.type === 'function' ? elements(n.type(n.props)) : [n]);
async function pick(p, owner, name = 'support.pdf', mimeType = 'application/pdf') {
  p.queue.push({ canceled: false, assets: [{ name, mimeType, size: 200 }] });
  const result = await p.render().chooseDocument(owner, 'funding'); assert.equal(result.status, 'selected'); return result.document;
}
async function savedPending(p) { const draft = await p.validDraft(); draft.funding = { ...pending }; return p.render().submitApplication(draft); }
function editor(p, id, options = {}) {
  const s = harness('src/screens/UpdateFundingScreen.tsx', { applicationApi: () => p.render(), params: { applicationId: id }, ...options });
  s.press = async (label) => { const n = find(s.render(), label); assert.ok(n, `Missing ${label}`); return n.props.onPress(); }; return s;
}

test('canonical funding separates NSFAS source and three declarations; legacy records remain readable without mutation', () => {
  for (const [source, nsfasStatus] of [['nsfas-pending', 'pending'], ['nsfas-confirmed', 'confirmed']]) {
    const old = { source, paymentDiscussionRequested: true }; const before = JSON.stringify(old);
    const normalized = funding.normalizeFunding(old); assert.equal(normalized.source, 'nsfas'); assert.equal(normalized.nsfasStatus, nsfasStatus); assert.equal(JSON.stringify(old), before);
  }
  assert.equal(funding.fundingLabel(pending), 'NSFAS'); assert.equal(funding.fundingStatusLabel(pending), 'Awaiting confirmation');
  assert.equal(funding.fundingStatusLabel({ ...pending, nsfasStatus: 'confirmed' }), 'Student reports confirmed');
  assert.equal(funding.fundingStatusLabel({ ...pending, nsfasStatus: 'unsuccessful' }), 'Student reports unsuccessful');
  assert.ok(funding.validateFunding({ ...pending, nsfasStatus: null })); assert.ok(funding.validateFunding({ ...pending, nsfasStatus: 'verified' }));
  for (const source of ['self-funded', 'parent-guardian', 'sponsor']) assert.equal(funding.validateFunding({ source, paymentDiscussionRequested: false }), undefined);
});

test('actual five-step pending journey needs identity/registration files, no funding letter, and preserves pending through Edit', async () => {
  const p = providerHarness(); const s = harness('src/screens/ApplyScreen.tsx', { applicationApi: () => p.render(), params: { property, selectedRoomId: 'r2' } });
  const press = async (label) => { const node = find(expand(s.render()), label); assert.ok(node, label); return node.props.onPress(); };
  const field = (label, value) => s.render().find((n) => n.type === 'Input' && n.props.label === label).props.onChangeText(value);
  await press('Continue →');
  for (const [label, value] of [['Full name', 'Synthetic Student'], ['Student number', '1234'], ['Phone number', '0712345678'], ['Email address', 'synthetic@example.com']]) field(label, value);
  await press('Continue →'); await press('NSFAS'); assert.equal(find(s.render(), 'Awaiting NSFAS confirmation').props.accessibilityState.selected, true);
  assert.ok(s.render().some((n) => n.props.label === 'Funding pending')); assert.match(text(s.render()), /Each residence sets its own funding requirements/);
  await press('NSFAS application unsuccessful'); assert.match(text(s.render()), /This declaration does not reject your accommodation application/); assert.doesNotMatch(text(s.render()), /application stays saved locally/);
  await press('Awaiting NSFAS confirmation');
  await press('Continue →'); assert.match(text(s.render()), /Attach all required documents/);
  for (const label of ['Student ID', 'Proof of Registration', 'ID / Passport']) { p.queue.push({ canceled: false, assets: [{ name: 'identity.pdf', size: 200, mimeType: 'application/pdf' }] }); await press(`Choose file for ${label}`); }
  await press('Continue →'); field('Full name', 'Synthetic Contact'); field('Phone number', '0711111111'); await press('Review Application');
  assert.match(text(expand(s.render())), /Funding status.*Awaiting confirmation/); assert.match(text(expand(s.render())), /Not attached \(optional\)/);
  await press('Edit Funding information'); assert.equal(find(s.render(), 'Awaiting NSFAS confirmation').props.accessibilityState.selected, true);
  await press('Continue →'); await press('Review Application'); await press('Save Application');
  const saved = p.render().applications[0]; assert.equal(saved.selectedRoomId, 'r2'); assert.equal(saved.funding.nsfasStatus, 'pending'); assert.equal(saved.attachments.funding, undefined);
  s.route.params = { property, applicationId: saved.id }; const status = s.renderScreen('src/screens/AppStatusScreen.tsx'); assert.match(text(status), /Declared status Awaiting confirmation/);
  find(status, 'Update Funding Information').props.onPress(); assert.equal(s.calls.at(-1).args[0], 'UpdateFunding'); assert.equal(s.calls.at(-1).args[1].applicationId, saved.id);
  assert.equal(application.getSubmittedApplicationSummary(saved, property).roomPrice, 2200);
});

test('actual funding editor preloads exact application, saves confirmed declaration and PDF to Status and My Documents', async () => {
  const p = providerHarness(), original = await savedPending(p), other = await savedPending(p), before = JSON.stringify(other);
  const s = editor(p, original.id); assert.equal(find(s.render(), 'Awaiting NSFAS confirmation').props.accessibilityState.selected, true);
  await s.press('NSFAS has confirmed my funding');
  p.queue.push({ canceled: false, assets: [{ name: 'confirmation.pdf', size: 200, mimeType: 'application/pdf' }] }); await s.press('Choose file for Proof of Funding');
  assert.match(text(s.render()), /confirmation.pdf/); assert.equal(p.render().getApplication(original.id).funding.nsfasStatus, 'pending');
  await s.press('Save funding update'); assert.equal(s.calls.at(-1).action, 'goBack');
  const updated = p.render().getApplication(original.id); assert.equal(updated.id, original.id); assert.equal(updated.selectedRoomId, 'r2'); assert.equal(updated.propertyId, original.propertyId);
  assert.equal(JSON.stringify(updated.personal), JSON.stringify(original.personal)); assert.equal(JSON.stringify(updated.emergency), JSON.stringify(original.emergency));
  for (const category of ['student-id', 'registration', 'identity']) assert.equal(updated.attachments[category], original.attachments[category]);
  assert.equal(updated.submittedAt, original.submittedAt); assert.equal(updated.status, 'saved-locally'); assert.equal(updated.funding.nsfasStatus, 'confirmed');
  assert.equal(application.getSubmittedApplicationSummary(updated, property).roomPrice, 2200); assert.equal(p.render().applications.length, 2); assert.equal(JSON.stringify(p.render().getApplication(other.id)), before);
  assert.equal(p.render().documentStatus(original.id, updated.attachments.funding.id), 'attached-local');
  const status = harness('src/screens/AppStatusScreen.tsx', { applicationApi: () => p.render(), params: { property, applicationId: original.id } });
  assert.match(text(status.render()), /Student reports confirmed/); assert.match(text(status.render()), /Supporting document Attached locally/); assert.match(text(status.render()), /1 optional attachment present/); assert.match(text(status.render()), /Not verified/);
  const documents = harness('src/screens/MyDocumentsScreen.tsx', { applicationApi: () => p.render() }); assert.match(text(documents.render()), /confirmation.pdf/);
  const groups = profile.getApplicationDocumentGroups(p.render().applications, data.properties); assert.equal(groups.find((g) => g.applicationId === original.id).categories.find((c) => c.id === 'funding').attachment.name, 'confirmation.pdf');
  assert.doesNotMatch(JSON.stringify(updated), /"uri"|file:\/\/|"file"|base64|verifiedAt|approved/);
});

test('confirmed without evidence remains optional and student-declared; unsuccessful does not reject and can switch to Self-funded', async () => {
  const p = providerHarness(), saved = await savedPending(p);
  await p.render().updateFunding(saved.id, 'edit-confirmed', { ...pending, nsfasStatus: 'confirmed' });
  let updated = p.render().getApplication(saved.id); assert.equal(updated.attachments.funding, undefined); assert.equal(updated.status, 'saved-locally');
  const s = editor(p, saved.id); await s.press('NSFAS application unsuccessful'); assert.match(text(s.render()), /This declaration does not reject your accommodation application/); await s.press('Save funding update');
  updated = p.render().getApplication(saved.id); assert.equal(updated.funding.nsfasStatus, 'unsuccessful'); assert.equal(updated.status, 'saved-locally');
  const self = editor(p, saved.id); await self.press('Self-funded'); assert.equal(find(self.render(), 'Awaiting NSFAS confirmation'), undefined);
  await self.press('I would like to discuss payment arrangements'); await self.press('Save funding update'); updated = p.render().getApplication(saved.id);
  assert.equal(updated.funding.source, 'self-funded'); assert.equal(updated.funding.nsfasStatus, undefined); assert.equal(updated.funding.paymentDiscussionRequested, true); assert.equal(updated.id, saved.id); assert.equal(updated.selectedRoomId, 'r2');
});

test('editor Cancel and back navigation preserve saved declaration and original funding file', async () => {
  const p = providerHarness(), draft = await p.validDraft(); draft.attachments.funding = await pick(p, draft.draftId, 'original.pdf'); const saved = p.render().submitApplication(draft);
  let owner; const api = () => ({ ...p.render(), chooseDocument: (id, category) => { owner = id; return p.render().chooseDocument(id, category); } });
  const s = editor(p, saved.id, { applicationApi: api }); await s.press('NSFAS');
  p.queue.push({ canceled: false, assets: [{ name: 'discarded.pdf', size: 200, mimeType: 'application/pdf' }] }); await s.press('Replace Proof of Funding');
  await s.press('Remove Proof of Funding'); await s.press('Cancel'); assert.equal(s.calls.at(-1).action, 'goBack');
  // Native screen cleanup releases only the editor owner; exercise the same registry operation here.
  p.render().releaseDraft(owner); assert.equal(p.render().getApplication(saved.id), saved); assert.equal(p.render().documentStatus(saved.id, saved.attachments.funding.id), 'attached-local');
  await assert.rejects(p.render().updateFunding(saved.id, owner, pending), /editor closed/);
});

test('funding image selection/preview, replacement and removal release only superseded funding resources on Save', async () => {
  const p = providerHarness(), saved = await savedPending(p); const initial = await pick(p, 'first-edit', 'status.png', 'image/png');
  await p.render().updateFunding(saved.id, 'first-edit', pending, initial); const s = editor(p, saved.id);
  await s.press('Preview Proof of Funding'); assert.ok(s.render().find((n) => n.props.preview)?.props.preview.uri);
  const next = await pick(p, 'replace-edit'); assert.ok(!p.disposed.includes(initial.id)); await p.render().updateFunding(saved.id, 'replace-edit', pending, next);
  assert.ok(p.disposed.includes(initial.id)); assert.equal(p.render().documentStatus(saved.id, next.id), 'attached-local');
  await p.render().updateFunding(saved.id, 'remove-edit', pending); assert.ok(p.disposed.includes(next.id));
  const updated = p.render().getApplication(saved.id); assert.equal(updated.attachments.funding, undefined); assert.equal(Object.keys(updated.attachments).length, 3);
  for (const doc of Object.values(updated.attachments)) assert.equal(p.render().documentStatus(saved.id, doc.id), 'attached-local');
});

test('cancelled, unsupported, oversized and failed replacement preserve the saved and staged files', async () => {
  const p = providerHarness(), saved = await savedPending(p); const original = await pick(p, 'initial'); await p.render().updateFunding(saved.id, 'initial', pending, original);
  const s = editor(p, saved.id);
  for (const result of [{ canceled: true }, new Error('provider failed'), { canceled: false, assets: [{ name: 'bad.exe', size: 200 }] }, { canceled: false, assets: [{ name: 'large.pdf', size: 11 * 1024 * 1024 }] }]) {
    p.queue.push(result); await s.press('Replace Proof of Funding'); assert.match(text(s.render()), /support.pdf/); assert.equal(p.render().getApplication(saved.id).attachments.funding.id, original.id);
  }
  assert.equal(p.render().documentStatus(saved.id, original.id), 'attached-local'); assert.ok(!p.disposed.includes(original.id));
});

test('expired funding references block save with recovery and removal keeps other documents readable', async () => {
  const p = providerHarness(), saved = await savedPending(p), doc = await pick(p, 'initial'); await p.render().updateFunding(saved.id, 'initial', pending, doc);
  p.resources.at(-1).readable = false;
  await assert.rejects(p.render().updateFunding(saved.id, 'edit', { ...pending, nsfasStatus: 'confirmed' }, doc), /unavailable/);
  assert.equal(p.render().getApplication(saved.id).funding.nsfasStatus, 'pending');
  const s = editor(p, saved.id); assert.match(text(s.render()), /File unavailable/); assert.equal(find(s.render(), 'Preview Proof of Funding'), undefined);
  await s.press('Remove Proof of Funding'); await s.press('Save funding update'); assert.equal(p.render().getApplication(saved.id).attachments.funding, undefined);
  assert.equal(p.render().documentStatus(saved.id, saved.attachments.identity.id), 'attached-local');
});

test('unknown application, invalid NSFAS state and borrowed or forged metadata cannot modify applications', async () => {
  const p = providerHarness(), first = await savedPending(p), second = await savedPending(p); const doc = await pick(p, 'owner');
  await assert.rejects(p.render().updateFunding('missing', 'owner', pending, doc), /no longer available/);
  await assert.rejects(p.render().updateFunding(first.id, 'owner', { ...pending, nsfasStatus: null }, doc), /Choose your current NSFAS/);
  await p.render().updateFunding(second.id, 'owner', pending, doc);
  await assert.rejects(p.render().updateFunding(first.id, second.id, pending, doc), /Reopen funding/);
  await assert.rejects(p.render().updateFunding(first.id, 'different', pending, doc), /unavailable/);
  await assert.rejects(p.render().updateFunding(second.id, 'different', pending, { ...doc, name: 'forged.pdf' }), /unavailable/);
  assert.equal(p.render().documentStatus(second.id, doc.id), 'attached-local');
  assert.equal(p.render().getApplication(first.id), first); assert.equal(p.render().getApplication(second.id).attachments.funding.name, 'support.pdf');
  assert.equal(editor(p, 'missing').render().find((n) => n.type === 'ErrorState').props.title, 'Application unavailable'); assert.equal(find(editor(p, 'missing').render(), 'Save funding update'), undefined);
});

test('logout during asynchronous funding validation cannot revive an application; pending picker resources are also discarded', async () => {
  const p = providerHarness(), saved = await savedPending(p), doc = await pick(p, 'editor');
  const staleCallback = p.render().updateFunding;
  let finish; p.resources.at(-1).available = () => new Promise((resolve) => { finish = resolve; });
  const save = p.render().updateFunding(saved.id, 'editor', pending, doc); p.render().clearApplications(); finish(true);
  await assert.rejects(save); assert.equal(p.render().applications.length, 0); assert.ok(p.disposed.includes(doc.id));
  await assert.rejects(staleCallback(saved.id, 'late-editor', pending), /no longer available/);
  assert.equal(p.render().documentStatus(saved.id, doc.id), 'unavailable');
});

test('closing an editor during file validation preserves saved funding and releases the staged resource', async () => {
  const p = providerHarness(), saved = await savedPending(p), doc = await pick(p, 'editor');
  let finish; p.resources.at(-1).available = () => new Promise((resolve) => { finish = resolve; });
  const save = p.render().updateFunding(saved.id, 'editor', pending, doc); p.render().releaseDraft('editor'); finish(true);
  await assert.rejects(save); assert.equal(p.render().getApplication(saved.id), saved); assert.ok(p.disposed.includes(doc.id));
});

test('a concurrent funding save invalidates an older asynchronous save without overwriting the newer declaration', async () => {
  const p = providerHarness(), saved = await savedPending(p), doc = await pick(p, 'older');
  let finish; p.resources.at(-1).available = () => new Promise((resolve) => { finish = resolve; });
  const oldSave = p.render().updateFunding(saved.id, 'older', { ...pending, nsfasStatus: 'confirmed' }, doc);
  await p.render().updateFunding(saved.id, 'newer', { ...pending, nsfasStatus: 'unsuccessful' }); finish(true);
  await assert.rejects(oldSave, /Application changed/); assert.equal(p.render().getApplication(saved.id).funding.nsfasStatus, 'unsuccessful');
  p.render().releaseDraft('older'); assert.ok(p.disposed.includes(doc.id)); assert.equal(p.render().applications.length, 1);
});

test('manager-local pending NSFAS fixture supports notes and review without changing student, room or accommodation state', () => {
  const s = harness('src/screens/ManagerScreen.tsx'); find(s.render(), 'Applications').props.onPress();
  const open = () => expand(s.render()).find((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel?.startsWith('Naledi Mokoena, Application: In review, Funding: ')).props.onPress();
  const detail = () => s.render().find((n) => typeof n.type === 'function' && n.type.name === 'ApplicationDetail');
  open(); let d = detail(); assert.equal(d.props.application.funding.nsfasStatus, 'pending');
  assert.match(text(expand(expand(elements(d)))), /Awaiting confirmation/); assert.match(text(expand(expand(elements(d)))), /Optional · Not attached/);
  d.props.onFundingStatus('Needs information'); detail().props.onNote('Confirmation outstanding.'); detail().props.onSave(); detail().props.onBack(); open(); d = detail();
  assert.equal(d.props.reviewStatus, 'Needs information'); assert.equal(d.props.note, 'Confirmation outstanding.'); assert.equal(d.props.application.status, 'In review');
  const state = manager.createManagerState(), snapshot = JSON.stringify(state);
  const next = manager.managerReducer(state, { type: 'set-funding-review', applicationId: 'ma-2', status: 'Reviewed locally' });
  assert.equal(next.applications, state.applications); assert.equal(next.properties, state.properties); assert.equal(next.tenants, state.tenants); assert.equal(JSON.stringify(state), snapshot);
  assert.doesNotMatch(JSON.stringify(next.applications), /"uri"|"attachments"|"notifications"|verifiedAt/);
  assert.doesNotMatch(JSON.stringify(next), /"attachments"|"notifications"|verifiedAt|campusstay-document-staging|file:\/\//);
  assert.ok(next.properties.every((property) => property.photos.every((photo) => photo.kind === 'seed' && photo.propertyId === property.id && property.images.includes(photo.uri))));
  for (const file of ['src/manager.ts', 'src/screens/ManagerScreen.tsx']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /ApplicationContext|AttachmentSession|documentAdapter|fetch\(/);
});

for (const [width, fontScale] of [[320, 2], [411, 1.3], [480, 1], [800, 2]]) test(`funding editor at ${width}dp/${fontScale} text retains accessible status, evidence and save controls`, async () => {
  const p = providerHarness(), saved = await savedPending(p), s = editor(p, saved.id, { width, fontScale });
  assert.equal(find(s.render(), 'Awaiting NSFAS confirmation').props.accessibilityState.selected, true);
  for (const label of ['NSFAS has confirmed my funding', 'NSFAS application unsuccessful', 'Choose file for Proof of Funding', 'Save funding update', 'Cancel']) assert.ok(find(s.render(), label));
  await s.press('NSFAS application unsuccessful'); assert.equal(find(s.render(), 'NSFAS application unsuccessful').props.accessibilityState.selected, true);
  assert.equal(find(s.render(), 'Save funding update').props.disabled, false);
});
