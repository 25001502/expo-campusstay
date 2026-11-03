const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const { load, harness, elements } = require('./profile-harness.cjs');
const globals = { URL, setTimeout, clearTimeout };
const account = load('src/auth/account.ts', {}, globals);
const { AccountController } = load('src/auth/controller.ts', { './account': account }, globals);
const copy = (value) => JSON.parse(JSON.stringify(value));
const user = (patch = {}) => ({ id: 'account-1', email: 'person@example.com', email_confirmed_at: '2026-10-21T10:00:00Z', user_metadata: { full_name: 'Thandi', role: 'admin', is_manager: true }, ...patch });
const session = (identity = user()) => ({ access_token: 'synthetic-token', refresh_token: 'synthetic-refresh', user: identity });
const fields = () => ({ fullName: 'Thandi', email: 'person@example.com', password: 'secure password', confirmPassword: 'secure password' });
function fixture(options = {}) {
  const calls = [];
  let listener, stored = options.session ?? null, currentUser = options.user ?? user();
  const api = {
    onAuthStateChange: (callback) => { listener = callback; return { data: { subscription: { unsubscribe() { listener = undefined; } } } }; },
    getSession: async () => { calls.push(['getSession']); if (options.restoreError) throw options.restoreError; return { data: { session: stored }, error: null }; },
    getUser: async (token) => { calls.push(['getUser', token]); return { data: { user: currentUser }, error: options.userError ?? null }; },
    signInWithPassword: async (input) => { calls.push(['signIn', input]); stored = session(currentUser); return { data: { session: stored }, error: options.loginError ?? null }; },
    signUp: async (input) => { calls.push(['signUp', input]); return { data: { user: currentUser, session: options.signupSession ?? null }, error: options.signupError ?? null }; },
    signOut: async (input) => { calls.push(['signOut', input]); if (options.logoutError) return { error: options.logoutError }; stored = null; return { error: null }; },
    resend: async (input) => { calls.push(['resend', input]); return { error: options.emailError ?? null }; },
    resetPasswordForEmail: async (...args) => { calls.push(['reset', ...args]); return { error: options.emailError ?? null }; },
    exchangeCodeForSession: async (...args) => { calls.push(['exchange', ...args]); stored = session(currentUser); return { data: { session: stored, redirectType: options.recovery ? 'recovery' : null }, error: options.linkError ?? null }; },
    updateUser: async (input) => { calls.push(['updateUser', input]); return { error: options.updateError ?? null }; },
  };
  return { api, calls, controller: new AccountController(api), emit: (...args) => listener?.(...args), setUser: (next) => { currentUser = next; } };
}

test('missing configuration never creates a client session or guest access', async () => {
  const controller = new AccountController(null, 'Project configuration missing');
  await controller.start(); assert.equal(controller.getSnapshot().phase, 'signed-out');
  assert.equal(await controller.signIn('person@example.com', 'password'), false);
  assert.equal(controller.getSnapshot().user, null); assert.match(controller.getSnapshot().error, /temporarily unavailable/);
});
test('only HTTPS project URLs and publishable public keys are accepted', () => {
  assert.equal(account.readAuthConfig('https://example.supabase.co', 'sb_publishable_public').url, 'https://example.supabase.co');
  for (const key of ['sb_secret_secret', 'service_role', 'eyJhbGciOiJIUzI1NiJ9']) assert.ok(account.readAuthConfig('https://example.supabase.co', key).error);
  for (const url of ['http://example.supabase.co', 'https://user:pass@example.supabase.co', 'https://example.supabase.co/path']) assert.ok(account.readAuthConfig(url, 'sb_publishable_public').error);
});
test('shared registration requires name/email/password without student-specific credentials or a role', () => {
  assert.equal(Object.keys(account.validateAccountRegistration(fields())).length, 0);
  assert.ok(account.validateAccountRegistration({ ...fields(), password: 'short', confirmPassword: 'wrong' }).password);
  assert.ok(account.validateAccountRegistration({ ...fields(), fullName: '', email: 'invalid' }).email);
});
test('sign-up sends only public display metadata and waits for confirmation', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.register({ ...fields(), role: 'admin', manager: true });
  const request = f.calls.find(([name]) => name === 'signUp')[1];
  assert.deepEqual(copy(request.options.data), { full_name: 'Thandi' });
  assert.equal(request.options.emailRedirectTo, account.AUTH_REDIRECT);
  assert.equal(f.controller.getSnapshot().phase, 'verification'); assert.equal(f.controller.getSnapshot().user, null);
});
test('failed registration never displays a completed verification state', async () => {
  const f = fixture({ signupError: { code: 'weak_password' } }); await f.controller.start();
  assert.equal(await f.controller.register(fields()), false); assert.equal(f.controller.getSnapshot().phase, 'signed-out');
  assert.match(f.controller.getSnapshot().error, /stronger password/);
});
test('auto-confirm sign-up response is not silently treated as a verification journey', async () => {
  const f = fixture({ signupSession: session() }); await f.controller.start(); await f.controller.register(fields());
  assert.equal(f.controller.getSnapshot().phase, 'verification'); assert.match(f.controller.getSnapshot().error, /temporarily unavailable/);
  assert.ok(f.calls.some(([name]) => name === 'signOut'));
});
test('shared sign-in validates identity and email confirmation with Supabase getUser', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.signIn(' person@example.com ', 'password');
  assert.equal(f.controller.getSnapshot().phase, 'authenticated'); assert.equal(f.controller.getSnapshot().user.id, 'account-1');
  assert.ok(f.calls.some(([name, token]) => name === 'getUser' && token === 'synthetic-token'));
  assert.equal('role' in f.controller.getSnapshot().user, false);
});
test('unconfirmed sign-in is gated even when a cached session exists', async () => {
  const f = fixture({ user: user({ email_confirmed_at: null }) }); await f.controller.start(); await f.controller.signIn('person@example.com', 'password');
  assert.equal(f.controller.getSnapshot().phase, 'verification'); assert.equal(f.controller.getSnapshot().user, null);
});
test('provider email-not-confirmed response opens confirmation rather than Home', async () => {
  const f = fixture({ loginError: { code: 'email_not_confirmed' } }); await f.controller.start(); await f.controller.signIn('person@example.com', 'password');
  assert.equal(f.controller.getSnapshot().phase, 'verification'); assert.equal(f.controller.getSnapshot().email, 'person@example.com');
});
test('invalid credentials never authenticate or expose raw provider errors', async () => {
  const f = fixture({ loginError: { code: 'invalid_credentials', message: 'synthetic-secret' } }); await f.controller.start();
  assert.equal(await f.controller.signIn('person@example.com', 'wrong'), false);
  assert.equal(f.controller.getSnapshot().phase, 'signed-out'); assert.doesNotMatch(f.controller.getSnapshot().error, /synthetic-secret/);
});
test('restoration rejects unvalidated cached identity and fails closed on network errors', async () => {
  for (const options of [{ userError: new Error('offline') }, { user: user({ id: 'different-account' }) }]) {
    const f = fixture({ ...options, session: session() }); await f.controller.start();
    assert.equal(f.controller.getSnapshot().phase, 'error'); assert.equal(f.controller.getSnapshot().user, null);
  }
});
test('verified session restoration defaults to the student journey and keeps roles unassigned', async () => {
  const f = fixture({ session: session() }); await f.controller.start();
  assert.equal(f.controller.getSnapshot().phase, 'authenticated'); assert.equal(f.controller.getSnapshot().intent, 'student'); assert.equal('manager' in f.controller.getSnapshot().user, false);
});
test('the selected login journey never bypasses authentication', async () => {
  const f = fixture({ loginError: { code: 'invalid_credentials' } }); await f.controller.start();
  await f.controller.signIn('person@example.com', 'wrong', 'manager');
  assert.equal(f.controller.getSnapshot().intent, 'manager');
  assert.equal(f.controller.getSnapshot().phase, 'signed-out'); assert.equal(f.controller.getSnapshot().user, null);
});

test('sign-out invalidates access locally; failed sign-out reports failure', async () => {
  const f = fixture({ session: session() }); await f.controller.start(); assert.equal(await f.controller.signOut(), true);
  assert.equal(f.controller.getSnapshot().phase, 'signed-out'); assert.equal(f.controller.getSnapshot().user, null);
  const failed = fixture({ session: session(), logoutError: new Error('offline') }); await failed.controller.start();
  assert.equal(await failed.controller.signOut(), false); assert.ok(failed.controller.getSnapshot().error);
});
test('resend/reset feedback follows provider results and reset uses the recovery callback', async () => {
  const f = fixture(); await f.controller.start(); await f.controller.register(fields());
  assert.equal(await f.controller.resend(), true); assert.equal(await f.controller.requestReset('person@example.com'), true);
  assert.equal(f.calls.find(([name]) => name === 'reset')[2].redirectTo, account.RECOVERY_REDIRECT);
  const failed = fixture({ emailError: { code: 'over_email_send_rate_limit' } }); await failed.controller.start();
  assert.equal(await failed.controller.requestReset('person@example.com'), false);
});
test('PKCE cold-start confirmation exchanges the code/flow and validates the returned identity', async () => {
  const f = fixture(); await f.controller.start('campusstay://auth/confirm?code=synthetic-code&sb_flow_id=12345678');
  assert.equal(f.controller.getSnapshot().phase, 'authenticated');
  assert.deepEqual(copy(f.calls.find(([name]) => name === 'exchange').slice(1)), ['synthetic-code', { flowId: '12345678' }]);
  await f.controller.handleUrl('campusstay://auth/confirm?code=synthetic-code');
  assert.equal(f.calls.filter(([name]) => name === 'exchange').length, 1);
});
test('callbacks reject token fragments, duplicate codes, wrong origins and invalid flows', () => {
  for (const url of ['https://example.org/auth/confirm?code=x', 'campusstay://Manager?code=x', 'campusstay://other/confirm?code=x']) assert.equal(account.parseAuthCallback(url), null);
  for (const url of ['campusstay://auth/confirm#access_token=x', 'campusstay://auth/confirm?code=a&code=b', 'campusstay://auth/confirm?code=x&sb_flow_id=bad!', 'campusstay://auth/confirm?error=expired']) assert.throws(() => account.parseAuthCallback(url));
});
test('expired callback fails closed without exposing protected routes', async () => {
  const f = fixture({ linkError: new Error('expired') }); await f.controller.start('campusstay://auth/confirm?code=expired');
  assert.equal(f.controller.getSnapshot().phase, 'error'); assert.equal(f.controller.getSnapshot().user, null);
});
test('recovery callback restricts navigation until password update and sign-out', async () => {
  const f = fixture({ recovery: true }); await f.controller.start('campusstay://auth/recovery?code=recovery');
  assert.equal(f.controller.getSnapshot().phase, 'recovery'); assert.equal(f.controller.getSnapshot().user.id, 'account-1');
  assert.equal(await f.controller.updatePassword('new-password'), true); assert.equal(f.controller.getSnapshot().phase, 'signed-out');
  assert.ok(f.calls.some(([name]) => name === 'updateUser'));
});
test('a forged recovery path does not substitute for the SDK recovery flow', async () => {
  const f = fixture(); await f.controller.start('campusstay://auth/recovery?code=regular-confirmation');
  assert.equal(f.controller.getSnapshot().phase, 'authenticated');
  assert.equal(await f.controller.updatePassword('new-password'), false); assert.ok(!f.calls.some(([name]) => name === 'updateUser'));
});
test('late restore completions after dispose cannot revive identity; remount may restore again', async () => {
  const f = fixture({ session: session() }); let complete;
  f.api.getSession = () => new Promise((resolve) => { complete = resolve; });
  const pending = f.controller.start(); f.controller.dispose();
  complete({ data: { session: session() }, error: null }); await pending;
  assert.equal(f.controller.getSnapshot().user, null);
  f.api.getSession = async () => ({ data: { session: session() }, error: null });
  await f.controller.start(); assert.equal(f.controller.getSnapshot().phase, 'authenticated');
});
test('duplicate sign-in taps produce one provider request', async () => {
  const f = fixture(); await f.controller.start(); let complete;
  f.api.signInWithPassword = () => { f.calls.push(['deferredSignIn']); return new Promise((resolve) => { complete = resolve; }); };
  const first = f.controller.signIn('person@example.com', 'password');
  assert.equal(await f.controller.signIn('person@example.com', 'password'), false);
  complete({ data: { session: session() }, error: null }); await first;
  assert.equal(f.calls.filter(([name]) => name === 'deferredSignIn').length, 1);
});
test('external sign-out removes access and stale refresh failures fail closed', async () => {
  const f = fixture({ session: session() }); await f.controller.start();
  f.emit('SIGNED_OUT', null); await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(f.controller.getSnapshot().phase, 'signed-out');
  const invalid = fixture({ session: session(), userError: new Error('revoked') });
  // Establish a valid session first, then revoke validation for a refresh event.
  const original = invalid.api.getUser; invalid.api.getUser = async () => ({ data: { user: user() }, error: null });
  await invalid.controller.start(); invalid.api.getUser = original;
  invalid.emit('TOKEN_REFRESHED', session()); await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(invalid.controller.getSnapshot().phase, 'error');
});
test('production never permits a manager preview, regardless of intent/metadata/flag', () => {
  for (const verified of [false, true]) for (const flag of [undefined, 'false', 'true']) assert.equal(account.canPreviewManager(false, flag, verified), false);
  assert.equal(account.canPreviewManager(true, 'true', true), true);
  assert.equal(account.canPreviewManager(true, 'true', false), false);
  assert.equal(account.canPreviewManager(true, undefined, true), false);
});

const screen = (name, options) => harness(`src/screens/${name}.tsx`, options);
const find = (s, label) => s.render().find((node) => node.props.label === label || node.props.children === label || node.props.accessibilityLabel === label);
test('actual shared registration UI has no student-only requirement or public role choice', () => {
  const s = screen('RegisterScreen');
  for (const [label, value] of [['Full name', 'Thandi'], ['Email address', 'person@example.com'], ['Password', 'password1'], ['Confirm password', 'password1']]) find(s, label).props.onChangeText(value);
  s.render().find((node) => node.type === 'Btn' && node.props.children === 'Create account').props.onPress(); assert.equal(s.authCalls[0].name, 'register');
  assert.equal(s.render().filter((node) => node.type === 'Input').length, 4);
  assert.equal(s.calls.length, 0, 'The controller, not a local form, opens the authenticated gate');
});
test('actual Login has no guest or manager bypass and submits to shared auth', () => {
  const s = screen('LoginScreen'); find(s, 'Email address').props.onChangeText('person@example.com'); find(s, 'Password').props.onChangeText('password1');
  find(s, 'Sign In').props.onPress(); assert.equal(s.authCalls[0].name, 'signIn');
  assert.ok(!s.render().some((node) => /Continue without|Guest|Open manager workspace/.test(node.props.accessibilityLabel ?? node.props.children)));
});
test('the old post-login chooser is removed from the root gate', () => {
  assert.doesNotMatch(fs.readFileSync('App.tsx', 'utf8'), /AccountChoiceScreen|auth\.onboarded/);
});
test('Profile Become a Manager and the manager login journey share one typed request route', () => {
  const s = screen('ProfileScreen'); find(s, 'Become a Manager').props.onPress();
  assert.deepEqual(s.calls[0], { action: 'navigate', args: ['ManagerRequest'] });
  assert.match(fs.readFileSync('App.tsx', 'utf8'), /auth.intent === 'manager' \? 'ManagerRequest' : 'Main'/);
});
test('production workspace guard denies direct route access and offers no approval action', () => {
  const s = screen('AccountScreens', { exportName: 'ManagerAccessScreen', development: false, managerPreview: 'true', props: {} });
  assert.ok(!s.render().some((node) => node.type === 'ManagerScreen' || node.type?.name === 'ManagerScreen'));
  assert.ok(find(s, 'About manager access'));
});
test('failed sign-out preserves existing local owners and reports the account failure', async () => {
  const auth = { phase: 'authenticated', user: { id: 'one', name: '' }, configured: true, busy: false, error: '', account: { signOut: async () => false } };
  const s = screen('ProfileScreen', { auth, profile: { fullName: 'Saved profile' } });
  find(s, 'Log Out').props.onPress(); await s.alerts[0][2][1].onPress();
  assert.equal(s.resets.length, 0); assert.equal(s.profile.fullName, 'Saved profile'); assert.equal(s.calls.length, 0);
});

test('root authentication gate renders only the routes allowed by each state', () => {
  const source = fs.readFileSync('App.tsx', 'utf8'); let auth;
  const modules = Object.fromEntries([...source.matchAll(/from ['"]([^'"]+)['"]/g)].map((match) => [match[1], new Proxy({}, { get: (_, key) => key === '__esModule' ? true : String(key) })]));
  modules['react-native-gesture-handler'] = {};
  modules.react = {};
  modules['react/jsx-runtime'] = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  modules['./src/state/AuthContext'] = { useAuth: () => auth };
  modules['./src/screens/AccountScreens'] = Object.fromEntries(['AccountUnavailableScreen', 'AccountStatusScreen', 'VerificationScreen', 'PasswordResetScreen', 'ManagerRequestScreen', 'ManagerAccessScreen'].map((key) => [key, key]));
  modules['@react-navigation/native-stack'] = { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'Screen' }) };
  modules['@react-navigation/bottom-tabs'] = { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'Tab' }) };
  const app = load('App.tsx', modules);
  for (const [phase, expected] of [['loading', 'AccountStatusScreen'], ['error', 'AccountStatusScreen'], ['verification', 'VerificationScreen'], ['recovery', 'PasswordResetScreen']]) {
    auth = { phase, user: null }; assert.equal(app.AccountNavigation().type, expected);
  }
  for (const phase of ['loading', 'signed-out', 'authenticated', 'recovery']) {
    auth = { configured: false, phase, user: { id: 'stale' }, onboarded: true };
    assert.equal(app.AccountNavigation().type, 'AccountUnavailableScreen');
  }
  auth = { phase: 'signed-out', user: null };
  const publicTree = elements(app.AccountNavigation());
  assert.deepEqual(publicTree.filter((node) => node.type === 'Screen').map((node) => node.props.name), ['Login', 'Register', 'ManagerLogin', 'ManagerRegister', 'Forgot', 'Onboarding', 'Splash']);
  auth = { phase: 'authenticated', user: { id: 'verified-user' }, onboarded: false };
  assert.equal(app.AccountNavigation().type.name, 'StudentExperience');
  auth = { ...auth, onboarded: true, intent: 'manager' };
  const privateTree = elements(app.AccountNavigation().type({}));
  assert.ok(privateTree.some((node) => node.type === 'Screen' && node.props.name === 'Main'));
  assert.ok(privateTree.some((node) => node.type === 'Screen' && node.props.name === 'Manager' && node.props.component === 'ManagerAccessScreen'));
});

test('native PKCE crypto bridge supplies cryptographic randomness and SHA-256', async () => {
  const crypto = require('node:crypto'), realm = {};
  load('src/auth/crypto.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-crypto': { getRandomValues: (bytes) => crypto.webcrypto.getRandomValues(bytes), CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digest: (algorithm, bytes) => crypto.webcrypto.subtle.digest(algorithm, bytes) },
  }, { globalThis: realm });
  const bytes = realm.crypto.getRandomValues(new Uint32Array(10)); assert.ok(bytes.some((byte) => byte !== 0));
  const digest = await realm.crypto.subtle.digest('SHA-256', new TextEncoder().encode('test'));
  assert.equal(new Uint8Array(digest).length, 32);
  await assert.rejects(realm.crypto.subtle.digest('unsupported', new Uint8Array()));
});

test('installed Supabase SDK sends S256 PKCE signup requests through a mocked transport', async () => {
  const { createClient } = require('@supabase/supabase-js');
  const values = new Map(), requests = [];
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', {
    auth: { flowType: 'pkce', autoRefreshToken: false, persistSession: true, detectSessionInUrl: false,
      storage: { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } } },
    global: { fetch: async (url, init) => {
      requests.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(JSON.stringify(user({ email_confirmed_at: null })), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  const result = await client.auth.signUp({ email: 'person@example.com', password: 'synthetic password', options: { emailRedirectTo: account.AUTH_REDIRECT, data: { full_name: 'Thandi' } } });
  assert.equal(result.error, null); assert.equal(result.data.session, null);
  assert.equal(requests[0].body.code_challenge_method, 's256');
  assert.ok(requests[0].body.code_challenge.length > 20);
  assert.equal(new URL(requests[0].url).searchParams.get('redirect_to'), account.AUTH_REDIRECT);
  assert.ok([...values.keys()].some((key) => key.endsWith('-code-verifier')));
  assert.deepEqual(requests[0].body.data, { full_name: 'Thandi' });
  await client.auth.stopAutoRefresh();
});

test('installed SDK recovery exchange retains the PKCE verifier recovery marker', async () => {
  const { createClient } = require('@supabase/supabase-js');
  const { Buffer } = require('node:buffer');
  const key = 'sb-example-auth-token-code-verifier', values = new Map([[key, JSON.stringify('synthetic-verifier/recovery')]]);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'HS256' })}.${encode({ sub: 'account-1', exp: Math.floor(Date.now() / 1000) + 3600 })}.synthetic`;
  const events = [];
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', {
    auth: { flowType: 'pkce', autoRefreshToken: false, persistSession: true, detectSessionInUrl: false,
      storage: { getItem: async (name) => values.get(name) ?? null, setItem: async (name, value) => { values.set(name, value); }, removeItem: async (name) => { values.delete(name); } } },
    global: { fetch: async () => new Response(JSON.stringify({ access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user: user() }), { status: 200, headers: { 'Content-Type': 'application/json' } }) },
  });
  const { data: subscription } = client.auth.onAuthStateChange((event) => { events.push(event); });
  const result = await client.auth.exchangeCodeForSession('synthetic-code');
  assert.equal(result.error, null); assert.equal(result.data.redirectType, 'recovery'); assert.ok(events.includes('PASSWORD_RECOVERY'));
  subscription.subscription.unsubscribe(); await client.auth.stopAutoRefresh();
});

test('timed-out restore is bounded and late results cannot authenticate the app', async () => {
  const timers = { ...globals, setTimeout: (callback, delay) => setTimeout(callback, delay === 25000 ? 5 : delay) };
  const Controller = load('src/auth/controller.ts', { './account': account }, timers).AccountController;
  const f = fixture({ session: session() }); let complete;
  f.api.getSession = () => new Promise((resolve) => { complete = resolve; });
  const controller = new Controller(f.api);
  await controller.start(); assert.equal(controller.getSnapshot().phase, 'error'); assert.equal(controller.getSnapshot().busy, false);
  complete({ data: { session: session() }, error: null });
  await new Promise((resolve) => setTimeout(resolve, 10));
  f.emit('SIGNED_IN', session()); await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(controller.getSnapshot().phase, 'error'); assert.equal(controller.getSnapshot().user, null);
  controller.dispose();
});

test('failed reset request does not show a sent-email confirmation', async () => {
  const auth = { phase: 'signed-out', user: null, configured: true, busy: false, error: 'Request failed', account: { clearError() {}, requestReset: async () => false } };
  const s = screen('ForgotScreen', { auth }); find(s, 'Email address').props.onChangeText('person@example.com');
  find(s, 'Send reset link').props.onPress(); await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(find(s, 'Send reset link')); assert.equal(find(s, 'Check your email'), undefined);
});

test('warm email callback arriving during restoration is handled after that request finishes', async () => {
  const f = fixture(); let complete;
  f.api.getSession = () => new Promise((resolve) => { complete = resolve; });
  const starting = f.controller.start();
  await f.controller.handleUrl('campusstay://auth/confirm?code=queued-confirmation');
  complete({ data: { session: null }, error: null }); await starting;
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(f.controller.getSnapshot().phase, 'authenticated');
  assert.equal(f.calls.filter(([name]) => name === 'exchange').length, 1);
});

test('malformed account links give recovery instructions without opening protected screens', async () => {
  const f = fixture(); await f.controller.start('campusstay://auth/confirm?error=expired');
  assert.equal(f.controller.getSnapshot().phase, 'error'); assert.match(f.controller.getSnapshot().error, /Request a new email/);
});
test('password-update success followed by sign-out failure is reported accurately', async () => {
  const f = fixture({ recovery: true, logoutError: new Error('offline') }); await f.controller.start('campusstay://auth/recovery?code=valid');
  assert.equal(await f.controller.updatePassword('new-password'), false);
  assert.equal(f.controller.getSnapshot().phase, 'recovery'); assert.match(f.controller.getSnapshot().error, /password was updated, but sign-out could not finish/);
});
test('manager preview requires both an explicitly enabled development build and authentication', () => {
  const enabled = screen('AccountScreens', { exportName: 'ManagerAccessScreen', development: true, managerPreview: 'true' });
  assert.ok(enabled.render().some((node) => node.type === 'ManagerScreen'));
  assert.ok(enabled.render().some((node) => node.type === 'Text' && /Development preview/.test(node.props.children)));
  const unavailable = screen('AccountScreens', { exportName: 'ManagerAccessScreen', development: true, managerPreview: 'true', auth: { phase: 'verification', error: '' } });
  assert.ok(!unavailable.render().some((node) => node.type === 'ManagerScreen'));
});
