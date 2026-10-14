const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');

function loadTypeScriptModule(file, modules = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => modules[name] ?? (name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), name) + '.ts') ? loadTypeScriptModule(path.resolve(path.dirname(file), name) + '.ts', modules) : require(name)),
    Date,
    Object,
    Number,
    String,
  }, { filename: file });
  return module.exports;
}

const data = loadTypeScriptModule(path.join(root, 'src/data.ts'));
const application = loadTypeScriptModule(path.join(root, 'src/application.ts'), { './data': data });
const property = data.properties[0];

function validDraft() {
  const draft = application.createApplicationDraft(property, 'r2');
  draft.personal = {
    fullName: 'Alex Student',
    studentNumber: '2021012345',
    universityId: 'univen',
    phone: '+27 71 234 5678',
    email: 'alex@example.com',
  };
  draft.selectedDocuments = ['student-id', 'registration', 'identity'];
  draft.emergency = { fullName: 'Taylor Student', relationship: 'Parent', phone: '+27 82 555 0101' };
  return draft;
}

test('valid room navigation preselects the requested room', () => {
  assert.equal(application.createApplicationDraft(property, 'r2').selectedRoomId, 'r2');
});

test('invalid room navigation is rejected without substituting another room', () => {
  assert.equal(application.createApplicationDraft(property, 'missing').selectedRoomId, null);
});

test('unavailable room navigation is rejected', () => {
  const unavailable = { ...property, rooms: property.rooms.map((room) => room.id === 'r1' ? { ...room, available: 0 } : room) };
  assert.equal(application.createApplicationDraft(unavailable, 'r1').selectedRoomId, null);
});

test('changing rooms updates the review room and price', () => {
  const draft = validDraft();
  draft.selectedRoomId = 'r1';
  const review = application.buildApplicationReview(draft, property);
  assert.equal(review.roomType, 'Single Room');
  assert.equal(review.roomPrice, 3500);
});

test('personal information requires every existing UI field', () => {
  const errors = application.validateApplicationStep(1, application.createApplicationDraft(property, 'r1'), property);
  for (const key of ['fullName', 'studentNumber', 'phone', 'email']) assert.ok(errors[key]);
});

test('email validation rejects malformed input and accepts a normal address', () => {
  const draft = validDraft();
  draft.personal.email = 'invalid';
  assert.ok(application.validateApplicationStep(1, draft, property).email);
  draft.personal.email = 'student+housing@example.co.za';
  assert.equal(application.validateApplicationStep(1, draft, property).email, undefined);
});

test('phone validation accepts flexible international formatting', () => {
  assert.equal(application.isValidPhone('+27 (71) 234-5678'), true);
  assert.equal(application.isValidPhone('12ab'), false);
  assert.equal(application.isValidPhone('123'), false);
});

test('required document categories block progression when missing', () => {
  const draft = validDraft();
  draft.selectedDocuments = ['student-id'];
  assert.ok(application.validateApplicationStep(2, draft, property).documents);
});

test('optional proof of funding does not block document progression', () => {
  assert.deepEqual({ ...application.validateApplicationStep(2, validDraft(), property) }, {});
});

test('emergency contact requires name, relationship, and valid phone', () => {
  const draft = validDraft();
  draft.emergency = { fullName: '', relationship: '', phone: 'abc' };
  const errors = application.validateApplicationStep(3, draft, property);
  assert.ok(errors['emergency.fullName']);
  assert.ok(errors['emergency.relationship']);
  assert.ok(errors['emergency.phone']);
});

test('step validation blocks room progression without a selection', () => {
  const draft = application.createApplicationDraft(property);
  assert.ok(application.validateApplicationStep(0, draft, property).selectedRoomId);
});

test('draft values survive step changes', () => {
  const draft = validDraft();
  draft.currentStep = 3;
  draft.currentStep = 1;
  assert.equal(draft.personal.fullName, 'Alex Student');
  assert.equal(draft.selectedRoomId, 'r2');
});

test('review uses the exact personal and emergency values in the draft', () => {
  const review = application.buildApplicationReview(validDraft(), property);
  assert.equal(review.personal.email, 'alex@example.com');
  assert.equal(review.emergency.fullName, 'Taylor Student');
  assert.equal(review.roomType, 'Shared Room');
});

test('editing an earlier value is immediately reflected in review data', () => {
  const draft = validDraft();
  draft.personal.fullName = 'Edited Student';
  assert.equal(application.buildApplicationReview(draft, property).personal.fullName, 'Edited Student');
});

test('final submission validation rejects incomplete drafts', () => {
  const errors = application.validateApplication(application.createApplicationDraft(property), property);
  assert.equal(application.firstInvalidApplicationStep(errors), 0);
  assert.ok(Object.keys(errors).length > 1);
});

test('a fully valid draft passes final submission validation', () => {
  assert.deepEqual({ ...application.validateApplication(validDraft(), property) }, {});
});

test('duplicate submitted application IDs are not added twice', () => {
  const record = application.createSubmittedApplication(validDraft(), '2026-10-13T10:00:00.000Z', 1);
  const state = application.addSubmittedApplication([record], record);
  assert.equal(state.length, 1);
});

test('local application ID generation is stable for the same inputs', () => {
  const first = application.generateDemoApplicationId('2026-10-13T10:00:00.000Z', 2);
  const second = application.generateDemoApplicationId('2026-10-13T10:00:00.000Z', 2);
  assert.equal(first, second);
  assert.match(first, /^CS-LOCAL-/);
});

test('submitted application state starts empty and remains session data', () => {
  const record = application.createSubmittedApplication(validDraft(), '2026-10-13T10:00:00.000Z', 1);
  const state = application.addSubmittedApplication([], record);
  assert.equal(state.length, 1);
  assert.equal(state[0].status, 'saved-locally');
});

test('application status summary maps the correct property and room', () => {
  const record = application.createSubmittedApplication(validDraft(), '2026-10-13T10:00:00.000Z', 1);
  const summary = application.getSubmittedApplicationSummary(record, property);
  assert.equal(summary.propertyName, property.name);
  assert.equal(summary.roomType, 'Shared Room');
  assert.equal(summary.statusLabel, 'Saved locally');
});

test('missing or mismatched application status data is rejected', () => {
  const record = application.createSubmittedApplication(validDraft(), '2026-10-13T10:00:00.000Z', 1);
  assert.equal(application.getSubmittedApplicationSummary(record, data.properties[1]), undefined);
  assert.equal(application.getSubmittedApplicationSummary({ ...record, selectedRoomId: 'missing' }, property), undefined);
});

test('a submitted application is explicitly not a booking', () => {
  const record = application.createSubmittedApplication(validDraft(), '2026-10-13T10:00:00.000Z', 1);
  assert.equal(application.isSubmittedApplicationABooking(record), false);
  assert.equal(application.getSubmittedApplicationSummary(record, property).isBooking, false);
});

test('normalization trims user-entered values before submission', () => {
  const draft = validDraft();
  draft.personal.fullName = '  Alex Student  ';
  draft.emergency.phone = '  +27 82 555 0101  ';
  const normalized = application.normalizeApplicationDraft(draft);
  assert.equal(normalized.personal.fullName, 'Alex Student');
  assert.equal(normalized.emergency.phone, '+27 82 555 0101');
});

test('stale drafts cannot use a room from another property', () => {
  const draft = validDraft();
  draft.propertyId = data.properties[1].id;
  assert.equal(application.buildApplicationReview(draft, property), undefined);
});
