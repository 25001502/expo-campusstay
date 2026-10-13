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
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => modules[name] ?? require(name),
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
  const screen = source('src/screens/ExploreScreen.tsx');
  assert.match(screen, /height \* 0\.55/);
  assert.match(screen, /nestedScrollEnabled/);
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
