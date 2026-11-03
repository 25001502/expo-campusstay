const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const { harness, load, elements } = require('./profile-harness.cjs');
const account = load('src/auth/account.ts', {}, { URL });
const { AccountController } = load('src/auth/controller.ts', { './account': account }, { URL, setTimeout, clearTimeout });
const copy = (value) => JSON.parse(JSON.stringify(value));
const registration = { fullName: 'Thandi', email: 'person@example.com', password: 'secure-password', confirmPassword: 'secure-password' };
function fixture(options = {}) {
  const calls = [];
  let stored = options.session ?? null;
  const user = { id: 'one', email: 'person@example.com', email_confirmed_at: '2026-10-21', user_metadata: {}, ...options.user };
  const session = { access_token: 'synthetic', user };
  const api = {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: stored }, error: null }),
    getUser: async () => ({ data: { user }, error: options.identityError ?? null }),
    signInWithPassword: async (input) => { calls.push(['signIn', input]); stored = session; return { data: { session }, error: options.loginError ?? null }; },
    signUp: async (input) => { calls.push(['signUp', input]); return { data: { session: null, user }, error: null }; },
    signOut: async () => { calls.push(['signOut']); stored = null; return { error: null }; },
    resend: async (input) => { calls.push(['resend', input]); return { error: null }; },
    resetPasswordForEmail: async (...input) => { calls.push(['reset', ...input]); return { error: null }; },
    exchangeCodeForSession: async (...input) => { calls.push(['exchange', ...input]); stored = session; return { data: { session, redirectType: options.recovery ? 'recovery' : null }, error: null }; },
    updateUser: async (input) => { calls.push(['update', input]); return { error: null }; },
  };
  return { controller: new AccountController(api), api, calls, user, session };
}
const screen = (name, options = {}) => harness(`src/screens/${name}.tsx`, options);
const find = (s, label) => s.render().find((node) => node.props.accessibilityLabel === label || node.props.label === label || (node.type === 'Btn' && node.props.children === label) || (node.type === 'TouchableOpacity' && node.props.children?.props.children === label));
const text = (s) => s.render().filter((node) => node.type === 'Text').map((node) => node.props.children).flat(Infinity).join(' ');
function enterRegistration(s) {
  for (const [label, key] of [['Full name', 'fullName'], ['Email address', 'email'], ['Password', 'password'], ['Confirm password', 'confirmPassword']]) find(s, label).props.onChangeText(registration[key]);
}

test('student login preserves its form and adds only the secondary manager route', () => {
  const s = screen('LoginScreen', { routeName: 'Login' });
  assert.match(text(s), /Welcome back/);
  assert.ok(find(s, 'Sign In')); assert.ok(find(s, 'Create account'));
  assert.deepEqual(s.render().filter((node) => node.type === 'Input').map((node) => node.props.label), ['Email address', 'Password']);
  find(s, 'Manager Access').props.onPress();
  assert.deepEqual(s.calls, [{ action: 'navigate', args: ['ManagerLogin'] }]);
  assert.equal(s.authCalls.length, 0);
  assert.ok(s.render().some((node) => node.type === 'Ionicons' && node.props.name === 'business-outline'));
});
test('manager login has dedicated copy, a student return, registration and recovery destinations', () => {
  const s = screen('LoginScreen', { routeName: 'ManagerLogin' });
  assert.match(text(s), /Manager Portal/);
  assert.match(text(s), /Sign in to manage your accommodation properties\./);
  assert.match(text(s), /New property manager\?/);
  assert.equal(find(s, 'Manager Access'), undefined);
  find(s, 'Back to student login').props.onPress();
  find(s, 'Register as a property manager').props.onPress();
  find(s, 'Forgot password').props.onPress();
  assert.deepEqual(copy(s.calls), [
    { action: 'popTo', args: ['Login'] },
    { action: 'navigate', args: ['ManagerRegister'] },
    { action: 'navigate', args: ['Forgot', { returnTo: 'ManagerLogin' }] },
  ]);
});
test('manager credentials use the shared account controller and only a navigation hint', () => {
  const s = screen('LoginScreen', { routeName: 'ManagerLogin' });
  find(s, 'Email address').props.onChangeText('person@example.com');
  find(s, 'Password').props.onChangeText('secure-password');
  find(s, 'Sign In as Manager').props.onPress();
  assert.deepEqual(s.authCalls, [{ name: 'signIn', args: ['person@example.com', 'secure-password', 'manager'] }]);
  assert.equal(s.calls.length, 0);
  assert.equal(find(s, 'Password').props.passwordVisibilityToggle, true);
});
test('manager login validates fields before any authentication call', () => {
  const s = screen('LoginScreen', { routeName: 'ManagerLogin' }); find(s, 'Sign In as Manager').props.onPress();
  assert.ok(find(s, 'Email address').props.error); assert.ok(find(s, 'Password').props.error);
  assert.equal(s.authCalls.length, 0);
});
test('manager registration provides account progress, validation and no proof collection', () => {
  const s = screen('RegisterScreen', { routeName: 'ManagerRegister' });
  assert.match(text(s), /Create manager account/); assert.match(text(s), /Step 1 of 2/);
  assert.match(text(s), /Manager Workspace access requires separate CampusStay approval/);
  find(s, 'Create account').props.onPress();
  assert.equal(s.authCalls.length, 0);
  assert.ok(s.render().filter((node) => node.type === 'Input').every((node) => node.props.error));
  enterRegistration(s); find(s, 'Create account').props.onPress();
  assert.deepEqual(copy(s.authCalls), [{ name: 'register', args: [registration, 'manager'] }]);
  assert.equal(s.render().filter((node) => node.type === 'Input').length, 4);
  find(s, 'Back to manager login').props.onPress();
  find(s, 'Back to sign in').props.onPress();
  assert.deepEqual(s.calls.map((call) => call.args), [['ManagerLogin'], ['ManagerLogin']]);
});
test('student registration retains its existing fields and shared signup call', () => {
  const s = screen('RegisterScreen', { routeName: 'Register' }); enterRegistration(s); find(s, 'Create account').props.onPress();
  assert.deepEqual(copy(s.authCalls), [{ name: 'register', args: [registration] }]);
  assert.doesNotMatch(text(s), /Step 1 of 2|Create manager account/);
  find(s, 'Back to sign in').props.onPress(); assert.deepEqual(s.calls[0].args, ['Login']);
});
test('busy manager surfaces keep navigation and inputs disabled', () => {
  const auth = { configured: true, busy: true, error: '', account: { clearError() {} } };
  for (const [name, routeName] of [['LoginScreen', 'ManagerLogin'], ['RegisterScreen', 'ManagerRegister']]) {
    const s = screen(name, { routeName, auth });
    assert.ok(s.render().filter((node) => node.type === 'Input' || node.type === 'TouchableOpacity').every((node) => node.props.disabled));
    assert.ok(s.render().filter((node) => node.type === 'Btn').every((node) => node.props.loading));
  }
});
test('manager signup sends no role or journey metadata and waits for email confirmation', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.register(registration, 'manager');
  const request = f.calls.find(([name]) => name === 'signUp')[1];
  assert.deepEqual(copy(request.options), { emailRedirectTo: account.AUTH_REDIRECT, data: { full_name: 'Thandi' } });
  assert.equal(f.controller.getSnapshot().phase, 'verification'); assert.equal(f.controller.getSnapshot().user, null);
  assert.equal(f.controller.getSnapshot().intent, 'manager');
  await f.controller.resend();
  assert.equal(f.calls.find(([name]) => name === 'resend')[1].options.emailRedirectTo, account.AUTH_REDIRECT);
});
test('manager email confirmation resumes the verification route within the active session', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.register(registration, 'manager');
  await f.controller.handleUrl('campusstay://auth/confirm?code=synthetic-manager-confirm');
  assert.equal(f.controller.getSnapshot().phase, 'authenticated'); assert.equal(f.controller.getSnapshot().intent, 'manager');
  assert.deepEqual(copy(f.controller.getSnapshot().user), { id: 'one', email: 'person@example.com', name: '' });
});
test('unconfirmed manager login cannot open a verified experience', async () => {
  for (const options of [{ user: { email_confirmed_at: null } }, { loginError: { code: 'email_not_confirmed' } }]) {
    const f = fixture(options); await f.controller.start(); await f.controller.signIn(registration.email, registration.password, 'manager');
    assert.equal(f.controller.getSnapshot().phase, 'verification'); assert.equal(f.controller.getSnapshot().user, null);
    assert.equal(f.controller.getSnapshot().intent, 'manager');
  }
});
test('confirmed manager login still requires validated identity and never projects a role', async () => {
  const f = fixture({ user: { user_metadata: { role: 'admin', is_manager: true, manager_status: 'approved' }, app_metadata: { role: 'manager' } } });
  await f.controller.start(); await f.controller.signIn(registration.email, registration.password, 'manager');
  assert.equal(f.controller.getSnapshot().phase, 'authenticated'); assert.equal(f.controller.getSnapshot().intent, 'manager');
  assert.deepEqual(Object.keys(f.controller.getSnapshot().user).sort(), ['email', 'id', 'name']);
  const invalid = fixture({ identityError: { code: 'session_not_found' } });
  await invalid.controller.start(); await invalid.controller.signIn(registration.email, registration.password, 'manager');
  assert.equal(invalid.controller.getSnapshot().user, null);
});
test('an existing verified session cannot silently sign in or register another identity', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.signIn(registration.email, registration.password);
  assert.equal(await f.controller.signIn('other@example.com', 'password', 'manager'), false);
  assert.equal(await f.controller.register({ ...registration, email: 'other@example.com' }, 'manager'), false);
  assert.equal(f.calls.filter(([name]) => name === 'signIn').length, 1);
  assert.equal(f.calls.filter(([name]) => name === 'signUp').length, 0);
  assert.equal(f.controller.getSnapshot().intent, 'student'); assert.equal(f.controller.getSnapshot().user.id, 'one');
});
test('return from manager email verification goes to manager sign-in; explicit sign-out resets the default', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.register(registration, 'manager');
  await f.controller.backToSignIn(); assert.equal(f.controller.getSnapshot().phase, 'signed-out'); assert.equal(f.controller.getSnapshot().intent, 'manager');
  await f.controller.signIn(registration.email, registration.password, 'manager'); await f.controller.signOut();
  assert.equal(f.controller.getSnapshot().phase, 'signed-out'); assert.equal(f.controller.getSnapshot().intent, 'student');
});
test('a new controller restores validated identity into student Home without claiming a saved manager application', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.signIn(registration.email, registration.password, 'manager');
  f.controller.dispose(); const restored = new AccountController(f.api); await restored.start();
  assert.equal(restored.getSnapshot().phase, 'authenticated'); assert.equal(restored.getSnapshot().intent, 'student');
  assert.equal(restored.getSnapshot().user.id, 'one'); restored.dispose();
});
test('manager password recovery retains the SDK recovery gate and returns to manager sign-in', async () => {
  const f = fixture({ recovery: true }); await f.controller.start();
  await f.controller.requestReset(registration.email, 'manager');
  assert.equal(f.calls.find(([name]) => name === 'reset')[2].redirectTo, account.RECOVERY_REDIRECT);
  await f.controller.handleUrl('campusstay://auth/recovery?code=synthetic-recovery');
  assert.equal(f.controller.getSnapshot().phase, 'recovery'); assert.equal(f.controller.getSnapshot().intent, 'manager');
  // Password recovery ends the session; normal sign-in is still required.
  await f.controller.backToSignIn(); assert.equal(f.controller.getSnapshot().phase, 'signed-out');
  assert.equal(f.controller.getSnapshot().intent, 'manager');
});
test('saving a recovered manager password signs out and preserves only the manager login destination', async () => {
  const f = fixture({ recovery: true }); await f.controller.start(); await f.controller.requestReset(registration.email, 'manager');
  await f.controller.handleUrl('campusstay://auth/recovery?code=synthetic-save-recovery');
  assert.equal(await f.controller.updatePassword('new-secure-password'), true);
  assert.equal(f.controller.getSnapshot().phase, 'signed-out'); assert.equal(f.controller.getSnapshot().user, null);
  assert.equal(f.controller.getSnapshot().intent, 'manager');
  assert.deepEqual(f.calls.filter(([name]) => ['update', 'signOut'].includes(name)).map(([name]) => name), ['update', 'signOut']);
});
test('forgot-password feedback returns to the correct login surface without changing redirect URLs', async () => {
  const s = screen('ForgotScreen', { params: { returnTo: 'ManagerLogin' } });
  find(s, 'Email address').props.onChangeText(registration.email); find(s, 'Send reset link').props.onPress();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(s.authCalls[0], { name: 'requestReset', args: [registration.email, 'manager'] });
  find(s, 'Back to sign in').props.onPress(); assert.deepEqual(s.calls[0], { action: 'popTo', args: ['ManagerLogin'] });
});
test('manager verification is a truthful informational step with no fields, uploads or fake status', () => {
  const s = screen('AccountScreens', { exportName: 'ManagerRequestScreen' });
  assert.match(text(s), /Step 2 of 2/); assert.match(text(s), /student@example.com/);
  assert.match(text(s), /not collected here/);
  for (const value of ['Contact number', 'Accommodation or business name', 'Property address or location', 'authorised manager', 'supporting proof']) assert.ok(text(s).includes(value));
  assert.equal(s.render().filter((node) => ['Input', 'AttachmentSourceButton', 'ManagerScreen'].includes(node.type)).length, 0);
  assert.ok(s.render().some((node) => node.props.message?.includes('No new submission is confirmed')));
  assert.doesNotMatch(text(s), /Pending admin review|You are approved|Verification submitted/);
  find(s, 'Find accommodation').props.onPress(); assert.deepEqual(copy(s.calls[0]), { action: 'replace', args: ['Main', { screen: 'Home' }] });
  find(s, 'Sign out').props.onPress(); assert.equal(s.authCalls[0].name, 'signOut');
});
for (const claim of ['pending', 'approved', 'suspended', 'revoked', undefined]) {
  test(`production workspace denies access without trusted backend authorisation, including local ${claim ?? 'missing'} claims`, () => {
    const s = screen('AccountScreens', { exportName: 'ManagerAccessScreen', development: false, managerPreview: 'true', auth: {
      phase: 'authenticated', user: { id: 'one', email: registration.email, user_metadata: { manager_status: claim }, app_metadata: { role: 'manager' } }, error: '', account: {},
    } });
    assert.equal(s.render().some((node) => node.type === 'ManagerScreen'), false);
    assert.ok(find(s, 'About manager access'));
  });
}
test('development preview still requires a verified account object, not just a local phase label', () => {
  const s = screen('AccountScreens', { exportName: 'ManagerAccessScreen', development: true, managerPreview: 'true', auth: { phase: 'authenticated', user: null, error: '' } });
  assert.equal(s.render().some((node) => node.type === 'ManagerScreen'), false);
});

test('root defaults to student login and keeps both public journeys outside the signed-in navigator', () => {
  const source = fs.readFileSync('App.tsx', 'utf8'); let auth;
  const modules = Object.fromEntries([...source.matchAll(/from ['"]([^'"]+)['"]/g)].map((match) => [match[1], new Proxy({}, { get: (_, key) => key === '__esModule' ? true : String(key) })]));
  modules['react-native-gesture-handler'] = {}; modules.react = {};
  modules['react/jsx-runtime'] = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  modules['./src/state/AuthContext'] = { useAuth: () => auth };
  modules['./src/screens/AccountScreens'] = { ManagerAccessScreen: 'ManagerAccessScreen', ManagerRequestScreen: 'ManagerRequestScreen' };
  modules['@react-navigation/native-stack'] = { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }) };
  modules['@react-navigation/bottom-tabs'] = { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Tab' }) };
  const app = load('App.tsx', modules);
  for (const intent of [undefined, 'student', 'manager']) {
    auth = { phase: 'signed-out', intent, user: null };
    const publicTree = elements(app.AccountNavigation());
    assert.equal(publicTree.find((node) => node.type === 'Stack').props.initialRouteName, intent === 'manager' ? 'ManagerLogin' : 'Login');
    assert.ok(publicTree.some((node) => node.type === 'Screen' && node.props.name === 'ManagerRegister'));
    assert.equal(publicTree.some((node) => node.type === 'Screen' && node.props.name === 'Manager'), false);
    auth = { phase: 'authenticated', intent, user: { id: 'verified' } };
    const privateTree = elements(app.AccountNavigation().type({}));
    assert.equal(privateTree.find((node) => node.type === 'Stack').props.initialRouteName, intent === 'manager' ? 'ManagerRequest' : 'Main');
    assert.equal(privateTree.some((node) => node.type === 'Screen' && ['Login', 'Register', 'ManagerLogin', 'ManagerRegister'].includes(node.props.name)), false);
    assert.ok(privateTree.some((node) => node.type === 'Screen' && node.props.name === 'Manager' && node.props.component === 'ManagerAccessScreen'));
  }
});

test('installed stack router supports both login/registration journeys and cold manager return to student login', () => {
  const { StackRouter, StackActions, CommonActions } = require('@react-navigation/routers');
  const config = { routeNames: ['Login', 'Register', 'ManagerLogin', 'ManagerRegister', 'Forgot', 'Onboarding', 'Splash'], routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: 'Login' });
  let state = router.getInitialState(config);
  const actions = [
    [CommonActions.navigate('Register'), 'Register'], [StackActions.popTo('Login'), 'Login'],
    [CommonActions.navigate('ManagerLogin'), 'ManagerLogin'], [CommonActions.navigate('ManagerRegister'), 'ManagerRegister'],
    [StackActions.popTo('ManagerLogin'), 'ManagerLogin'], [CommonActions.navigate('Forgot', { returnTo: 'ManagerLogin' }), 'Forgot'],
    [StackActions.popTo('ManagerLogin'), 'ManagerLogin'], [StackActions.popTo('Login'), 'Login'],
  ];
  for (const [action, expected] of actions) { state = router.getStateForAction(state, action, config); assert.equal(state.routes[state.index].name, expected); }
  const coldRouter = StackRouter({ initialRouteName: 'ManagerLogin' });
  const cold = coldRouter.getStateForAction(coldRouter.getInitialState(config), StackActions.popTo('Login'), config);
  assert.equal(cold.routes[cold.index].name, 'Login');
});

// Native primitives are stubbed: these are layout contracts, not simulator evidence.
for (const platform of ['android', 'ios']) for (const width of [320, 390]) for (const fontScale of [1, 1.3, 2]) {
  test(`${platform} manager forms retain scroll/keyboard owner and safe areas at ${width}dp/${fontScale * 100}% text`, () => {
    const options = { platform, width, height: 568, fontScale, insets: { top: 47, bottom: 34, left: 12, right: 9 } };
    const flatten = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
    const login = screen('LoginScreen', { ...options, routeName: 'ManagerLogin' });
    const registration = screen('RegisterScreen', { ...options, routeName: 'ManagerRegister' });
    for (const s of [login, registration]) {
      const forms = s.render().filter((node) => node.type === 'KeyboardForm'); assert.equal(forms.length, 1);
      assert.equal(s.render().filter((node) => node.type === 'KeyboardAvoidingView').length, 0);
      const outer = flatten(forms[0].props.style), content = flatten(forms[0].props.contentContainerStyle);
      assert.equal(outer.paddingLeft, 12); assert.equal(outer.paddingRight, 9); assert.ok(content.paddingBottom >= 34);
      assert.equal(content.height, undefined); assert.equal(content.maxHeight, undefined);
      assert.equal(content.flexGrow, 1);
      assert.ok(s.render().filter((node) => node.type === 'TouchableOpacity').every((node) => flatten(node.props.style).minHeight >= 44));
      assert.ok(s.render().filter((node) => node.type === 'Input' && node.props.label.toLowerCase().includes('password')).every((node) => node.props.passwordVisibilityToggle));
    }
    const header = registration.render().find((node) => flatten(node.props.style).backgroundColor === '#0F1B2D');
    assert.ok(flatten(header.props.style).paddingTop >= 47);
    const verification = screen('AccountScreens', { ...options, exportName: 'ManagerRequestScreen' });
    const container = verification.render().find((node) => node.type === 'KeyboardForm');
    const padded = flatten(container.props.contentContainerStyle);
    assert.ok(padded.paddingTop > 47); assert.ok(padded.paddingBottom > 34); assert.ok(padded.paddingLeft > 12); assert.ok(padded.paddingRight > 9);
  });
}
