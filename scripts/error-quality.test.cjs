const assert = require('node:assert/strict');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const { load, harness, elements, data, application } = require('./profile-harness.cjs');
const config = require('../config/account.cjs');
const errors = load('src/errors.ts');
const { AccountController } = load('src/auth/controller.ts', { '../errors': errors }, { URL, setTimeout, clearTimeout });
const find = (s, label) => s.render().find((n) => n.props.label === label || n.props.children === label || n.props.accessibilityLabel === label);
const text = (s) => s.render().filter((n) => n.type === 'Text').map((n) => n.props.children).flat(Infinity).join(' ');
const screen = (name, options = {}) => harness(`src/screens/${name}.tsx`, options);
const verified = { id: 'synthetic', email: 'synthetic@example.com', email_confirmed_at: '2026-10-21', user_metadata: {} };
const session = { access_token: 'synthetic-token', user: verified };
function account(overrides = {}) {
  const api = {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: verified }, error: null }),
    signInWithPassword: async () => ({ data: { session }, error: null }),
    signOut: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ data: { session, redirectType: 'recovery' }, error: null }),
    updateUser: async () => ({ error: null }),
    ...overrides,
  };
  return new AccountController(api);
}

test('missing/invalid public settings produce safe copy and no usable account', async () => {
  for (const values of [[undefined, undefined], ['http://localhost', 'sb_secret_never_log']]) {
    const issue = config.readAuthConfig(...values);
    assert.match(issue.error, /temporarily unavailable/);
    assert.doesNotMatch(issue.error, /Supabase|configuration|secret|localhost/);
    const controller = new AccountController(null, 'RAW TECHNICAL SETUP');
    await controller.start(); assert.equal(await controller.signIn('x', 'x'), false);
    assert.equal(controller.getSnapshot().user, null);
    assert.equal(controller.getSnapshot().problem.retryable, false);
    assert.doesNotMatch(controller.getSnapshot().error, /RAW TECHNICAL/);
  }
});

test('production config validation rejects absent/unsafe settings without printing supplied values', () => {
  for (const env of [{}, { EXPO_PUBLIC_SUPABASE_URL: 'https://user:password@example.org', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_synthetic' }]) {
    assert.throws(() => config.assertProductionConfig(env), (error) => /Release validation failed/.test(error.message) && !/user:password|sb_secret_synthetic/.test(error.message));
  }
  // Shape validation only; these synthetic values are never used to produce an export.
  assert.doesNotThrow(() => config.assertProductionConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic' }));
});

test('release contexts require validation; explicit development exports remain blocked at runtime', () => {
  for (const [env, args] of [[{ NODE_ENV: 'production' }, []], [{ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'preview' }, []], [{}, ['expo', 'export']], [{}, ['expo', 'run:android', '--variant', 'release']], [{}, ['expo', 'run:ios', '--configuration', 'Release']]]) assert.equal(config.requiresProductionConfig(env, args), true);
  assert.equal(config.requiresProductionConfig({ NODE_ENV: 'development' }, ['expo', 'export', '--dev']), false);
  const blocked = spawnSync(process.execPath, ['-e', "require('./app.config.js')({ config: { name: 'Synthetic' } })"], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' } });
  assert.equal(blocked.status, 1); assert.match(blocked.stderr, /Release validation failed/);
  const result = spawnSync(process.execPath, ['scripts/check-production-config.cjs'], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' } });
  assert.equal(result.status, 1); assert.match(result.stderr, /missing_public_config/);
});

for (const [failure, expected] of [
  [{ code: 'invalid_credentials', message: 'private raw error' }, 'credentials'],
  [{ code: 'email_not_confirmed' }, 'unverified'],
  [{ code: 'flow_state_expired' }, 'link'],
  [{ code: 'refresh_token_not_found' }, 'expired'],
  [{ code: 'validation_failed' }, 'input'],
  [{ code: 'weak_password' }, 'password'],
  [{ status: 403 }, 'permission'],
  [{ status: 503 }, 'service'],
  [{ name: 'AuthRetryableFetchError', status: 0 }, 'network'],
  [{ name: 'AbortError' }, 'timeout'],
  [{ status: 429 }, 'rateLimit'],
  [new Error('RAW PATH file:///private/document token=synthetic'), 'unexpected'],
]) test(`error classification: ${expected} never exposes raw provider details`, () => {
  const issue = errors.classifyError(failure);
  assert.equal(issue.code, expected);
  assert.doesNotMatch(issue.message, /RAW PATH|token=|private raw|file:\/\/\//);
  if (!['network', 'timeout'].includes(expected)) assert.doesNotMatch(issue.message, /Check your connection/);
});

test('diagnostics log only fixed categories in development and nothing in production', () => {
  for (const dev of [false, true]) {
    const logs = [];
    const module = load('src/errors.ts', {}, { __DEV__: dev, console: { warn: (...args) => logs.push(args) } });
    const issue = module.classifyError({ code: 'invalid_credentials', password: 'do-not-log', access_token: 'do-not-log', message: 'do-not-log' });
    module.reportDiagnostic('account', issue.code);
    assert.equal(logs.length, dev ? 1 : 0);
    assert.doesNotMatch(JSON.stringify(logs), /do-not-log|password|access_token/);
  }
});

test('session expiration closes authenticated access; retryable restoration can recover safely', async () => {
  const controller = account({ signOut: async () => ({ error: { code: 'session_not_found' } }) });
  await controller.start(); await controller.signIn('synthetic@example.com', 'synthetic');
  assert.equal(controller.getSnapshot().phase, 'authenticated');
  await controller.signOut();
  assert.equal(controller.getSnapshot().phase, 'error'); assert.equal(controller.getSnapshot().user, null);
  assert.equal(controller.getSnapshot().problem.code, 'expired');
  let fail = true;
  const retry = account({ getSession: async () => { if (fail) throw { name: 'AuthRetryableFetchError', status: 0 }; return { data: { session }, error: null }; } });
  await retry.start(); assert.equal(retry.getSnapshot().problem.retryable, true); assert.equal(retry.getSnapshot().user, null);
  fail = false; await retry.start(); assert.equal(retry.getSnapshot().phase, 'authenticated'); assert.equal(retry.getSnapshot().error, '');
});

test('another login journey cannot race an in-progress logout', async () => {
  let finish;
  const controller = account({ signOut: () => new Promise((resolve) => { finish = resolve; }) });
  await controller.start(); await controller.signIn('synthetic@example.com', 'synthetic');
  const pending = controller.signOut();
  assert.equal(await controller.signIn('other@example.com', 'synthetic', 'manager'), false);
  assert.equal(controller.getSnapshot().intent, 'student');
  finish({ error: null }); await pending; assert.equal(controller.getSnapshot().user, null);
});

test('a changed recovery password is never resubmitted when sign-out failed', async () => {
  let updates = 0;
  const controller = account({ updateUser: async () => { updates++; return { error: null }; }, signOut: async () => { throw new Error('raw transport detail'); } });
  await controller.start('campusstay://auth/recovery?code=synthetic');
  assert.equal(await controller.updatePassword('long-password'), false);
  assert.equal(controller.getSnapshot().problem.code, 'passwordUpdated');
  assert.equal(await controller.updatePassword('long-password'), false); assert.equal(updates, 1);
  assert.equal(controller.getSnapshot().phase, 'recovery');
});

test('account form edits/focus clear stale feedback and pending forms disable inputs and links', () => {
  for (const name of ['LoginScreen', 'RegisterScreen', 'ForgotScreen']) {
    const s = screen(name); find(s, 'Email address').props.onChangeText('invalid');
    const submit = s.render().find((node) => node.type === 'Btn' && node.props.children === (name === 'LoginScreen' ? 'Sign In' : name === 'RegisterScreen' ? 'Create account' : 'Send reset link'));
    submit.props.onPress(); assert.ok(find(s, 'Email address').props.error); assert.equal(s.authCalls.length, 0);
    const auth = { busy: true, configured: true, error: '', account: { clearError() {} } };
    const pending = screen(name, { auth });
    assert.ok(pending.render().filter((n) => n.type === 'Input').every((n) => n.props.disabled));
    assert.ok(pending.render().filter((n) => n.type === 'TouchableOpacity').every((n) => n.props.disabled));
  }
  let clears = 0;
  const s = screen('LoginScreen', { auth: { error: 'Old error', configured: true, account: { clearError() { clears++; } } } });
  s.render(); s.focus(); find(s, 'Email address').props.onChangeText('new@example.com'); assert.equal(clears, 2);
});

test('reset request prevents duplicate sends and confirmation uses the requested address', async () => {
  let finish, count = 0;
  const auth = { configured: true, busy: false, error: '', account: { clearError() {}, requestReset: () => { count++; return new Promise((resolve) => { finish = resolve; }); } } };
  const s = screen('ForgotScreen', { auth }); find(s, 'Email address').props.onChangeText('first@example.com');
  const button = find(s, 'Send reset link'); button.props.onPress(); button.props.onPress(); assert.equal(count, 1);
  // A queued input event must not change the address attributed to this request.
  find(s, 'Email address').props.onChangeText('other@example.com'); finish(true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(find(s, 'Check your email')); assert.match(text(s), /Entered address:\s+fi\*\*\*@example.com/); assert.doesNotMatch(text(s), /Entered address:\s+ot\*\*\*@example.com/);
});

test('a failed resend removes the previous success notice', async () => {
  let ok = true;
  const auth = { configured: true, busy: false, error: '', email: 'synthetic@example.com', account: { resend: async () => ok, backToSignIn() {} } };
  const s = screen('AccountScreens', { exportName: 'VerificationScreen', auth });
  find(s, 'Resend confirmation email').props.onPress(); await new Promise((resolve) => setImmediate(resolve)); assert.match(text(s), /Another confirmation/);
  ok = false; find(s, 'Resend confirmation email').props.onPress(); await new Promise((resolve) => setImmediate(resolve)); assert.doesNotMatch(text(s), /Another confirmation/);
});

test('recovery validation is next to the correct field and clears on editing', () => {
  const s = screen('AccountScreens', { exportName: 'PasswordResetScreen' });
  find(s, 'New password').props.onChangeText('short'); find(s, 'Confirm new password').props.onChangeText('different');
  find(s, 'Save password').props.onPress(); assert.match(find(s, 'New password').props.error, /8 characters/); assert.match(find(s, 'Confirm new password').props.error, /do not match/);
  find(s, 'New password').props.onChangeText('long-password'); assert.equal(find(s, 'New password').props.error, undefined); assert.equal(s.authCalls.length, 0);
});

test('nonretryable session errors offer sign-out without a misleading retry-connection action', () => {
  const s = screen('AccountScreens', { exportName: 'AccountStatusScreen', auth: { phase: 'error', problem: errors.problem('expired'), error: errors.problem('expired').message, account: { backToSignIn() {} } } });
  assert.equal(find(s, 'Try again'), undefined); assert.ok(find(s, 'Sign out on this device'));
});

test('duplicate logout confirmations trigger one request and no false failure alert', async () => {
  let finish, requests = 0;
  const auth = { busy: false, user: null, account: { signOut: () => { requests++; return new Promise((resolve) => { finish = resolve; }); } } };
  const s = screen('ProfileScreen', { auth }); find(s, 'Log Out').props.onPress();
  const action = s.alerts[0][2][1].onPress;
  const pending = action(); await action(); assert.equal(requests, 1); assert.equal(s.alerts.length, 1);
  finish(true); await pending; assert.equal(s.resets.length, 4);
});

test('funding save sanitizes unexpected failures, retains inputs and permits retry without duplicate writes', async () => {
  const record = application.createSubmittedApplication(application.createApplicationDraft(data.properties[0], 'r1'), '2026-10-21', 1);
  let writes = 0, finish;
  const api = { getApplication: () => record, releaseDraft() {}, refreshDocuments: async () => ({}), documentStatus: () => 'unavailable', picking: false, updateFunding: () => { writes++; return new Promise((_, reject) => { finish = reject; }); } };
  const s = screen('UpdateFundingScreen', { params: { applicationId: record.id }, applicationApi: () => api });
  const save = find(s, 'Save funding update'); const first = save.props.onPress(); await save.props.onPress(); assert.equal(writes, 1);
  finish(new Error('RAW secret file:///private/path')); await first;
  assert.match(text(s), /couldn't save your changes/); assert.doesNotMatch(text(s), /RAW|secret|private/); assert.equal(find(s, 'Save funding update').props.loading, false); assert.equal(s.calls.length, 0);
  api.updateFunding = async () => { writes++; }; await find(s, 'Save funding update').props.onPress(); assert.equal(writes, 2); assert.equal(s.calls[0].action, 'goBack');
});

test('attachment-check exception preserves the application step and entries with an actionable error', async () => {
  let checks = 0;
  const s = screen('ApplyScreen', { params: { property: data.properties[0], selectedRoomId: 'r1' }, applicationApi: () => ({ checkDraftDocuments: async () => { checks++; throw new Error('RAW native path'); }, picking: false }) });
  await find(s, 'Continue →').props.onPress();
  for (const [label, value] of [['Full name', 'Synthetic Student'], ['Student number', '1234'], ['Phone number', '0712345678'], ['Email address', 'synthetic@example.com']]) find(s, label).props.onChangeText(value);
  await find(s, 'Continue →').props.onPress(); const continueButton = find(s, 'Continue →');
  await continueButton.props.onPress(); assert.equal(checks, 1); assert.match(text(s), /couldn't check your files/); assert.doesNotMatch(text(s), /RAW native/);
  assert.ok(find(s, 'Documents')); assert.equal(find(s, 'Continue →').props.loading, false);
});

test('image failure/empty-source state resets when its source changes and exposes retry', () => {
  const props = { source: { uri: 'first' }, accessibilityLabel: 'Property photo' };
  const s = harness('src/components/RemoteImage.tsx', { exportName: 'RemoteImage', props });
  s.render().find((n) => n.type === 'Image').props.onError(); assert.ok(s.render().some((n) => n.props.accessibilityRole === 'alert'));
  props.source = { uri: 'next' }; assert.ok(s.render().some((n) => n.type === 'Image')); assert.ok(s.render().some((n) => n.props.accessibilityRole === 'progressbar'));
  s.render().find((n) => n.type === 'Image').props.onLoad(); assert.ok(!s.render().some((n) => n.props.accessibilityRole === 'progressbar'));
  props.source = null; assert.ok(s.render().some((n) => n.props.accessibilityRole === 'alert')); assert.ok(!find(s, 'Retry image'));
  props.source = { uri: 'restored' }; assert.ok(s.render().some((n) => n.type === 'Image'));
});

test('personal information save failures retain the draft and show error feedback until edited', () => {
  let failing = true;
  const empty = load('src/profile.ts').createEmptyProfile();
  const s = screen('PersonalInformationScreen', { profileApi: () => ({ profile: empty, saveProfile: () => { if (failing) throw new Error('RAW private server path'); return true; } }) });
  find(s, 'Edit details').props.onPress(); find(s, 'Full name').props.onChangeText('Synthetic Name'); find(s, 'Save changes').props.onPress();
  assert.match(text(s), /couldn't save your changes/); assert.doesNotMatch(text(s), /RAW private/); assert.equal(find(s, 'Full name').props.value, 'Synthetic Name');
  find(s, 'Full name').props.onChangeText('Synthetic Updated'); assert.doesNotMatch(text(s), /couldn't save/);
  find(s, 'Cancel editing').props.onPress(); s.alerts.at(-1)[2][1].onPress(); assert.doesNotMatch(text(s), /couldn't save/);
  find(s, 'Edit details').props.onPress();
  failing = false; find(s, 'Save changes').props.onPress(); assert.match(text(s), /Details saved for this session/);
});

for (const name of ['PropertyScreen', 'ApplyScreen', 'AppStatusScreen']) test(`${name} invalid-route recovery scrolls and respects every safe-area edge`, () => {
  const s = screen(name, { width: 320, fontScale: 2, params: {}, insets: { top: 24, bottom: 34, left: 40, right: 40 } });
  const root = s.render()[0]; assert.equal(root.type, 'ScrollView');
  const style = Object.assign({}, ...root.props.style.flat(Infinity).filter(Boolean));
  for (const side of ['Top', 'Bottom', 'Left', 'Right']) assert.ok(style[`padding${side}`] > 0);
  assert.equal(root.props.contentContainerStyle.flexGrow, 1);
  const action = s.render().find((n) => n.type === 'EmptyState' || n.type === 'ErrorState');
  (action.props.onAction ?? action.props.onRetry)(); assert.equal(s.calls[0].action, 'popTo');
});

test('manager notes have clear no-change state and repeated callback only confirms one save', () => {
  const managerModule = load('src/manager.ts');
  const s = screen('ManagerScreen', { managerModule });
  find(s, 'Applications').props.onPress();
  const page = s.render().find((n) => n.type?.name === 'ApplicationsPage'); page.props.onOpen(page.props.applications[0]);
  const detail = () => s.render().find((n) => n.type?.name === 'ApplicationDetail');
  assert.equal(elements(detail().type(detail().props)).find((n) => n.props.children === 'Save Review Note').props.disabled, true);
  detail().props.onNote('Synthetic review note'); const action = detail().props.onSave;
  action(); action(); assert.equal(s.alerts.length, 1);
  assert.equal(detail().props.savedNote, 'Synthetic review note');
  assert.equal(elements(detail().type(detail().props)).find((n) => n.props.children === 'Update Review Note').props.disabled, true);
  detail().props.onNote(''); detail().props.onSave(); assert.equal(detail().props.savedNote ?? '', '');
});

test('render boundary shows safe recovery and remounts children through the auth gate', () => {
  class Component { constructor(props) { this.props = props; } setState(update) { this.state = { ...this.state, ...update(this.state) }; } }
  const jsx = (type, props, key) => ({ type, props, key });
  const { AppErrorBoundary } = load('src/components/AppErrorBoundary.tsx', {
    react: { Component, Fragment: 'Fragment' }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ScrollView: 'ScrollView', StyleSheet: { create: (s) => s } },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 34, left: 40, right: 40 }) },
    './UI': { ErrorState: 'ErrorState' }, '../errors': errors,
  });
  const boundary = new AppErrorBoundary({ children: 'AUTH_GATE' }); assert.equal(boundary.render().props.children, 'AUTH_GATE');
  boundary.state = { ...boundary.state, ...AppErrorBoundary.getDerivedStateFromError(new Error('RAW SECRET')) }; boundary.componentDidCatch();
  const recovery = boundary.render(); const nodes = elements(recovery.type(recovery.props)); const state = nodes.find((n) => n.type === 'ErrorState');
  assert.doesNotMatch(state.props.message, /RAW SECRET/); state.props.onRetry(); assert.equal(boundary.render().key, 1); assert.equal(boundary.render().props.children, 'AUTH_GATE');
  assert.equal(nodes.find((n) => n.type === 'StatusBar').props.style, 'dark');
});

for (const width of [320, 375, 393]) for (const fontScale of [1, 1.3, 2]) test(`account unavailability feedback stays scrollable and unconstrained at ${width}dp / ${fontScale}`, () => {
  const s = screen('AccountScreens', { exportName: 'AccountUnavailableScreen', width, fontScale, insets: { left: 20, right: 20, bottom: 34 } });
  const nodes = s.render(); const form = nodes.find((n) => n.type === 'KeyboardForm');
  assert.equal(nodes.find((n) => n.type === 'StatusBar').props.style, 'dark');
  const styles = Object.assign({}, ...form.props.contentContainerStyle.flat(Infinity).filter(Boolean));
  assert.ok(styles.paddingLeft >= 20); assert.ok(styles.paddingRight >= 20); assert.ok(styles.paddingBottom >= 34);
  const feedback = nodes.find((n) => n.type === 'Text' && n.props.accessibilityRole === 'alert');
  assert.ok(feedback); assert.equal(feedback.props.accessibilityLiveRegion, 'polite'); assert.equal(feedback.props.numberOfLines, undefined); assert.equal(feedback.props.maxFontSizeMultiplier, undefined);
  assert.equal(nodes.find((n) => n.props.accessibilityRole === 'header' && n.props.children === 'Account access unavailable')?.type, 'Text');
  assert.equal(feedback.props.children, 'Sign-in and account creation are currently unavailable. Please check back later.');
  assert.doesNotMatch(text(s), /temporarily unavailable|service.*restor|outage|Supabase|configuration/i);
  assert.ok(!nodes.some((n) => n.type === 'Btn'), 'No decorative retry when a rebuilt configuration is required');
});
