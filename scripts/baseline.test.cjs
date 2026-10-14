const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual components with native modules mocked. These checks cover
// startup decisions and route callbacks; they do not claim device execution.
function renderComponent(file, { loaded = false, error = null, expired = false, props = {} } = {}) {
  const timers = [];
  const cleanups = [];
  const warnings = [];
  const stateUpdates = [];
  const react = {
    useState: () => [expired, (value) => stateUpdates.push(value)],
    useEffect: (effect) => {
      const cleanup = effect();
      if (cleanup) cleanups.push(cleanup);
    },
  };
  const jsx = (type, componentProps) => ({ type, props: componentProps });
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator',
      ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
      StyleSheet: { create: (styles) => styles },
    },
    'react-native-safe-area-context': {
      SafeAreaProvider: 'SafeAreaProvider',
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    },
    '@expo-google-fonts/outfit': { useFonts: () => [loaded, error] },
    '@expo-google-fonts/inter': {},
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer' },
    '@react-navigation/native-stack': {
      createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'StackScreen' }),
    },
    '@react-navigation/bottom-tabs': {
      createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'TabScreen' }),
    },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-image': { Image: 'Image' },
    '../components/UI': { Btn: 'Btn', Badge: 'Badge' },
  };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      if (name.endsWith('/bookings')) return require('./profile-harness.cjs').load('src/bookings.ts');
      if (name.endsWith('/theme')) {
        const themeModule = { exports: {} };
        const theme = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/theme.ts'), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText;
        vm.runInNewContext(theme, { exports: themeModule.exports });
        return themeModule.exports;
      }
      if (name.endsWith('/state/ApplicationContext')) {
        return {
          ApplicationProvider: 'ApplicationProvider',
          useApplications: () => ({ applications: [], getApplication: () => undefined }),
        };
      }
      if (name.includes('/screens/')) return { __esModule: true, default: () => null };
      return modules[name] || {};
    },
    console: { warn: (...args) => warnings.push(args) },
    setTimeout: (callback, delay) => {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => { timer.cleared = true; },
  }, { filename: file });
  return { tree: module.exports.default(props), timers, cleanups, warnings, stateUpdates };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  const children = [tree.props?.children].flat(Infinity);
  return [tree, ...children.flatMap(elements)];
}

const appPath = path.join(__dirname, '../App.tsx');
test('font loading renders a visible loader and has a bounded, cancellable wait', () => {
  const result = renderComponent(appPath);
  assert.ok(elements(result.tree).some((element) => element.type === 'ActivityIndicator'));
  assert.equal(result.timers.length, 1);
  assert.equal(result.timers[0].delay, 10000);
  result.timers[0].callback();
  assert.deepEqual(result.stateUpdates, [true]);
  result.cleanups.forEach((cleanup) => cleanup());
  assert.equal(result.timers[0].cleared, true);
});

for (const [name, state] of [
  ['loaded', { loaded: true }],
  ['failed', { error: new Error('Font failure') }],
  ['timed out', { expired: true }],
]) {
  test(`startup opens the student app when fonts are ${name}`, () => {
    const result = renderComponent(appPath, state);
    const navigator = elements(result.tree).find((element) => element.type === 'Stack');
    const screens = elements(result.tree).filter((element) => element.type === 'StackScreen');
    assert.equal(navigator.props.initialRouteName, 'Main');
    assert.deepEqual(screens.map((screen) => screen.props.name), [
      'Splash', 'Onboarding', 'Login', 'Register', 'Forgot', 'Main',
      'Property', 'Apply', 'AppStatus', 'Compare', 'Chat', 'Notifications',
      'PersonalInformation', 'MyDocuments', 'Security', 'HelpSupport', 'TermsPrivacy', 'Manager',
    ]);
    assert.equal(result.timers.length, 0);
    assert.equal(result.warnings.length, name === 'loaded' ? 0 : 1);
  });
}

test('status actions open the property and return to the Bookings tab', () => {
  const calls = [];
  const result = renderComponent(path.join(__dirname, '../src/screens/AppStatusScreen.tsx'), {
    props: {
      navigation: {
        goBack: () => {},
        navigate: (...args) => calls.push(['navigate', ...args]),
        popTo: (...args) => calls.push(['popTo', ...args]),
      },
      route: { params: { property: { name: 'Fixture', city: 'City', images: ['fixture'] }, sampleReference: '#FIXTURE', sampleRoom: 'Private Room', sampleStatus: 'Active' } },
    },
  });
  const buttons = elements(result.tree).filter((element) => element.type === 'Btn');
  assert.equal(buttons.length, 2);
  buttons.forEach((button) => button.props.onPress());
  assert.deepEqual(calls[0].slice(0, 2), ['navigate', 'Property']);
  assert.deepEqual(calls[1].slice(0, 2), ['popTo', 'Main']);
  assert.equal(calls[1][2].screen, 'Bookings');
});
