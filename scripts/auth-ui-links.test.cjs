const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { AndroidConfig } = require('@expo/config-plugins');
const { load, harness } = require('./profile-harness.cjs');
const account = load('src/auth/account.ts', {}, { URL });
const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const empty = { fullName: '', email: '', password: '', confirmPassword: '' };
const valid = { fullName: 'Synthetic Person', email: 'synthetic@example.com', password: 'synthetic pass', confirmPassword: 'synthetic pass' };
const screen = (name, options = {}) => harness(`src/screens/${name}.tsx`, options);
const field = (s, label) => s.render().find((n) => n.type === 'Input' && n.props.label === label);
const button = (s, label) => s.render().find((n) => n.type === 'Btn' && n.props.children === label);
const text = (s) => s.render().filter((n) => n.type === 'Text').map((n) => n.props.children).flat(Infinity).join(' ');
const style = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));

test('registration distinguishes every empty, malformed, short and mismatched field', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(account.validateAccountRegistration(empty))), {
    fullName: 'Enter your full name.', email: 'Enter your email address.', password: 'Use at least 8 characters.', confirmPassword: 'Confirm your password.',
  });
  for (const [patch, key, message] of [
    [{ fullName: '   ' }, 'fullName', 'Enter your full name.'],
    [{ email: '   ' }, 'email', 'Enter your email address.'],
    [{ email: 'invalid' }, 'email', 'Enter a valid email address.'],
    [{ password: '' }, 'password', 'Use at least 8 characters.'],
    [{ password: 'short' }, 'password', 'Use at least 8 characters.'],
    [{ confirmPassword: '' }, 'confirmPassword', 'Confirm your password.'],
    [{ confirmPassword: 'different' }, 'confirmPassword', 'Passwords do not match.'],
  ]) assert.equal(account.validateAccountRegistration({ ...valid, ...patch })[key], message);
  assert.equal(Object.keys(account.validateAccountRegistration(valid)).length, 0);
});

test('registration inline errors update as fields are corrected without erasing entered data', () => {
  const s = screen('RegisterScreen'); button(s, 'Create account').props.onPress();
  assert.equal(field(s, 'Confirm password').props.error, 'Confirm your password.');
  field(s, 'Email address').props.onChangeText('malformed');
  assert.equal(field(s, 'Email address').props.error, 'Enter a valid email address.');
  for (const [label, value] of [['Full name', valid.fullName], ['Email address', valid.email], ['Password', valid.password]]) {
    field(s, label).props.onChangeText(value); assert.equal(field(s, label).props.error, undefined);
  }
  field(s, 'Confirm password').props.onChangeText('different');
  assert.equal(field(s, 'Confirm password').props.error, 'Passwords do not match.');
  field(s, 'Confirm password').props.onChangeText(valid.confirmPassword);
  assert.equal(field(s, 'Confirm password').props.error, undefined);
  button(s, 'Create account').props.onPress();
  assert.equal(s.authCalls.length, 1); assert.equal(s.authCalls[0].name, 'register');
  assert.deepEqual(JSON.parse(JSON.stringify(s.authCalls[0].args[0])), valid);
  assert.equal(field(s, 'Email address').props.value, valid.email); assert.equal(s.calls.length, 0);
});

test('changing the original password also updates an already shown confirmation error', () => {
  const s = screen('RegisterScreen');
  for (const [label, value] of [['Full name', valid.fullName], ['Email address', valid.email], ['Password', 'first pass'], ['Confirm password', 'second pass']]) field(s, label).props.onChangeText(value);
  button(s, 'Create account').props.onPress(); assert.equal(s.authCalls.length, 0);
  assert.equal(field(s, 'Confirm password').props.error, 'Passwords do not match.');
  field(s, 'Password').props.onChangeText('second pass'); assert.equal(field(s, 'Confirm password').props.error, undefined);
});

test('repeated registration presses reach the real auth controller only once', async () => {
  const { AccountController } = load('src/auth/controller.ts', {}, { URL, setTimeout, clearTimeout });
  let finish, calls = 0;
  const controller = new AccountController({ signUp: () => { calls++; return new Promise((resolve) => { finish = resolve; }); } });
  const auth = { configured: true, busy: false, error: '', account: controller };
  const s = screen('RegisterScreen', { auth });
  for (const [label, value] of [['Full name', valid.fullName], ['Email address', valid.email], ['Password', valid.password], ['Confirm password', valid.confirmPassword]]) field(s, label).props.onChangeText(value);
  const submit = button(s, 'Create account').props.onPress; submit(); submit(); assert.equal(calls, 1);
  auth.busy = controller.getSnapshot().busy;
  assert.equal(button(s, 'Create account').props.loading, true);
  assert.ok(s.render().filter((n) => n.type === 'Input').every((n) => n.props.disabled));
  finish({ data: { user: null, session: null }, error: null }); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.getSnapshot().busy, false); assert.equal(controller.getSnapshot().phase, 'verification'); assert.equal(controller.getSnapshot().user, null);
  controller.dispose();
});

test('Sign In uses shared-account copy and keeps a masked placeholder and visibility control', () => {
  const s = screen('LoginScreen'); assert.ok(text(s).includes('Sign in to continue to CampusStay.'));
  const password = field(s, 'Password'); assert.equal(password.props.placeholder, '••••••••');
  assert.equal(password.props.secureTextEntry, true); assert.equal(password.props.passwordVisibilityToggle, true);
  assert.doesNotMatch(text(s), /Sign in to manage your accommodation|Guest Mode|Continue without/);
});

for (const label of ['Password', 'Confirm password']) test(`${label} uses the existing secure Input toggle and consistent error border`, () => {
  const registration = screen('RegisterScreen'); button(registration, 'Create account').props.onPress();
  const props = { ...field(registration, label).props, value: 'synthetic value' };
  const s = harness('src/components/UI.tsx', { exportName: 'Input', props });
  const input = () => s.render().find((n) => n.type === 'TextInput');
  const toggle = () => s.render().find((n) => n.props.label === 'Show password' || n.props.label === 'Hide password');
  assert.equal(input().props.secureTextEntry, true); assert.equal(input().props['aria-invalid'], true);
  assert.equal(input().props.accessibilityHint, `Error: ${props.error}`);
  assert.ok(s.render().some((n) => n.type === 'Text' && n.props.accessibilityRole === 'alert' && n.props.children === props.error));
  assert.ok(s.render().filter((n) => n.type === 'View').some((n) => style(n.props.style).borderColor === load('src/theme.ts').TextColors.danger));
  toggle().props.onPress(); assert.equal(input().props.secureTextEntry, false); assert.equal(toggle().props.label, 'Hide password');
  toggle().props.onPress(); assert.equal(input().props.secureTextEntry, true); assert.equal(input().props.value, 'synthetic value');
});

for (const width of [320, 375, 411]) for (const fontScale of [1, 1.3, 2]) test(`Create Account footer responds at ${width}dp / ${fontScale} with stable reading order`, () => {
  const s = screen('RegisterScreen', { width, fontScale }); const nodes = s.render();
  assert.ok(text(s).includes('One account, more possibilities'));
  assert.ok(text(s).includes('Find student accommodation or apply to list your property with CampusStay.'));
  assert.doesNotMatch(text(s), /Manager access requires separate approval/);
  const prompt = nodes.find((n) => n.type === 'Text' && n.props.children === 'Already have an account?');
  const linkText = nodes.find((n) => n.type === 'Text' && n.props.children === 'Back to sign in');
  const row = nodes.find((n) => n.type === 'View' && Array.isArray(n.props.children) && n.props.children[0] === prompt);
  const link = row.props.children[1];
  assert.ok(nodes.indexOf(prompt) < nodes.indexOf(linkText));
  assert.equal(style(row.props.style).flexWrap, 'wrap');
  assert.equal(style(row.props.style).flexDirection, fontScale >= 1.3 || width < 360 ? 'column' : 'row');
  assert.ok(style(link.props.style).minHeight >= 44); assert.equal(linkText.props.numberOfLines, undefined);
  assert.equal(linkText.props.maxFontSizeMultiplier, undefined); assert.equal(style(prompt.props.style).textAlign, 'center');
  link.props.onPress(); assert.deepEqual(s.calls[0], { action: 'popTo', args: ['Login'] });
});

test('Forgot Password uses existing key icon, shared email placeholder and the same keyboard layout', async () => {
  const s = screen('ForgotScreen', { width: 320, fontScale: 2, insets: { top: 24, bottom: 34, left: 12, right: 12 } });
  assert.ok(text(s).includes("Enter the email address linked to your CampusStay account. We'll send you a link to reset your password."));
  assert.doesNotMatch(text(s), /🔔/);
  assert.ok(s.render().some((n) => n.type === 'Ionicons' && n.props.name === 'key-outline' && n.props.importantForAccessibility === 'no-hide-descendants'));
  const email = field(s, 'Email address'); assert.equal(email.props.placeholder, 'you@example.com'); assert.equal(email.props.keyboardType, 'email-address');
  const form = s.render().find((n) => n.type === 'KeyboardForm');
  assert.equal(style(form.props.contentContainerStyle).flexGrow, 1); assert.equal(s.render().filter((n) => n.type === 'KeyboardForm').length, 1);
  email.props.onChangeText('synthetic@example.com'); button(s, 'Send reset link').props.onPress(); await new Promise((resolve) => setImmediate(resolve));
  assert.match(text(s), /If an account is eligible for password recovery/); assert.doesNotMatch(text(s), /account exists|account does not exist/);
});

test('Expo source configuration generates a valid custom scheme while retaining the launcher and keyboard mode', () => {
  assert.equal(config.scheme, 'campusstay'); assert.equal(config.android.package, 'com.campusstay.app');
  const manifest = { manifest: { application: [{ activity: [{ $: { 'android:name': '.MainActivity', 'android:launchMode': 'singleTask', 'android:windowSoftInputMode': 'adjustResize', 'android:exported': 'true' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }], category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }] }] }] }] } };
  const next = AndroidConfig.Scheme.setScheme({ scheme: config.scheme }, manifest);
  assert.deepEqual(AndroidConfig.Scheme.getSchemesFromManifest(next), ['campusstay']);
  const activity = next.manifest.application[0].activity[0];
  assert.equal(activity.$['android:windowSoftInputMode'], 'adjustResize');
  assert.ok(activity['intent-filter'].some((f) => f.category.some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER')));
  for (const uri of [account.AUTH_REDIRECT, account.RECOVERY_REDIRECT]) {
    assert.equal(new URL(uri).protocol, `${config.scheme}:`); assert.ok(account.parseAuthCallback(`${uri}?code=synthetic-code`));
  }
});

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
test('generated Android manifest exposes the callback scheme to the installed Expo CLI reader', { skip: !fs.existsSync(manifestPath) && 'Generated Android project is absent; source config generation is tested separately.' }, async () => {
  const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath);
  const activity = manifest.manifest.application[0].activity.find((a) => a.$['android:name'] === '.MainActivity');
  const filter = activity['intent-filter'].find((f) => f.data?.some((d) => d.$['android:scheme'] === config.scheme));
  assert.ok(filter); assert.equal(activity.$['android:launchMode'], 'singleTask');
  for (const category of ['DEFAULT', 'BROWSABLE']) assert.ok(filter.category.some((c) => c.$['android:name'] === `android.intent.category.${category}`));
  assert.ok(filter.action.some((a) => a.$['android:name'] === 'android.intent.action.VIEW'));
  const cliPackage = require.resolve('@expo/cli/package.json', { paths: [require.resolve('expo/package.json')] });
  const { getSchemesForAndroidAsync } = require(path.join(path.dirname(cliPackage), 'build/src/utils/scheme.js'));
  assert.deepEqual(await getSchemesForAndroidAsync(process.cwd()), ['campusstay']);
});

test('the existing Expo entry adds its dev-tools wrapper only outside production', () => {
  for (const mode of ['production', 'development']) {
    let wrapped = 0, registered;
    const App = () => null;
    const module = load('node_modules/expo/src/launch/registerRootComponent.tsx', {
      '../Expo.fx': {},
      'react-native': { Platform: { OS: 'android' }, AppRegistry: { registerComponent: (_name, factory) => { registered = factory(); } } },
      './withDevTools': { withDevTools: (component) => { wrapped++; return { component }; } },
    }, { process: { env: { NODE_ENV: mode } } });
    module.default(App); assert.equal(wrapped, mode === 'production' ? 0 : 1);
    if (mode === 'production') assert.equal(registered, App);
  }
});
