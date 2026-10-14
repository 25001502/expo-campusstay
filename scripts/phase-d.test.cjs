const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function load(file, modules = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => modules[name] ?? require(name),
    Date, Object, Number, String, Set,
  }, { filename: file });
  return module.exports;
}

const data = load(path.join(root, 'src/data.ts'));
const auth = load(path.join(root, 'src/demoAuth.ts'));
const communication = load(path.join(root, 'src/communication.ts'), { './data': data });
const validRegistration = () => ({
  fullName: 'Alex Student', email: 'alex@example.com', phone: '+27 71 234 5678',
  universityId: 'univen', studentNumber: '2026123456', password: 'password1', confirmPassword: 'password1',
});
const state = () => communication.createCommunicationState(data.conversations, data.notifications);
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('login requires email and password', () => {
  const errors = auth.validateLogin({ email: '', password: '' });
  assert.ok(errors.email); assert.ok(errors.password);
});
test('login rejects malformed email', () => assert.ok(auth.validateLogin({ email: 'invalid', password: 'secret' }).email));
test('login accepts a valid-looking form without authentication state', () => assert.equal(Object.keys(auth.validateLogin({ email: 'student@example.com', password: 'secret' })).length, 0));
test('registration requires every displayed field', () => {
  const errors = auth.validateRegistration({ fullName: '', email: '', phone: '', universityId: '', studentNumber: '', password: '', confirmPassword: '' });
  for (const key of Object.keys(validRegistration())) assert.ok(errors[key]);
});
test('registration requires at least eight password characters', () => {
  const fields = validRegistration(); fields.password = 'short'; fields.confirmPassword = 'short';
  assert.ok(auth.validateRegistration(fields).password);
});
test('registration rejects a mismatched password confirmation', () => {
  const fields = validRegistration(); fields.confirmPassword = 'different';
  assert.ok(auth.validateRegistration(fields).confirmPassword);
});
test('complete registration data validates', () => assert.equal(Object.keys(auth.validateRegistration(validRegistration())).length, 0));
test('forgot-password requires an email', () => assert.ok(auth.validateForgotPassword('')));
test('forgot-password rejects malformed email', () => assert.ok(auth.validateForgotPassword('student@')));
test('forgot-password accepts valid email and masks it for feedback', () => {
  assert.equal(auth.validateForgotPassword('alex@example.com'), undefined);
  assert.equal(auth.maskEmail('alex@example.com'), 'al**@example.com');
});
test('authentication feedback accurately describes unavailable external services', () => {
  assert.match(auth.AUTH_FEEDBACK.login, /not sent or stored/i);
  assert.match(auth.AUTH_FEEDBACK.registration, /No account was created/i);
  assert.match(auth.AUTH_FEEDBACK.forgot, /No reset email was sent/i);
});
test('manager entry remains separate from student navigation', () => {
  assert.match(auth.AUTH_FEEDBACK.manager, /separate from student navigation/i);
  assert.match(source('src/screens/LoginScreen.tsx'), /Manager workspace/);
});
test('the app launches directly into the student Home tab without credentials', () => {
  const app = source('App.tsx');
  assert.match(app, /initialRouteName="Main"/);
  assert.match(app, /name="Home"/);
  assert.match(source('src/screens/OnboardingScreen.tsx'), /navigation\.replace\('Main'\)/);
});
test('authentication and onboarding routes remain available', () => {
  const app = source('App.tsx');
  for (const route of ['Splash', 'Onboarding', 'Login', 'Register', 'Forgot']) {
    assert.match(app, new RegExp(`name="${route}"`));
  }
});
test('all student tabs remain accessible without an authentication guard', () => {
  const app = source('App.tsx');
  for (const tab of ['Home', 'Explore', 'Favorites', 'Bookings', 'Messages', 'Profile']) {
    assert.match(app, new RegExp(`name="${tab}"`));
  }
  assert.doesNotMatch(app, /isAuthenticated|authToken|userSession/);
});
test('manager exit returns to the student app instead of Login', () => {
  const manager = source('src/screens/ManagerScreen.tsx');
  assert.match(manager, /navigation\.replace\('Main'\)/);
  assert.doesNotMatch(manager, /navigation\.replace\('Login'\)/);
});
test('bookings preserve separate Applications and booking tabs', () => {
  const bookingSource = source('src/screens/BookingsScreen.tsx');
  assert.match(bookingSource, /'Applications'/);
  assert.match(bookingSource, /No booking confirmed/);
  assert.match(bookingSource, /Illustrative booking records · Not actual stays/);
});
test('application status navigation passes the exact application ID', () => assert.match(source('src/screens/BookingsScreen.tsx'), /applicationId: item\.application\.id/));
test('sending trims a local message', () => {
  const next = communication.sendLocalMessage(state(), 'c2', '  Hello locally  ', '11:00');
  assert.equal(next.conversations[0].messages.at(-1).text, 'Hello locally');
});
test('blank messages are rejected without changing state', () => {
  const current = state();
  assert.equal(communication.sendLocalMessage(current, 'c1', '   ', '11:00'), current);
});
test('local message history remains in session state', () => {
  const next = communication.sendLocalMessage(state(), 'c1', 'Keep me', '11:00');
  assert.equal(next.conversations.find((item) => item.id === 'c1').messages.at(-1).text, 'Keep me');
});
test('conversation preview updates from the latest local message', () => {
  const next = communication.sendLocalMessage(state(), 'c2', 'Latest preview', '11:02');
  assert.equal(next.conversations[0].lastMessage, 'Latest preview');
  assert.equal(next.conversations[0].time, '11:02');
});
test('sending moves a conversation to the front deterministically', () => assert.equal(communication.sendLocalMessage(state(), 'c2', 'Move', '11:03').conversations[0].id, 'c2'));
test('opening a conversation clears its unread count', () => {
  const next = communication.markConversationRead(state(), 'c1');
  assert.equal(next.conversations.find((item) => item.id === 'c1').unread, 0);
});
test('missing conversations reject sends without fallback', () => {
  const current = state();
  assert.equal(communication.sendLocalMessage(current, 'missing', 'Hello', '11:00'), current);
  assert.match(source('src/screens/ChatScreen.tsx'), /Conversation unavailable/);
});
test('local messages receive stable sequence IDs', () => {
  const first = communication.sendLocalMessage(state(), 'c1', 'One', '11:00');
  const second = communication.sendLocalMessage(first, 'c1', 'Two', '11:01');
  assert.equal(first.conversations[0].messages.at(-1).id, 'local-c1-1');
  assert.equal(second.conversations[0].messages.at(-1).id, 'local-c1-2');
});
test('chat resolves only its explicitly linked property', () => assert.equal(communication.getConversationProperty(data.conversations[0], data.properties).id, 'p1'));
test('chat does not invent a property relationship', () => assert.equal(communication.getConversationProperty({ ...data.conversations[0], propertyId: 'missing' }, data.properties), undefined));
test('opening a notification marks only that notification read', () => {
  const next = communication.markNotificationRead(state(), 'n1');
  assert.equal(next.notifications.find((item) => item.id === 'n1').read, true);
  assert.equal(next.notifications.find((item) => item.id === 'n2').read, false);
});
test('mark all as read clears every notification indicator', () => assert.equal(communication.getUnreadNotificationCount(communication.markAllNotificationsRead(state())), 0));
test('notification unread count reflects actual local state', () => assert.equal(communication.getUnreadNotificationCount(state()), 2));
test('message unread count reflects actual local state', () => assert.equal(communication.getUnreadMessageCount(state()), 2));
test('only the valid message notification maps to a conversation', () => {
  assert.equal(communication.getNotificationConversationId('n3'), 'c1');
  assert.equal(communication.getNotificationConversationId('n1'), undefined);
});
test('Profile notifications action opens Notifications', () => {
  const { harness } = require('./profile-harness.cjs');
  const result = harness('src/screens/ProfileScreen.tsx');
  result.render().find((node) => node.props.accessibilityLabel === 'Notifications, 2 unread').props.onPress();
  assert.deepEqual(result.calls, [{ action: 'navigate', args: ['Notifications'] }]);
});
test('logout requires confirmation, clears providers, and opens Login', () => {
  const profile = source('src/screens/ProfileScreen.tsx');
  assert.match(profile, /Alert\.alert/);
  assert.match(profile, /clearApplications\(\)/);
  assert.match(profile, /resetFavorites\(\)/);
  assert.match(profile, /resetCommunication\(\)/);
  assert.match(profile, /navigation\.replace\('Login'\)/);
});
test('communication reset restores samples and removes local messages', () => {
  const changed = communication.sendLocalMessage(state(), 'c1', 'Temporary', '11:00');
  const reset = communication.communicationReducer(changed, { type: 'reset', conversations: data.conversations, notifications: data.notifications });
  assert.equal(reset.messageSequence, 0);
  assert.notEqual(reset.conversations[0].lastMessage, 'Temporary');
});
test('missing notification records leave state unchanged', () => {
  const current = state();
  assert.equal(communication.markNotificationRead(current, 'missing'), current);
});
