const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { harness, load, elements, data, application, profile } = require('./profile-harness.cjs');
const funding = load('src/funding.ts');
const manager = load('src/manager.ts');
const property = data.properties[0];
const find = (nodes, label) => nodes.find((n) => (n.props.accessibilityLabel ?? n.props.label ?? n.props.children) === label);
const strings = (value) => Array.isArray(value) ? value.map(strings).join('') : value && typeof value === 'object' ? strings(value.props?.children) : value == null ? '' : String(value);
const text = (nodes) => nodes.filter((n) => n.type === 'Text').map((n) => strings(n.props.children)).join(' ');
const expand = (nodes) => nodes.flatMap((n) => typeof n.type === 'function' ? elements(n.type(n.props)) : [n]);
function student(options = {}) {
  const result = harness('src/screens/ApplyScreen.tsx', { params: { property, selectedRoomId: 'r1' }, ...options });
  result.press = async (label) => { const node = find(expand(result.render()), label); assert.ok(node, `Missing ${label}`); return node.props.onPress(); };
  result.field = (label, value) => result.render().find((n) => n.type === 'Input' && n.props.label === label).props.onChangeText(value);
  result.documents = async () => {
    await result.press('Continue →');
    for (const [label, value] of [['Full name', 'Synthetic Student'], ['Student number', '20261234'], ['Phone number', '0712345678'], ['Email address', 'synthetic@example.com']]) result.field(label, value);
    await result.press('Continue →');
  };
  result.queueFile = (name = 'synthetic.pdf') => result.pickerQueue.push({ canceled: false, assets: [{ name, mimeType: 'application/pdf', size: 200 }] });
  result.attachRequired = async () => { for (const label of ['Student ID', 'Proof of Registration', 'ID / Passport']) { result.queueFile(`${label.replace(/\W/g, '')}.pdf`); await result.press(`Choose file for ${label}`); } };
  result.review = async () => { await result.press('Continue →'); result.field('Full name', 'Synthetic Contact'); result.field('Phone number', '0711111111'); await result.press('Review Application'); };
  return result;
}
test('funding model separates four current sources from NSFAS outcomes and internal review and defaults to no preference', () => {
  assert.equal(funding.FUNDING_SOURCES.length, 4); assert.equal(funding.emptyFunding().source, null); assert.equal(funding.emptyFunding().paymentDiscussionRequested, false);
  assert.equal(funding.fundingLabel({ source: 'nsfas-pending' }), 'NSFAS — awaiting confirmation');
  assert.deepEqual(Array.from(funding.FUNDING_REVIEW_STATUSES), ['Not reviewed', 'Needs information', 'Reviewed locally']);
});
test('category flags alone cannot satisfy any required file; optional proof remains optional', () => {
  const draft = application.createApplicationDraft(property, 'r1'); draft.selectedDocuments = ['student-id', 'registration', 'identity', 'funding'];
  const errors = application.validateApplicationStep(2, draft, property);
  for (const id of ['student-id', 'registration', 'identity']) assert.ok(errors[`document.${id}`]);
  assert.equal(errors['document.funding'], undefined);
});
test('self-funded declaration, optional proof and independent discussion preference survive all Edit actions and Save', async () => {
  const s = student(); await s.documents(); await s.press('Self-funded');
  assert.match(text(s.render()), /Proof of Funding is optional; no NSFAS letter is required/);
  await s.press('I would like to discuss payment arrangements'); await s.attachRequired(); await s.review();
  let nodes = expand(s.render()); assert.match(text(nodes), /Self-funded/); assert.match(text(nodes), /Requested · Recorded here only/); assert.match(text(nodes), /StudentID.pdf/);
  assert.match(text(nodes), /Proof of Funding.*Not attached/);
  const room = text(nodes); assert.match(room, /Single Room/); assert.match(room, /3[\s,]?500/);
  for (const [section, heading, continueCount] of [['Accommodation', 'Select a Room', 4], ['Personal information', 'Personal Information', 3], ['Funding information', 'Documents', 2], ['Documents', 'Documents', 2], ['Emergency contact', 'Emergency Contact', 1]]) {
    await s.press(`Edit ${section}`); assert.match(text(s.render()), new RegExp(heading));
    for (let i = 0; i < continueCount; i++) await s.press(i === continueCount - 1 ? 'Review Application' : 'Continue →');
    assert.match(text(expand(s.render())), /StudentID.pdf/);
  }
  const save = find(s.render(), 'Save Application'); await Promise.all([save.props.onPress(), save.props.onPress()]);
  assert.equal(s.applications.length, 1); const saved = s.applications[0];
  assert.equal(saved.propertyId, 'p1'); assert.equal(saved.selectedRoomId, 'r1'); assert.equal(saved.funding.source, 'self-funded'); assert.equal(saved.funding.paymentDiscussionRequested, true); assert.equal(saved.attachments.funding, undefined);
  assert.doesNotMatch(JSON.stringify(saved), /file:\/\/|blob:|base64|"uri"|"file"|verified-funding|approved/);
  s.route.params = { property, applicationId: saved.id };
  const status = s.renderScreen('src/screens/AppStatusScreen.tsx'); assert.match(text(status), /Self-funded/); assert.match(text(status), /Requested.*Recorded here only/); assert.match(text(status), /3 of 3 required attachments present/); find(status, 'View My Documents').props.onPress(); assert.equal(s.calls.at(-1).args[1].applicationId, saved.id); assert.equal(find(status, 'Provider review'), undefined);
  const documents = s.renderScreen('src/screens/MyDocumentsScreen.tsx'); assert.match(text(documents), /StudentID.pdf/); assert.match(text(documents), /Attached locally/);
  const groups = profile.getApplicationDocumentGroups(s.applications, data.properties); assert.equal(groups[0].categories[0].attachment.name, 'StudentID.pdf');
  s.renderScreen('src/screens/ProfileScreen.tsx').find((n) => n.props.accessibilityLabel === 'Log Out').props.onPress();
  await s.alerts.at(-1)[2].find((a) => a.text === 'Log Out').onPress();
  assert.equal(s.applications.length, 0); assert.equal(s.attachmentSession.status(saved.id, saved.attachments['student-id'].id), 'unavailable');
});
test('supporting proof replacement/removal and discussion toggles never change required attachments or personal data', async () => {
  const s = student(); await s.documents(); await s.press('Self-funded'); await s.attachRequired();
  s.queueFile('support.pdf'); await s.press('Choose file for Proof of Funding');
  s.queueFile('updated-support.pdf'); await s.press('Replace Proof of Funding'); assert.match(text(s.render()), /updated-support.pdf/); assert.equal(find(s.render(), 'support.pdf'), undefined);
  await s.press('Remove Proof of Funding'); await s.press('I would like to discuss payment arrangements'); await s.press('I would like to discuss payment arrangements');
  await s.review(); assert.match(text(expand(s.render())), /Payment discussion.*Not requested/); assert.match(text(expand(s.render())), /Synthetic Student/);
  await s.press('Save Application'); assert.equal(s.applications[0].attachments.funding, undefined); assert.equal(Object.keys(s.applications[0].attachments).length, 3);
});
test('missing required file blocks Continue by category; failed or cancelled replacement preserves filename', async () => {
  const s = student(); await s.documents(); await s.attachRequired();
  await s.press('Remove Student ID'); await s.press('Continue →'); assert.match(text(s.render()), /Choose a valid file for Student ID/);
  s.queueFile('replacement.pdf'); await s.press('Choose file for Student ID');
  s.pickerQueue.push({ canceled: true }); await s.press('Replace Student ID'); assert.match(text(s.render()), /replacement.pdf/);
  s.queueFile('invalid.exe'); await s.press('Replace Student ID'); assert.match(text(s.render()), /Choose a PDF/); assert.match(text(s.render()), /replacement.pdf/);
});
test('clear funding resets discussion only and explicit profile reuse never happens automatically', async () => {
  const s = student({ profile: { fullName: 'Saved Name', email: 'saved@example.com', phone: '', universityId: '', studentNumber: '' } });
  await s.press('Continue →'); assert.equal(s.render().find((n) => n.type === 'Input' && n.props.label === 'Full name').props.value, '');
  s.field('Student number', '123'); s.field('Phone number', '0712345678'); await s.press('Use saved profile details');
  assert.equal(s.render().find((n) => n.type === 'Input' && n.props.label === 'Full name').props.value, 'Saved Name');
  await s.press('Continue →'); await s.press('Self-funded'); await s.press('I would like to discuss payment arrangements'); await s.press('Clear funding declaration');
  assert.equal(find(s.render(), 'Self-funded').props.accessibilityState.selected, false); await s.press('Self-funded'); assert.equal(find(s.render(), 'I would like to discuss payment arrangements').props.accessibilityState.checked, false);
});
test('expired references show history without false Attached or Preview actions in My Documents and Status', async () => {
  const s = student(); await s.documents(); await s.attachRequired(); await s.review(); await s.press('Save Application');
  const app = s.applications[0]; s.attachmentSession.clear();
  const docs = s.renderScreen('src/screens/MyDocumentsScreen.tsx'); assert.match(text(docs), /StudentID.pdf/); assert.match(text(docs), /File unavailable/); assert.doesNotMatch(text(docs), /Attached locally/); assert.equal(find(docs, 'Preview'), undefined);
  s.route.params = { property, applicationId: app.id }; assert.match(text(s.renderScreen('src/screens/AppStatusScreen.tsx')), /File unavailable/);
});
test('manager reducer saves and resets internal funding statuses without changing applicants, rooms, tenants or metrics', () => {
  const initial = manager.createManagerState(); const metrics = JSON.stringify(manager.getManagerMetrics(initial));
  let state = initial;
  for (const status of ['Needs information', 'Reviewed locally', 'Not reviewed']) {
    state = manager.managerReducer(state, { type: 'set-funding-review', applicationId: 'ma-1', status });
    assert.equal(state.fundingReviews['ma-1'] ?? 'Not reviewed', status); assert.equal(state.applications, initial.applications); assert.equal(state.properties, initial.properties); assert.equal(state.tenants, initial.tenants); assert.equal(JSON.stringify(manager.getManagerMetrics(state)), metrics);
  }
  state = manager.managerReducer(state, { type: 'save-review-note', applicationId: 'ma-1', note: ' Discuss arrangements ' }); assert.equal(state.reviewNotes['ma-1'], 'Discuss arrangements');
  assert.equal(manager.managerReducer(state, { type: 'set-funding-review', applicationId: 'student-app', status: 'Reviewed locally' }), state);
  assert.equal(manager.managerReducer(state, { type: 'set-funding-review', applicationId: 'ma-1', status: 'Approved' }), state);
  assert.equal(Object.keys(manager.createManagerState().fundingReviews).length, 0);
});
test('manager detail funding controls expose illustrative source, optional proof, review states and unchanged unavailable decisions', () => {
  const app = manager.createManagerState().applications[0], updates = [], notes = [], saves = [];
  const s = harness('src/screens/ManagerScreen.tsx', { exportName: 'ApplicationDetail', props: { application: app, property, note: '', reviewStatus: 'Not reviewed', onFundingStatus: (status) => updates.push(status), onNote: (value) => notes.push(value), onSave: () => saves.push(true), onBack() {} } });
  const nodes = expand(s.render()); assert.match(text(nodes), /Illustrative manager-local record/); assert.match(text(nodes), /Self-funded/); assert.match(text(nodes), /Student declaration.*Student-provided.*Not verified/); assert.match(text(nodes), /Optional.*Not attached/); assert.match(text(nodes), /Payment discussion requested.*Yes/);
  for (const status of funding.FUNDING_REVIEW_STATUSES) find(nodes, `Funding review: ${status}`).props.onPress();
  assert.deepEqual(updates, ['Not reviewed', 'Needs information', 'Reviewed locally']);
  nodes.find((n) => n.type === 'Input' && n.props.label === 'Review note').props.onChangeText('Discuss arrangements'); find(nodes, 'Save Review Note').props.onPress(); assert.deepEqual(notes, ['Discuss arrangements']); assert.equal(saves.length, 1);
  for (const label of ['Approve Unavailable', 'Reject Unavailable']) {
    const action = find(nodes, label); assert.equal(action.props.disabled, true); assert.equal(action.props.onPress, undefined);
  }
  assert.equal(s.alerts.length, 0); assert.match(text(nodes), /Local review does not change application or booking status/);
});
test('actual manager screen retains status and saved note across list navigation and resets in a new workspace', () => {
  const s = harness('src/screens/ManagerScreen.tsx');
  find(s.render(), 'Applications').props.onPress();
  const open = () => expand(s.render()).find((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel?.startsWith('Thabo Sithole, Application: New, Funding: ')).props.onPress();
  const detail = () => s.render().find((n) => typeof n.type === 'function' && n.type.name === 'ApplicationDetail');
  open(); detail().props.onFundingStatus('Needs information'); assert.equal(detail().props.reviewStatus, 'Needs information');
  detail().props.onNote('Payment discussion requested.'); detail().props.onSave(); detail().props.onFundingStatus('Reviewed locally');
  detail().props.onBack(); open(); assert.equal(detail().props.reviewStatus, 'Reviewed locally'); assert.equal(detail().props.note, 'Payment discussion requested.');
  assert.equal(detail().props.application.status, 'New');
  find(s.render(), 'Return to student Home').props.onPress(); assert.equal(s.calls.at(-1).args[0], 'Main');
  const reset = harness('src/screens/ManagerScreen.tsx'); find(reset.render(), 'Applications').props.onPress();
  find(expand(reset.render()), 'Thabo Sithole, Application: New, Funding: Not reviewed, Campus View Residence').props.onPress();
  const fresh = reset.render().find((n) => typeof n.type === 'function' && n.type.name === 'ApplicationDetail');
  assert.equal(fresh.props.reviewStatus, 'Not reviewed'); assert.equal(fresh.props.note, '');
});
test('reference expiry is rechecked on Continue and Save, including an optional attached file', async () => {
  const resources = [];
  const adapter = { pick: async () => ({ canceled: false, assets: [{ name: 'synthetic.pdf', mimeType: 'application/pdf', size: 200 }] }),
    prepare: async () => { const r = { uri: 'file://synthetic-only', size: 200, prefix: new Uint8Array([37, 80, 68, 70, 45]), readable: true, available() { return this.readable; }, dispose() {} }; resources.push(r); return r; }, releasePicked() {} };
  const s = student({ documentAdapter: adapter }); await s.documents(); await s.press('Self-funded'); await s.attachRequired();
  resources[0].readable = false; await s.press('Continue →'); assert.match(text(s.render()), /Student ID: file unavailable/);
  await s.press('Replace Student ID'); await s.press('Choose file for Proof of Funding'); await s.review();
  resources.at(-1).readable = false; await s.press('Save Application');
  assert.equal(s.applications.length, 0); assert.match(text(s.render()), /Proof of Funding: file unavailable/);
  await s.press('Remove Proof of Funding'); await s.press('Continue →'); await s.press('Review Application'); await s.press('Save Application');
  assert.equal(s.applications.length, 1); assert.equal(s.applications[0].funding.source, 'self-funded');
  const beforeReview = student({ documentAdapter: adapter }); await beforeReview.documents(); await beforeReview.attachRequired();
  await beforeReview.press('Continue →'); beforeReview.field('Full name', 'Synthetic Contact'); beforeReview.field('Phone number', '0711111111');
  resources.at(-1).readable = false; await beforeReview.press('Review Application');
  assert.match(text(beforeReview.render()), /ID \/ Passport: file unavailable/); assert.equal(find(beforeReview.render(), 'Save Application'), undefined);
});
test('student attachments never enter manager fixtures and funding review has no service or persistence bridge', () => {
  const state = manager.createManagerState(); assert.ok(state.applications.every((a) => !a.attachments));
  assert.equal(state.applications[0].funding.source, 'self-funded');
  const source = fs.readFileSync('src/screens/ManagerScreen.tsx', 'utf8') + fs.readFileSync('src/manager.ts', 'utf8');
  assert.doesNotMatch(source, /ApplicationContext|AttachmentSession|documentAdapter|fetch\(|AsyncStorage|SecureStore/);
  for (const file of ['src/attachmentSession.ts', 'src/documentAdapter.ts', 'src/documentAdapter.web.ts', 'src/state/ApplicationContext.tsx']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /fetch\(|XMLHttpRequest|AsyncStorage|SecureStore|console\./);
});
const { providerHarness } = require('./application-provider-harness.cjs');

test('real ApplicationProvider requires owned files, promotes valid references and preserves previous applications', async () => {
  const p = providerHarness(); const draft = await p.validDraft();
  const forged = { ...draft, attachments: { ...draft.attachments, identity: { ...draft.attachments.identity, id: 'unowned' } } };
  assert.throws(() => p.render().submitApplication(forged));
  const first = p.render().submitApplication(draft); p.render().releaseDraft(draft.draftId);
  assert.equal(p.render().documentStatus(first.id, first.attachments.identity.id), 'attached-local');
  assert.throws(() => p.render().submitApplication(draft));
  const second = p.render().submitApplication(await p.validDraft()); assert.notEqual(first.id, second.id); assert.equal(p.render().applications.length, 2);
  assert.equal(p.render().applications.find((a) => a.id === first.id).funding.source, 'self-funded');
  p.render().clearApplications(); assert.equal(p.render().applications.length, 0); assert.equal(p.disposed.length, 6);
});
test('real provider rejects category-only drafts and releases in-progress references on unmount', async () => {
  const p = providerHarness(), draft = application.createApplicationDraft(property, 'r1');
  draft.selectedDocuments = ['student-id', 'registration', 'identity']; assert.throws(() => p.render().submitApplication(draft));
  await p.validDraft(); p.unmount(); assert.equal(p.disposed.length, 3);
});
for (const [width, fontScale] of [[320, 2], [411, 1.3], [480, 1], [800, 2]]) test(`application layout contract ${width}dp at ${fontScale} text preserves progress, file controls and shared keyboard layout`, async () => {
  const s = student({ width, fontScale }); await s.documents();
  const nodes = s.render(); assert.ok(find(nodes, 'Application progress, step 3 of 5: Documents')); assert.equal(application.APPLICATION_STEPS.length, 5);
  assert.equal(nodes.filter((n) => n.type === 'Btn' && n.props.accessibilityLabel?.startsWith('Choose file for')).length, 4);
  assert.equal(find(nodes, 'Continue →').props.disabled, false);
  assert.ok(nodes.some((n) => n.type === 'KeyboardForm' && n.props.resetKey === 2));
});
