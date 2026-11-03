const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual components with native modules mocked. These checks cover
// startup decisions and route callbacks; they do not claim device execution.
function renderComponent(file, { loaded = false, error = null, expired = false, authenticated = true, props = {}, dimensions = { width: 411, height: 900, fontScale: 1 }, insets = { top: 0, bottom: 0, left: 0, right: 0 }, unreadMessageCount = 0 } = {}) {
  const timers = [];
  const cleanups = [];
  const warnings = [];
  const stateUpdates = [];
  const react = {
    useCallback: (callback) => callback,
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
    'react-native': { useWindowDimensions: () => dimensions,
      View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator',
      ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
      StyleSheet: { create: (styles) => styles },
    },
    'react-native-safe-area-context': {
      SafeAreaProvider: 'SafeAreaProvider',
      useSafeAreaInsets: () => insets,
    },
    '@expo-google-fonts/outfit': { useFonts: () => [loaded, error] },
    '@expo-google-fonts/inter': {},
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer', useFocusEffect: () => {} },
    '@react-navigation/native-stack': {
      createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'StackScreen' }),
    },
    '@react-navigation/bottom-tabs': {
      createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'TabScreen' }),
    },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-image': { Image: 'Image' },
    '@fortawesome/react-native-fontawesome': { FontAwesomeIcon: 'FontAwesomeIcon' },
    '@fortawesome/free-solid-svg-icons': Object.fromEntries(['faHouse', 'faMagnifyingGlass', 'faHeart', 'faClipboard', 'faComments', 'faUser'].map((name) => [name, name])),
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
      if (name.endsWith('/errors')) return { reportDiagnostic: (...args) => warnings.push(args) };
      if (name.endsWith('/AppErrorBoundary')) return { AppErrorBoundary: 'AppErrorBoundary' };
      if (name.endsWith('/routeProperty')) return require('./profile-harness.cjs').load('src/navigation/routeProperty.ts');
      if (name === '../data') return require('./profile-harness.cjs').data;
      if (name.endsWith('/funding')) return require('./profile-harness.cjs').load('src/funding.ts');
      if (name.endsWith('/bookings')) return require('./profile-harness.cjs').load('src/bookings.ts');
      if (name.endsWith('/theme')) {
        const themeModule = { exports: {} };
        const theme = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/theme.ts'), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText;
        vm.runInNewContext(theme, { exports: themeModule.exports });
        return themeModule.exports;
      }
      if (name.endsWith('/state/CommunicationContext')) return { CommunicationProvider: 'CommunicationProvider', useCommunication: () => ({ unreadMessageCount }) };
      if (name.endsWith('/state/AuthContext')) return { AuthProvider: 'AuthProvider', useAuth: () => ({ phase: authenticated ? 'authenticated' : 'signed-out', user: authenticated ? { id: 'verified-test-user' } : null, onboarded: true, intent: 'student' }) };
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
  if (typeof tree.type === 'function' && ['AccountNavigation', 'StudentExperience'].includes(tree.type.name)) return elements(tree.type(tree.props));
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
  test(`startup opens the account gate when fonts are ${name}`, () => {
    const result = renderComponent(appPath, { ...state, authenticated: false });
    const navigator = elements(result.tree).find((element) => element.type === 'Stack');
    const screens = elements(result.tree).filter((element) => element.type === 'StackScreen');
    assert.equal(navigator.props.initialRouteName, 'Login');
    assert.deepEqual(screens.map((screen) => screen.props.name), [
      'Login', 'Register', 'ManagerLogin', 'ManagerRegister', 'Forgot', 'Onboarding', 'Splash',
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
      route: { params: { property: require('./profile-harness.cjs').data.properties[0], sampleReference: '#FIXTURE', sampleRoom: 'Private Room', sampleStatus: 'Active' } },
    },
  });
  const buttons = elements(result.tree).filter((element) => element.type === 'Btn');
  assert.equal(buttons.length, 2);
  buttons.forEach((button) => button.props.onPress());
  assert.deepEqual(calls[0].slice(0, 2), ['navigate', 'Property']);
  assert.deepEqual(calls[1].slice(0, 2), ['popTo', 'Main']);
  assert.equal(calls[1][2].screen, 'Bookings');
});

test('actual student tab configuration keeps every inactive label legible on white', () => {
  const result = renderComponent(appPath, { loaded: true });
  const main = elements(result.tree).find((element) => element.type === 'StackScreen' && element.props.name === 'Main');
  const tabs = main.props.component();
  const options = tabs.props.screenOptions;
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((v) => parseInt(v,16) / 255)
      .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const a = luminance(options.tabBarInactiveTintColor), b = luminance(options.tabBarStyle.backgroundColor);
  assert.ok((Math.max(a,b) + .05) / (Math.min(a,b) + .05) >= 4.5);
  assert.equal(elements(tabs).filter((element) => element.type === 'TabScreen').length, 6);
});

function studentTabs(options = {}) {
  const result = renderComponent(appPath, { loaded: true, ...options });
  return elements(result.tree).find((node) => node.type === 'StackScreen' && node.props.name === 'Main').props.component();
}
const studentNames = ['Home', 'Explore', 'Favorites', 'Bookings', 'Messages', 'Profile'];
// Read advance widths from the actual bundled face, without a new dependency.
// This is a conservative fit check (no kerning), not a native text-layout test.
function tabTextWidth(text, fontSize, focused) {
  const face = focused ? 'Inter_600SemiBold' : 'Inter_500Medium';
  const font = fs.readFileSync(require.resolve(`@expo-google-fonts/inter/${face}.ttf`));
  const u16 = (offset) => font.readUInt16BE(offset);
  const u32 = (offset) => font.readUInt32BE(offset);
  const tables = {};
  for (let i = 0; i < u16(4); i++) {
    const offset = 12 + 16 * i;
    tables[font.toString('ascii', offset, offset + 4)] = u32(offset + 8);
  }
  const cmap = tables.cmap;
  let mapping;
  for (let i = 0; i < u16(cmap + 2); i++) {
    const offset = cmap + u32(cmap + 8 + 8 * i);
    if (u16(offset) === 12) { mapping = offset; break; }
  }
  assert.ok(mapping, 'Bundled Inter exposes a Unicode character map');
  let advance = 0;
  for (const letter of text) {
    const code = letter.codePointAt(0);
    let glyph;
    for (let i = 0; i < u32(mapping + 12); i++) {
      const offset = mapping + 16 + 12 * i;
      if (code >= u32(offset) && code <= u32(offset + 4)) {
        glyph = u32(offset + 8) + code - u32(offset); break;
      }
    }
    assert.notEqual(glyph, undefined);
    advance += u16(tables.hmtx + 4 * Math.min(glyph, u16(tables.hhea + 34) - 1));
  }
  return advance * fontSize / u16(tables.head + 18);
}
for (const width of [320, 375, 390, 393, 411, 414, 430, 480, 800]) {
  for (const fontScale of [1, 1.3, 2]) {
    test(`student tab labels retain full names and room for scaled text at ${width}dp/${fontScale}`, () => {
      const tabs = studentTabs({ dimensions: { width, height: width < 800 ? 569 : 1280, fontScale } });
      const options = tabs.props.screenOptions;
      assert.equal(options.tabBarAllowFontScaling, true);
      assert.equal(options.tabBarLabelPosition, 'below-icon');
      assert.equal(options.tabBarItemStyle.flex, 1);
      assert.equal(options.tabBarItemStyle.minWidth, 0);
      const screens = elements(tabs).filter((node) => node.type === 'TabScreen');
      assert.deepEqual(screens.map((node) => node.props.name), studentNames);
      for (const screen of screens) {
        const name = screen.props.name;
        assert.equal(screen.props.options.tabBarAccessibilityLabel, name);
        const label = options.tabBarLabel({ color: '#2563EB', focused: true, children: name, position: 'below-icon' });
        assert.equal(label.props.children.replace(/\u200b/g, ''), name);
        assert.equal(label.props.allowFontScaling, true);
        assert.equal(label.props.accessible, false); // The tab owns the full spoken name/selection.
        assert.equal(label.props.style.textAlign, 'center');
        assert.equal(label.props.style.fontSize, 11);
        assert.equal(label.props.style.includeFontPadding, false);
        assert.equal(label.props.style.lineHeight, undefined, 'Native metrics respect the font cap at 200%');
        assert.ok(label.props.maxFontSizeMultiplier > 1.2);
        assert.equal(label.props.textBreakStrategy, 'balanced');
        assert.equal(label.props.numberOfLines, fontScale === 1 || width / 6 - 2 >= 55 * Math.min(fontScale, 1.5) ? 1 : 2);
        assert.equal(label.props.style.width, width / screens.length - 2);
        const scale = Math.min(fontScale, label.props.maxFontSizeMultiplier);
        const labelHeight = 14 * scale * label.props.numberOfLines;
        assert.ok(options.tabBarStyle.height - options.tabBarStyle.paddingBottom >= 28 + labelHeight + 13);
        for (const focused of [false, true]) {
          const rendered = options.tabBarLabel({ color: '#2563EB', focused, children: name });
          const parts = rendered.props.children.split('\u200b');
          const fitScale = rendered.props.adjustsFontSizeToFit ? rendered.props.minimumFontScale : 1;
          for (const part of parts) {
            assert.ok(tabTextWidth(part, rendered.props.style.fontSize * scale * fitScale, focused) <= rendered.props.style.width,
              `${name} fits its own tab at ${width}dp/${fontScale}, focused=${focused}`);
          }
          if (parts.length === 2) assert.ok(Math.min(...parts.map((part) => part.length)) >= 3, 'No orphan trailing letter');
        }
        assert.ok(width / screens.length >= 44);
        const icon = screen.props.options.tabBarIcon({ color: '#2563EB', size: 25 });
        assert.equal(icon.props.importantForAccessibility, 'no-hide-descendants');
        const fa = elements(icon).find((node) => node.type === 'FontAwesomeIcon');
        assert.equal(fa.props.size, 25);
      }
    });
  }
}
test('student tabs retain icons, unread names and font-weight selection without text underlines', () => {
  const tabs = studentTabs({ unreadMessageCount: 2 });
  const screens = elements(tabs).filter((node) => node.type === 'TabScreen');
  assert.deepEqual(screens.map((node) => elements(node.props.options.tabBarIcon({ color: '#2563EB', size: 25 })).find((icon) => icon.type === 'FontAwesomeIcon').props.icon), ['faHouse', 'faMagnifyingGlass', 'faHeart', 'faClipboard', 'faComments', 'faUser']);
  const messages = screens.find((node) => node.props.name === 'Messages');
  assert.equal(messages.props.options.tabBarBadge, 2);
  assert.equal(messages.props.options.tabBarAccessibilityLabel, 'Messages, 2 unread messages');
  const options = tabs.props.screenOptions;
  for (const name of studentNames) {
    const active = options.tabBarLabel({ color: options.tabBarActiveTintColor, focused: true, children: name, position: 'below-icon' });
    const inactive = options.tabBarLabel({ color: options.tabBarInactiveTintColor, focused: false, children: name, position: 'below-icon' });
    assert.equal(active.props.style.textDecorationLine, undefined, `${name} selected label has no underline`);
    assert.equal(inactive.props.style.textDecorationLine, undefined);
    assert.equal(active.props.style.color, '#2563EB');
    assert.notEqual(active.props.style.color, inactive.props.style.color);
    assert.notEqual(active.props.style.fontFamily, inactive.props.style.fontFamily);
    assert.deepEqual(
      { ...active.props.style, color: undefined, fontFamily: undefined },
      { ...inactive.props.style, color: undefined, fontFamily: undefined },
      `${name} selection preserves label alignment`,
    );
  }
});
test('student tab geometry reserves device safe areas without changing nested routes', () => {
  for (const bottom of [0, 24, 48]) {
    const tabs = studentTabs({ dimensions: { width: 800, height: 400, fontScale: 2 }, insets: { top: 24, bottom, left: 32, right: 16 } });
    const options = tabs.props.screenOptions;
    assert.equal(options.tabBarStyle.paddingBottom, bottom);
    assert.equal(options.tabBarStyle.paddingTop, 0);
    const label = options.tabBarLabel({ color: '#2563EB', focused: true, children: 'Messages', position: 'beside-icon' });
    assert.equal(options.tabBarLabelPosition, 'below-icon');
    assert.equal(label.props.style.width + 2, (800 - 64) / 6);
    assert.equal(label.props.style.marginHorizontal, -4);
    assert.equal(label.props.style.marginStart, undefined);
    assert.equal(options.tabBarStyle.position, undefined); // Navigator reserves layout space; no content overlay.
    assert.ok(!elements(tabs).some((node) => node.type === 'TabScreen' && node.props.name === 'Manager'));
    assert.ok(!elements(tabs).some((node) => node.type === 'TabScreen' && node.props.listeners));
  }
});

test('standard-size student tab bar stays compact and adds only the actual bottom inset', () => {
  for (const bottom of [0, 24, 34, 48]) {
    const options = studentTabs({ insets: { top: 0, bottom, left: 0, right: 0 } }).props.screenOptions;
    assert.equal(options.tabBarStyle.height, 56 + bottom);
    assert.equal(options.tabBarStyle.paddingBottom, bottom);
  }
  const screens = elements(studentTabs()).filter((node) => node.type === 'TabScreen');
  assert.equal(screens.find((node) => node.props.name === 'Messages').props.options.tabBarBadge, undefined);
});
test('registered student routes tolerate repeated tab switches with the real tab router', () => {
  const { TabRouter, TabActions } = require('@react-navigation/routers');
  const router = TabRouter({ initialRouteName: 'Home' });
  const screens = elements(studentTabs()).filter((node) => node.type === 'TabScreen');
  const config = { routeNames: screens.map((node) => node.props.name), routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(config);
  const keys = state.routes.map((route) => route.key);
  for (let repeat = 0; repeat < 3; repeat++) for (const name of studentNames) {
    state = router.getStateForAction(state, TabActions.jumpTo(name), config);
    assert.equal(state.routes[state.index].name, name);
    assert.deepEqual(state.routes.map((route) => route.key), keys);
  }
});
