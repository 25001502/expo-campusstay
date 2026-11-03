const assert = require('node:assert/strict');
const test = require('node:test');
const { harness, load, elements, data } = require('./profile-harness.cjs');
const { providerHarness } = require('./application-provider-harness.cjs');
const { getDocumentSummary, DOCUMENT_CATEGORIES } = load('src/documents.ts');
const property = data.properties[0];
const textOf = (v) => Array.isArray(v) ? v.map(textOf).join('') : v && typeof v === 'object' ? textOf(v.props?.children) : v == null ? '' : String(v);
const text = (nodes) => nodes.filter((n) => n.type === 'Text').map(textOf).join(' ');
const find = (nodes, label) => nodes.find((n) => (n.props.accessibilityLabel ?? n.props.children) === label);
const status = (p, id, options = {}) => harness('src/screens/AppStatusScreen.tsx', { applicationApi: () => p.render(), params: { property, applicationId: id }, ...options });
const documents = (p, options = {}) => harness('src/screens/MyDocumentsScreen.tsx', { applicationApi: () => p.render(), ...options });
async function saved(p, funding = { source: 'self-funded', paymentDiscussionRequested: false }, room = 'r2') {
  const draft = await p.validDraft(); draft.funding = funding; draft.selectedRoomId = room;
  return p.render().submitApplication(draft);
}
async function image(p, application, category, name = 'same-sample.png') {
  // Stage through the real registry and provider submission, never invent a usable reference.
  p.queue.push({ canceled: false, assets: [{ name, mimeType: 'image/png', size: 6502 }] });
  return (await p.render().chooseDocument(application, category, 'library')).document;
}

test('compact document rows preserve categories, actual full names, sizes, requirement and local status', async () => {
  const p = providerHarness(), draft = await p.validDraft();
  const long = 'synthetic-registration-with-a-very-long-and-distinguishable-name-' + 'x'.repeat(100) + '.png';
  for (const category of ['student-id', 'registration', 'identity']) draft.attachments[category] = await image(p, draft.draftId, category, category === 'registration' ? long : 'same-sample.png');
  const app = p.render().submitApplication(draft), s = documents(p), nodes = s.render();
  for (const category of DOCUMENT_CATEGORIES) assert.match(text(nodes), new RegExp(category.label.replace('/', '\\/')));
  assert.match(text(nodes), /PNG · 7 KB · Attached locally/); assert.match(text(nodes), /Proof of Funding · Optional.*Not attached/);
  const name = nodes.find((n) => n.type === 'Text' && n.props.children === long);
  assert.ok(name); assert.equal(name.props.numberOfLines, undefined); assert.equal(name.props.allowFontScaling, undefined);
  const previews = nodes.filter((n) => n.type === 'Pressable'); assert.equal(previews.length, 3);
  assert.ok(previews.every((n) => n.props.accessibilityLabel.includes(app.id)));
  assert.ok(previews.find((n) => n.props.accessibilityLabel.includes(long)));
  const rowStyle = previews[0].props.style({ pressed: false })[0]; assert.ok(rowStyle.minHeight >= 48);
  previews[0].props.onPress(); assert.equal(s.render().find((n) => n.type === 'LocalDocumentPreview').props.preview.name, 'same-sample.png');
});

test('PDF metadata remains visible without a broken preview action', async () => {
  const p = providerHarness(); await saved(p); const nodes = documents(p).render();
  assert.match(text(nodes), /student-id.pdf/); assert.match(text(nodes), /PDF · 200 bytes · Attached locally/);
  assert.equal(nodes.filter((n) => n.type === 'Pressable').length, 0);
  assert.equal((text(nodes).match(/PDF preview unavailable/g) ?? []).length, 3);
});

test('selected application is identified first; equal filenames never merge applications or categories', async () => {
  const p = providerHarness(), one = await saved(p), two = await saved(p);
  const nodes = documents(p, { params: { applicationId: one.id } }).render();
  const refs = nodes.filter((n) => n.type === 'Text' && textOf(n).startsWith('Application '));
  assert.equal(textOf(refs[0]), `Application ${one.id}`); assert.equal(textOf(refs[1]), `Application ${two.id}`);
  assert.equal(nodes.filter((n) => n.type === 'Text' && n.props.children === 'student-id.pdf').length, 2);
  const s = documents(p, { params: { applicationId: one.id } });
  const actions = s.render().filter((n) => n.type === 'Btn' && n.props.children === 'View application');
  actions.forEach((action) => action.props.onPress());
  assert.deepEqual(s.calls.map((c) => c.args[1].applicationId), [one.id, two.id]);
  assert.equal(p.render().applications.length, 2);
});

test('different properties retain their associations and missing target preserves other records', async () => {
  const p = providerHarness(), one = await saved(p);
  const other = { ...one, id: 'other-application', propertyId: data.properties[1].id, selectedRoomId: data.properties[1].rooms[0].id };
  const s = harness('src/screens/MyDocumentsScreen.tsx', { applications: [one, other], params: { applicationId: 'expired' } });
  const nodes = s.render(); assert.match(text(nodes), /requested application is unavailable/);
  assert.deepEqual(nodes.filter((n) => n.type === 'ProfileSection').slice(1).map((n) => n.props.title), [property.name, data.properties[1].name]);
});

test('only owned, valid, available files count; categories, expired and malformed metadata cannot inflate counts', () => {
  const attachments = Object.fromEntries(DOCUMENT_CATEGORIES.map((c) => [c.id, { id: c.id, category: c.id, name: 'sample.pdf', mimeType: 'application/pdf', size: 200, state: 'attached-local' }]));
  const check = (owner, id) => owner === 'one' && id !== 'registration' ? 'attached-local' : 'unavailable';
  assert.deepEqual(JSON.parse(JSON.stringify(getDocumentSummary('one', attachments, check))), { required: 2, optional: 1, missingRequired: 1, unavailable: 1 });
  assert.equal(getDocumentSummary('two', attachments, check).required, 0);
  attachments.identity.category = 'funding'; attachments['student-id'].size = 0;
  assert.equal(getDocumentSummary('one', attachments, check).required, 0);
  assert.equal(getDocumentSummary('one', undefined, check).missingRequired, 3);
});

test('unavailable references retain metadata, lose Preview and never count as attached', async () => {
  const p = providerHarness(), app = await saved(p); p.resources[0].readable = false;
  await p.render().refreshDocuments(app.id, app.attachments);
  const nodes = documents(p).render(); assert.match(text(nodes), /student-id.pdf/); assert.match(text(nodes), /Temporary reference unavailable/);
  assert.match(text(status(p, app.id).render()), /2 of 3 required attachments present.*1 required attachment missing or unavailable/);
});

test('legacy selections show no-file status and required/optional distinction', async () => {
  const p = providerHarness(), app = await saved(p);
  const historical = { ...app, attachments: {}, selectedDocuments: ['student-id', 'funding'] };
  const s = harness('src/screens/MyDocumentsScreen.tsx', { applications: [historical] });
  const visible = text(s.render()); assert.match(visible, /Student ID · Required.*Selection recorded · No file attached/);
  assert.match(visible, /Proof of Registration · Required.*Not attached/); assert.match(visible, /Proof of Funding · Optional.*Selection recorded/);
  assert.doesNotMatch(visible, /Attached locally/);
});

for (const [funding, declaration] of [
  [{ source: 'self-funded', paymentDiscussionRequested: true }, 'Student-provided · Not verified'],
  [{ source: 'nsfas', nsfasStatus: 'pending', paymentDiscussionRequested: false }, 'Awaiting confirmation'],
  [{ source: 'nsfas', nsfasStatus: 'confirmed', paymentDiscussionRequested: false }, 'Student reports confirmed'],
  [{ source: 'nsfas', nsfasStatus: 'unsuccessful', paymentDiscussionRequested: false }, 'Student reports unsuccessful'],
  [{ source: 'sponsor', paymentDiscussionRequested: false }, 'Student-provided · Not verified'],
  [{ source: 'parent-guardian', paymentDiscussionRequested: false }, 'Student-provided · Not verified'],
]) test(`funding summary separates source, declaration and evidence: ${funding.source}/${funding.nsfasStatus ?? 'declaration'}`, async () => {
  const p = providerHarness(), app = await saved(p, funding), s = status(p, app.id), nodes = s.render(), visible = text(nodes);
  assert.ok(visible.includes(declaration)); assert.equal((visible.match(/Not verified/g) ?? []).length, 1);
  assert.equal((visible.match(/Funding status|Funding declaration/g) ?? []).length, 0);
  assert.match(visible, /Supporting document Not attached · Optional/);
  assert.match(visible, funding.paymentDiscussionRequested ? /Requested · Recorded here only/ : /Not requested/);
  assert.match(visible, /3 of 3 required attachments present 0 optional attachments present/);
  assert.doesNotMatch(visible, /student-id.pdf|Confirmed Booking|Approved by Manager|Room Reserved|Payment Verified/);
  assert.match(visible, /No accommodation provider received it/);
  find(nodes, 'Update Funding Information').props.onPress(); assert.equal(s.calls.at(-1).args[1].applicationId, app.id);
  find(nodes, 'View My Documents').props.onPress(); assert.equal(s.calls.at(-1).args[0], 'MyDocuments'); assert.equal(s.calls.at(-1).args[1].applicationId, app.id);
});

test('funding evidence changes by exact ID without changing room, price or unrelated attachments', async () => {
  const p = providerHarness(), one = await saved(p), two = await saved(p), before = JSON.stringify(two);
  const staged = await image(p, 'funding-editor', 'funding', 'funding.png');
  await p.render().updateFunding(one.id, 'funding-editor', { source: 'nsfas', nsfasStatus: 'confirmed', paymentDiscussionRequested: true }, staged);
  const updated = p.render().getApplication(one.id); assert.equal(p.render().applications.length, 2); assert.equal(JSON.stringify(p.render().getApplication(two.id)), before);
  assert.equal(updated.selectedRoomId, one.selectedRoomId); assert.equal(updated.propertyId, one.propertyId);
  assert.equal(JSON.stringify(updated.personal), JSON.stringify(one.personal)); assert.equal(JSON.stringify(updated.emergency), JSON.stringify(one.emergency));
  for (const c of ['student-id', 'registration', 'identity']) assert.equal(updated.attachments[c], one.attachments[c]);
  const visible = text(status(p, one.id).render()); assert.match(visible, /Shared Room.*2[\s,]?200/); assert.match(visible, /Supporting document Attached locally/); assert.match(visible, /1 optional attachment present/);
  assert.doesNotMatch(JSON.stringify(updated), /file:\/\/|base64|"uri"|approved|verifiedAt/);
});

test('logout clears documents and scoped status without reviving any application', async () => {
  const p = providerHarness(), app = await saved(p), s = documents(p);
  const profile = s.renderScreen('src/screens/ProfileScreen.tsx'); find(profile, 'Log Out').props.onPress();
  await s.alerts.at(-1)[2].find((a) => a.text === 'Log Out').onPress();
  assert.equal(p.render().applications.length, 0); assert.ok(s.render().some((n) => n.type === 'EmptyState'));
  assert.equal(status(p, app.id).render().find((n) => n.type === 'ErrorState').props.title, 'Application unavailable');
  assert.equal(p.render().documentStatus(app.id, app.attachments['student-id'].id), 'unavailable');
});

for (const width of [320, 411, 480, 800]) for (const fontScale of [1, 1.3, 2]) test(`document and status layout adapts at ${width}dp / ${fontScale}`, async () => {
  const p = providerHarness(), draft = await p.validDraft(); draft.attachments.identity = await image(p, draft.draftId, 'identity');
  const app = p.render().submitApplication(draft), s = documents(p, { width, fontScale }), nodes = s.render();
  const action = nodes.find((n) => n.type === 'Pressable'); const row = nodes.find((n) => n.type === 'View' && elements(n).includes(action));
  assert.equal(row.props.style[1]?.flexDirection, width < 360 || fontScale > 1.3 ? 'column' : undefined);
  const result = status(p, app.id, { width, fontScale }).render();
  const card = result.find((n) => n.type === 'View' && Array.isArray(n.props.style) && n.props.style[0]?.borderRadius && n.props.style[0]?.flexDirection === 'row');
  assert.equal(card.props.style[1]?.flexDirection, width < 360 || fontScale > 1.3 ? 'column' : undefined);
});

test('image preview uses aspect fit, safe areas and scrollable full filename with independent close', () => {
  const name = 'long-'.repeat(40) + '.png'; let closed = 0;
  const s = harness('src/components/LocalDocumentPreview.tsx', { exportName: 'LocalDocumentPreview', props: { preview: { name, uri: 'file://synthetic-private' }, onClose: () => closed++ }, insets: { left: 44, right: 44, top: 30, bottom: 20 } });
  let nodes = s.render(); assert.equal(nodes.find((n) => n.type === 'Image').props.resizeMode, 'contain');
  const modal = nodes.find((n) => n.type === 'Modal');
  assert.equal(modal.props.statusBarTranslucent, true); assert.equal(modal.props.navigationBarTranslucent, true);
  assert.equal(nodes.find((n) => n.type === 'ScrollView').props.style.maxHeight, '25%');
  assert.ok(nodes.some((n) => n.type === 'Text' && n.props.children === name));
  const page = nodes.find((n) => n.type === 'View'); assert.ok(page.props.style[1].paddingLeft > 44);
  find(nodes, 'Close preview').props.onPress(); assert.equal(closed, 1);
  modal.props.onRequestClose(); assert.equal(closed, 2);
  nodes.find((n) => n.type === 'Image').props.onError(); nodes = s.render();
  assert.match(text(nodes), /could not be displayed/); assert.ok(find(nodes, 'Close preview'));
});
