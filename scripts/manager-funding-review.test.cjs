const assert = require('node:assert/strict');
const test = require('node:test');
const { load, harness, elements } = require('./profile-harness.cjs');
const file = 'src/screens/ManagerScreen.tsx';
const clone = (value) => JSON.parse(JSON.stringify(value));
const component = (screen, name) => screen.render().find((node) => typeof node.type === 'function' && node.type.name === name);
const details = (screen) => component(screen, 'ApplicationDetail');
const page = (screen) => component(screen, 'ApplicationsPage');
function applications(screen) {
  screen.render().find((node) => node.props.accessibilityLabel === 'Applications').props.onPress();
  return page(screen).props.applications;
}
function open(screen, index = 0) {
  const records = applications(screen);
  page(screen).props.onOpen(records[index]);
  return records[index];
}
function choose(screen, status) {
  const detail = details(screen);
  const radio = elements(detail.type(detail.props)).find((node) => node.props.accessibilityLabel === `Funding review: ${status}`);
  radio.props.onPress();
  const updated = details(screen);
  assert.equal(updated.props.reviewStatus, status);
  const selected = elements(updated.type(updated.props)).filter((node) => node.props.accessibilityRole === 'radio' && node.props.accessibilityState.selected);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].props.accessibilityLabel, `Funding review: ${status}`);
}

test('Needs information saves immediately and survives back-to-list navigation', () => {
  const screen = harness(file);
  const record = open(screen);
  choose(screen, 'Needs information');
  details(screen).props.onBack();
  assert.ok(page(screen));
  page(screen).props.onOpen(record);
  assert.equal(details(screen).props.reviewStatus, 'Needs information');
  assert.equal(details(screen).props.application.status, record.status);
  assert.equal(screen.alerts.length, 0, 'Saving funding status does not require saving a note');
});

test('funding status survives leaving and remounting the manager portal in the same session', () => {
  const managerModule = load('src/manager.ts');
  const first = harness(file, { managerModule });
  open(first, 1);
  choose(first, 'Needs information');
  first.render().find((node) => node.props.label === 'Return to student Home').props.onPress();
  assert.equal(first.calls.at(-1).action, 'replace');
  const reopened = harness(file, { managerModule });
  open(reopened, 1);
  assert.equal(details(reopened).props.reviewStatus, 'Needs information');
});

test('applications retain independent statuses through application and manager-tab switches', () => {
  const screen = harness(file);
  const first = open(screen);
  choose(screen, 'Needs information');
  details(screen).props.onBack();
  const second = page(screen).props.applications[1];
  page(screen).props.onOpen(second);
  assert.equal(details(screen).props.reviewStatus, 'Not reviewed');
  choose(screen, 'Reviewed locally');
  screen.render().find((node) => node.props.accessibilityLabel === 'Dashboard').props.onPress();
  applications(screen);
  page(screen).props.onOpen(first);
  assert.equal(details(screen).props.reviewStatus, 'Needs information');
  choose(screen, 'Not reviewed');
  details(screen).props.onBack();
  page(screen).props.onOpen(second);
  assert.equal(details(screen).props.reviewStatus, 'Reviewed locally');
  details(screen).props.onBack();
  page(screen).props.onOpen(first);
  assert.equal(details(screen).props.reviewStatus, 'Not reviewed');
});

test('saved internal notes and funding statuses remain independent across portal remounts', () => {
  const managerModule = load('src/manager.ts');
  const first = harness(file, { managerModule });
  const record = open(first);
  details(first).props.onNote('  Ask for the funding letter  ');
  details(first).props.onSave();
  choose(first, 'Reviewed locally');
  details(first).props.onBack();
  page(first).props.onOpen(page(first).props.applications[1]);
  details(first).props.onNote('Second applicant note');
  details(first).props.onSave();
  choose(first, 'Needs information');
  const reopened = harness(file, { managerModule });
  open(reopened);
  assert.equal(details(reopened).props.note, 'Ask for the funding letter');
  assert.equal(details(reopened).props.savedNote, 'Ask for the funding letter');
  assert.equal(details(reopened).props.reviewStatus, 'Reviewed locally');
  assert.equal(details(reopened).props.application.status, record.status);
  choose(reopened, 'Not reviewed');
  assert.equal(details(reopened).props.note, 'Ask for the funding letter');
  details(reopened).props.onNote('');
  details(reopened).props.onSave();
  details(reopened).props.onBack();
  page(reopened).props.onOpen(page(reopened).props.applications[1]);
  assert.equal(details(reopened).props.note, 'Second applicant note');
  assert.equal(details(reopened).props.reviewStatus, 'Needs information');
  const third = harness(file, { managerModule });
  open(third);
  assert.equal(details(third).props.note, '');
  assert.equal(details(third).props.reviewStatus, 'Not reviewed');
});

test('discarding an unsaved note leaves the immediately saved funding status intact', () => {
  const screen = harness(file);
  const record = open(screen);
  details(screen).props.onNote('Unsaved text');
  choose(screen, 'Needs information');
  details(screen).props.onBack();
  assert.equal(screen.alerts.at(-1)[0], 'Discard unsaved changes?');
  screen.alerts.at(-1)[2].find((button) => button.text === 'Discard').onPress();
  page(screen).props.onOpen(record);
  assert.equal(details(screen).props.note, '');
  assert.equal(details(screen).props.reviewStatus, 'Needs information');
});

test('a new JavaScript app session starts with no retained funding reviews or notes', () => {
  const first = harness(file, { managerModule: load('src/manager.ts') });
  open(first);
  choose(first, 'Reviewed locally');
  details(first).props.onNote('Session note');
  details(first).props.onSave();
  const restarted = harness(file, { managerModule: load('src/manager.ts') });
  open(restarted);
  assert.equal(details(restarted).props.reviewStatus, 'Not reviewed');
  assert.equal(details(restarted).props.note, '');
});

test('review changes do not mutate fixtures, funding declarations, applications or properties', () => {
  const manager = load('src/manager.ts');
  const state = manager.createManagerState(), before = clone(state);
  let next = manager.managerReducer(state, { type: 'set-funding-review', applicationId: 'ma-2', status: 'Needs information' });
  next = manager.managerReducer(next, { type: 'save-review-note', applicationId: 'ma-2', note: 'Follow up' });
  assert.equal(next.properties, state.properties);
  assert.equal(next.applications, state.applications);
  assert.equal(next.tenants, state.tenants);
  assert.deepEqual(clone(state), before);
  assert.equal(manager.managerReducer(next, { type: 'set-funding-review', applicationId: 'foreign', status: 'Reviewed locally' }), next);
  assert.equal(manager.managerReducer(next, { type: 'set-funding-review', applicationId: 'ma-2', status: 'Approved' }), next);
});

test('changing funding status does not implicitly save a draft internal note', () => {
  const managerModule = load('src/manager.ts');
  const first = harness(file, { managerModule });
  open(first);
  details(first).props.onNote('Unsaved internal text');
  choose(first, 'Needs information');
  const reopened = harness(file, { managerModule });
  open(reopened);
  assert.equal(details(reopened).props.reviewStatus, 'Needs information');
  assert.equal(details(reopened).props.note, '');
  const detail = details(reopened);
  const text = elements(detail.type(detail.props)).filter((node) => node.type === 'Text').map((node) => node.props.children).flat(Infinity).join(' ');
  assert.match(text, /Changes save immediately for this session/);
  assert.match(text, /do not verify funding, approve accommodation/);
});

test('closely spaced review events preserve other records and explicit Not reviewed resets', () => {
  const manager = load('src/manager.ts');
  const session = manager.createManagerReviewSession(), staleState = manager.createManagerState();
  session.save(staleState, { type: 'set-funding-review', applicationId: 'ma-1', status: 'Needs information' });
  session.save(staleState, { type: 'set-funding-review', applicationId: 'ma-2', status: 'Reviewed locally' });
  session.save(staleState, { type: 'save-review-note', applicationId: 'ma-1', note: '  Retained note  ' });
  session.save(staleState, { type: 'set-funding-review', applicationId: 'ma-1', status: 'Not reviewed' });
  const restored = session.restore(manager.createManagerState());
  assert.equal(restored.fundingReviews['ma-1'], undefined);
  assert.equal(restored.fundingReviews['ma-2'], 'Reviewed locally');
  assert.equal(restored.reviewNotes['ma-1'], 'Retained note');
});

test('session review snapshots are isolated, scoped to known applications and validated', () => {
  const manager = load('src/manager.ts');
  const session = manager.createManagerReviewSession(), state = manager.createManagerState();
  session.save(state, { type: 'set-funding-review', applicationId: 'ma-1', status: 'Needs information' });
  session.save(state, { type: 'save-review-note', applicationId: 'ma-1', note: 'Saved note' });
  session.save(state, { type: 'set-funding-review', applicationId: 'ma-1', status: 'Approved' });
  session.save(state, { type: 'set-funding-review', applicationId: 'foreign', status: 'Reviewed locally' });
  session.save(state, { type: 'save-review-note', applicationId: 'foreign', note: 'Wrong applicant' });
  const restored = session.restore(state);
  assert.deepEqual(clone(restored.fundingReviews), { 'ma-1': 'Needs information' });
  assert.deepEqual(clone(restored.reviewNotes), { 'ma-1': 'Saved note' });
  restored.fundingReviews['ma-1'] = 'Reviewed locally';
  restored.reviewNotes['ma-1'] = 'Changed snapshot';
  assert.equal(session.restore(state).fundingReviews['ma-1'], 'Needs information');
  assert.equal(session.restore(state).reviewNotes['ma-1'], 'Saved note');
  const restricted = session.restore({ ...state, applications: state.applications.filter((item) => item.id !== 'ma-1') });
  assert.equal(Object.keys(restricted.fundingReviews).length, 0);
  assert.equal(Object.keys(restricted.reviewNotes).length, 0);
  assert.equal(restricted.properties, state.properties);
});
