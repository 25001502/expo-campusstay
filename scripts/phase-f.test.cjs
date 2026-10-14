const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function load(file, modules = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => modules[name] ?? (name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), name) + '.ts') ? load(path.resolve(path.dirname(file), name) + '.ts', modules) : require(name)),
    Date,
    Object,
    Number,
    String,
    Set,
    Math,
  }, { filename: file });
  return module.exports;
}

const data = load(path.join(root, 'src/data.ts'));
const communication = load(path.join(root, 'src/communication.ts'));
const manager = load(path.join(root, 'src/manager.ts'), { './data': data });

test('property messaging resolves only the conversation linked to that property', () => {
  assert.equal(communication.getConversationForProperty(data.conversations, 'p1').id, 'c1');
  assert.equal(communication.getConversationForProperty(data.conversations, 'p2').id, 'c2');
  assert.equal(communication.getConversationForProperty(data.conversations, 'p3'), undefined);
  const screen = source('src/screens/PropertyScreen.tsx');
  assert.match(screen, /getConversationForProperty\(conversations, property\.id\)/);
  assert.doesNotMatch(screen, /convId: 'c1'/);
});

test('every manager tenant references a room belonging to its property', () => {
  const state = manager.createManagerState(data.properties);
  for (const tenant of state.tenants) {
    const property = state.properties.find((item) => item.id === tenant.propertyId);
    assert.ok(property, `missing property for ${tenant.id}`);
    assert.ok(property.rooms.some((room) => room.id === tenant.roomId), `missing room for ${tenant.id}`);
  }
});

test('manager property search recognizes full university names and abbreviations', () => {
  const properties = manager.createManagerState(data.properties).properties;
  assert.deepEqual(Array.from(manager.filterManagerProperties(properties, 'University of Venda', 'all'), (item) => item.id), ['p1']);
  assert.deepEqual(Array.from(manager.filterManagerProperties(properties, 'Wits', 'all'), (item) => item.id), ['p2']);
});

test('manager reducer rejects invalid room values even if an action bypasses the form', () => {
  const state = manager.createManagerState(data.properties);
  const room = state.properties[0].rooms[0];
  const negative = manager.managerReducer(state, { type: 'update-room', propertyId: state.properties[0].id, room: { ...room, available: -1 } });
  const invalidPrice = manager.managerReducer(state, { type: 'update-room', propertyId: state.properties[0].id, room: { ...room, price: 0 } });
  assert.equal(negative, state);
  assert.equal(invalidPrice, state);
});

test('onboarding uses live viewport dimensions and exposes its skip action', () => {
  const screen = source('src/screens/OnboardingScreen.tsx');
  assert.match(screen, /useWindowDimensions\(\)/);
  assert.doesNotMatch(screen, /Dimensions\.get/);
  assert.match(screen, /accessibilityLabel="Skip onboarding"/);
  assert.match(screen, /Apply with clarity/);
});

test('large text receives adaptive student and manager navigation height', () => {
  const app = source('App.tsx');
  assert.match(app, /tabBarHeight/);
  assert.match(app, /maxFontSizeMultiplier=\{1\.2\}/);
  const managerScreen = source('src/screens/ManagerScreen.tsx');
  assert.match(managerScreen, /fontScale >= 1\.5/);
  assert.match(managerScreen, /navigationHeight/);
  assert.match(managerScreen, /maxFontSizeMultiplier=\{1\.2\}/);
});

test('discovery filters remain scrollable on a constrained viewport', () => {
  const { harness, elements } = require('./profile-harness.cjs');
  const screen = harness('src/screens/ExploreScreen.tsx', { width: 320, height: 480, fontScale: 2 });
  let list = screen.render().find((node) => node.type === 'FlatList');
  elements(list.props.ListHeaderComponent).find((node) => node.type === 'IconButton' && node.props.icon === 'options-outline').props.onPress();
  list = screen.render().find((node) => node.type === 'FlatList');
  const header = elements(list.props.ListHeaderComponent);
  const panel = header.find((node) => node.props.testID === 'explore-filters');
  assert.equal(panel.type, 'View');
  assert.equal(panel.props.style.height, undefined);
  assert.equal(panel.props.style.maxHeight, undefined);
  assert.equal(header.filter((node) => node.type === 'ScrollView' && !node.props.horizontal).length, 0);
  assert.equal(header.filter((node) => node.type === 'ScrollView' && node.props.horizontal).length, 1);
  assert.equal(elements(panel).filter((node) => node.props.accessibilityLabel?.endsWith(' amenity')).length, 7);
  assert.equal(list.props.data.length, 5);
});

test('decorative remote-image states are hidden from accessibility services', () => {
  const component = source('src/components/RemoteImage.tsx');
  assert.match(component, /accessible=\{!decorative\}/);
  assert.match(component, /importantForAccessibility=\{decorative \? 'no-hide-descendants' : 'auto'\}/);
  assert.match(source('src/components/PropertyCard.tsx'), /<RemoteImage[\s\S]*?decorative/);
});

test('application status handles a missing reference instead of inventing one', () => {
  const screen = source('src/screens/AppStatusScreen.tsx');
  assert.match(screen, /missingReference/);
  assert.match(screen, /missing its reference information/);
  assert.doesNotMatch(screen, /sampleReference \?\? '#CS-20481'/);
});

test('login refinement preserves credential-free navigation and responsive keyboard handling', () => {
  const screen = source('src/screens/LoginScreen.tsx');
  assert.match(screen, /Continue without signing in/);
  assert.match(screen, /name: 'Main', params: \{ screen: 'Home' \}/);
  assert.match(screen, /useWindowDimensions/);
  assert.match(screen, /Math\.max\(insets\.bottom, Spacing\.lg\)/);
  assert.match(screen, /keyboardDismissMode="on-drag"/);
  assert.match(screen, /onSubmitEditing=\{submit\}/);
  assert.match(screen, /maxWidth: 520/);
  assert.match(screen, /Open manager workspace/);
});

function renderLogin(fields = { email: '', password: '' }) {
  const alerts = [];
  const routes = [];
  const updates = [];
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const screen = load(path.join(root, 'src/screens/LoginScreen.tsx'), {
    react: { useState: (initial) => [stateIndex++ === 0 ? fields : initial, (value) => updates.push(value)] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      Alert: { alert: (...args) => alerts.push(args) },
      Image: 'Image', KeyboardAvoidingView: 'KeyboardAvoidingView', ScrollView: 'ScrollView',
      Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View',
      Platform: { OS: 'android' }, StyleSheet: { create: (styles) => styles },
      useWindowDimensions: () => ({ height: 800, width: 360, fontScale: 1 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    '../components/UI': { Btn: 'Btn', Divider: 'Divider', Input: 'Input' },
    '../demoAuth': load(path.join(root, 'src/demoAuth.ts')),
    '../theme': load(path.join(root, 'src/theme.ts')),
    '../../assets/google-g.png': 'official-google-g',
  });
  const navigation = Object.fromEntries(['navigate', 'replace', 'reset'].map((action) => [action, (route) => routes.push({ action, route })]));
  const tree = screen.default({ navigation });
  const elements = (node) => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
  return { nodes: elements(tree), alerts, routes, updates };
}

test('login actions follow the requested hierarchy and omit the permanent information banner', () => {
  const { nodes } = renderLogin();
  const buttons = nodes.filter((node) => node.type === 'Btn');
  assert.deepEqual(buttons.map((node) => node.props.accessibilityLabel ?? node.props.children), [
    'Sign In', 'Sign in with Google', 'Continue without signing in',
  ]);
  const inputs = nodes.filter((node) => node.type === 'Input');
  assert.deepEqual(inputs.map((node) => node.props.label), ['Email address', 'Password']);
  assert.ok(nodes.indexOf(inputs[1]) < nodes.indexOf(buttons[0]));
  assert.ok(nodes.some((node) => node.props.children === 'Welcome back'));
  assert.ok(!nodes.some((node) => typeof node.props.children === 'string' && /Sign-in services are not connected/.test(node.props.children)));
});

test('the Google action includes a decorative official mark and an unambiguous accessible name', () => {
  const { nodes } = renderLogin();
  const icon = nodes.find((node) => node.type === 'Image');
  assert.equal(icon.props.source, 'official-google-g');
  assert.equal(icon.props.accessible, false);
  assert.equal(icon.props.importantForAccessibility, 'no-hide-descendants');
  assert.equal(icon.props.style.width, 20);
  assert.equal(icon.props.style.height, 20);
  const asset = fs.readFileSync(path.join(root, 'assets/google-g.png'));
  assert.equal(asset.subarray(1, 4).toString(), 'PNG');
  assert.ok(nodes.some((node) => node.type === 'Btn' && node.props.accessibilityLabel === 'Sign in with Google'));
});

test('invalid login retains field errors and never navigates or reports successful authentication', () => {
  const { nodes, alerts, routes, updates } = renderLogin();
  nodes.find((node) => node.type === 'Btn' && node.props.children === 'Sign In').props.onPress();
  assert.ok(updates[0].email);
  assert.ok(updates[0].password);
  assert.equal(alerts.length, 0);
  assert.equal(routes.length, 0);
});

test('valid login and keyboard submission explain unavailable authentication without navigating', () => {
  const { nodes, alerts, routes } = renderLogin({ email: 'student@example.com', password: 'secret' });
  nodes.find((node) => node.type === 'Btn' && node.props.children === 'Sign In').props.onPress();
  nodes.find((node) => node.type === 'Input' && node.props.label === 'Password').props.onSubmitEditing();
  assert.equal(alerts.length, 2);
  for (const [title, message] of alerts) {
    assert.equal(title, 'Sign-in unavailable');
    assert.match(message, /not connected.*not sent or stored/);
  }
  assert.equal(routes.length, 0);
});

test('Google sign-in gives truthful feedback and cannot authenticate or navigate', () => {
  const { nodes, alerts, routes } = renderLogin();
  nodes.find((node) => node.type === 'Btn' && node.props.accessibilityLabel === 'Sign in with Google').props.onPress();
  assert.equal(alerts[0][0], 'Google sign-in unavailable');
  assert.match(alerts[0][1], /not available/);
  assert.equal(routes.length, 0);
});

test('Login preserves Home stack reset, Forgot, Register, and confirmed manager entry callbacks', () => {
  const { nodes, alerts, routes } = renderLogin();
  nodes.find((node) => node.type === 'Btn' && node.props.children === 'Continue without signing in').props.onPress();
  assert.equal(routes[0].action, 'reset');
  assert.equal(routes[0].route.index, 0);
  assert.equal(routes[0].route.routes.length, 1);
  assert.equal(routes[0].route.routes[0].name, 'Main');
  assert.equal(routes[0].route.routes[0].params.screen, 'Home');
  for (const label of ['Forgot password', 'Create account', 'Open manager workspace']) {
    nodes.find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityLabel === label).props.onPress();
  }
  assert.deepEqual(routes.slice(1).map((entry) => entry.route), ['Forgot', 'Register']);
  alerts[0][2].find((button) => button.text === 'Open workspace').onPress();
  assert.deepEqual(routes.at(-1), { action: 'replace', route: 'Manager' });
});
