const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function load(file, modules = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }, fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: (name) => modules[name] ?? (name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), name) + '.ts') ? load(path.resolve(path.dirname(file), name) + '.ts', modules) : require(name)), Date, Object, Number, String, Set, Math }, { filename: file });
  return module.exports;
}
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const data = load(path.join(root, 'src/data.ts'));
const manager = load(path.join(root, 'src/manager.ts'), { './data': data });
const initial = () => manager.createManagerState(data.properties);
const validFields = () => ({ name: 'Library Court', city: 'Pretoria', address: '10 College Road', university: 'up', description: 'Student accommodation near campus.', type: 'Residence', roomType: 'Single', roomCapacity: '1', roomPrice: '4100', roomAvailable: '5', amenities: 'Wi-Fi, Study Area' });

test('manager primary and More navigation destinations are present', () => {
  const screen = source('src/screens/ManagerScreen.tsx');
  for (const label of ['Dashboard', 'Properties', 'Applications', 'More', 'Tenants', 'Analytics', 'Settings']) assert.match(screen, new RegExp(label));
});
test('dashboard metrics derive from the manager state', () => {
  const state = initial(); const metrics = manager.getManagerMetrics(state);
  assert.equal(metrics.totalProperties, state.properties.length);
  assert.equal(metrics.availableRooms, state.properties.flatMap((property) => property.rooms).reduce((sum, room) => sum + room.available, 0));
  assert.equal(metrics.activeTenants, state.tenants.length);
});
test('zero-property counts are safe; physical occupancy remains unrecorded', () => {
  const metrics = manager.getManagerMetrics({ properties: [], applications: [], tenants: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(metrics)), { totalProperties: 0, availableRooms: 0, occupiedRooms: null, awaitingReview: 0, activeTenants: 0, occupancyRate: null });
});
test('property search matches names, cities, and amenities', () => {
  const properties = initial().properties;
  assert.equal(manager.filterManagerProperties(properties, 'Campus View', 'all').length, 1);
  assert.ok(manager.filterManagerProperties(properties, 'Johannesburg', 'all').length);
  assert.ok(manager.filterManagerProperties(properties, 'Gym', 'all').length);
});
test('property availability filters use room totals', () => {
  const properties = initial().properties;
  assert.equal(manager.filterManagerProperties(properties, '', 'available').length, properties.length);
  assert.equal(manager.filterManagerProperties(properties, '', 'full').length, 0);
});
test('property creation validates every supported required field', () => {
  const errors = manager.validatePropertyForm(manager.emptyPropertyForm());
  for (const key of ['name', 'city', 'address', 'university', 'description', 'roomType', 'roomCapacity', 'roomPrice', 'roomAvailable']) assert.ok(errors[key]);
});
test('property creation accepts valid local data', () => assert.equal(Object.keys(manager.validatePropertyForm(validFields())).length, 0));
test('new properties receive stable sequence IDs', () => {
  assert.equal(manager.createManagerProperty(validFields(), 3).id, 'manager-property-3');
  assert.equal(manager.createManagerProperty(validFields(), 3).id, 'manager-property-3');
});
test('property editing preserves its stable ID', () => {
  const property = initial().properties[0]; const fields = manager.propertyToForm(property); fields.name = 'Updated Residence';
  const updated = manager.updateManagerProperty(property, fields);
  assert.equal(updated.id, property.id); assert.equal(updated.name, 'Updated Residence');
});
test('property editing does not mutate seed data', () => {
  const property = initial().properties[0]; const originalName = property.name; const fields = manager.propertyToForm(property); fields.name = 'Changed';
  manager.updateManagerProperty(property, fields); assert.equal(property.name, originalName);
});
test('new room IDs remain associated with their property', () => {
  const property = manager.createManagerProperty(validFields(), 4);
  assert.equal(property.rooms[0].id, 'manager-property-4-room-1');
});
test('room prices must be greater than zero', () => assert.ok(manager.validateRoomEdit({ price: '0', available: '1' }).price));
test('room availability rejects negative and fractional values', () => {
  assert.ok(manager.validateRoomEdit({ price: '4000', available: '-1' }).available);
  assert.ok(manager.validateRoomEdit({ price: '4000', available: '1.5' }).available);
});
test('room updates recalculate property availability and minimum price', () => {
  const property = initial().properties[0]; const updated = manager.updateManagerRoom(property, property.rooms[0].id, { price: '1000', available: '0' });
  assert.equal(updated.price, 1000); assert.equal(updated.available, updated.rooms.reduce((sum, room) => sum + room.available, 0));
});
test('application status filtering returns exact states', () => {
  const state = initial(); const result = manager.filterManagerApplications(state.applications, state.properties.map((property) => property.id), 'New');
  assert.ok(result.length); assert.ok(result.every((application) => application.status === 'New'));
});
test('manager application visibility is scoped to portfolio properties', () => {
  const state = initial(); const result = manager.filterManagerApplications(state.applications, ['p1'], 'All');
  assert.ok(result.every((application) => application.propertyId === 'p1'));
});
test('unrelated applications are excluded', () => {
  const state = initial(); const foreign = { ...state.applications[0], id: 'foreign', propertyId: 'p3' };
  assert.ok(!manager.filterManagerApplications([...state.applications, foreign], state.properties.map((property) => property.id), 'All').some((application) => application.id === 'foreign'));
});
test('unsupported approval actions cannot change application state', () => {
  const state = initial(); const next = manager.managerReducer(state, { type: 'approve-application', applicationId: 'ma-1' });
  assert.equal(next, state); assert.equal(next.applications[0].status, state.applications[0].status);
});
test('manager UI labels approval and rejection unavailable', () => {
  const screen = source('src/screens/ManagerScreen.tsx'); assert.match(screen, /Approve Unavailable/); assert.match(screen, /Reject Unavailable/);
});
test('tenant search filters names', () => {
  const state = initial(); const result = manager.filterManagerTenants(state.tenants, state.properties.map((property) => property.id), 'Luvuyo');
  assert.equal(result.length, 1); assert.equal(result[0].name, 'Luvuyo Mthembu');
});
test('tenant filtering preserves property association', () => {
  const state = initial(); const result = manager.filterManagerTenants(state.tenants, state.properties.map((property) => property.id), '', 'p2');
  assert.ok(result.length); assert.ok(result.every((tenant) => tenant.propertyId === 'p2'));
});
test('analytics and dashboard distinguish listed rooms, tenant records and unknown physical occupancy', () => {
  const state = initial(); const rows = manager.getPropertyAnalytics(state); const metrics = manager.getManagerMetrics(state);
  assert.equal(rows.reduce((sum, row) => sum + row.activeTenants, 0), metrics.activeTenants);
  assert.equal(rows.reduce((sum, row) => sum + row.available, 0), metrics.availableRooms);
  assert.equal(metrics.occupancyRate, null);
  assert.ok(rows.every((row) => row.occupied === null && row.occupancyRate === null));
});
test('analytics handles missing property and tenant data', () => assert.deepEqual(manager.getPropertyAnalytics({ properties: [], tenants: [] }), []));
test('manager state reset restores a predictable fresh state', () => {
  const base = initial(); const added = manager.managerReducer(base, { type: 'add-property', property: manager.createManagerProperty(validFields(), base.nextPropertySequence) });
  const reset = manager.managerReducer(added, { type: 'reset', state: initial() }); assert.equal(reset.properties.length, base.properties.length); assert.equal(reset.nextPropertySequence, 1);
});
test('manager exit replaces the stack with student Main', () => assert.match(source('src/screens/ManagerScreen.tsx'), /navigation\.replace\('Main'\)/));
test('manager work does not consume or clear Phase C student applications', () => {
  const screen = source('src/screens/ManagerScreen.tsx'); assert.doesNotMatch(screen, /useApplications|clearApplications/);
});
test('manager review notes do not confirm bookings or alter status', () => {
  const state = initial(); const status = state.applications[0].status; const next = manager.managerReducer(state, { type: 'save-review-note', applicationId: state.applications[0].id, note: 'Needs review' });
  assert.equal(next.reviewNotes[state.applications[0].id], 'Needs review'); assert.equal(next.applications[0].status, status);
});
test('duplicate property records are prevented', () => {
  const state = initial(); const next = manager.managerReducer(state, { type: 'add-property', property: state.properties[0] }); assert.equal(next, state);
});
test('Profile displays Log Out instead of Reset Local Activity', () => {
  const profile = source('src/screens/ProfileScreen.tsx'); assert.match(profile, />Log Out</); assert.doesNotMatch(profile, /Reset Local Activity/);
});
test('logout cancellation has no state-changing callback', () => {
  const profile = source('src/screens/ProfileScreen.tsx'); assert.match(profile, /\{ text: 'Cancel', style: 'cancel' \}/);
});
test('confirmed logout resets applications, favorites, messages, and notifications', () => {
  const profile = source('src/screens/ProfileScreen.tsx'); for (const call of ['clearApplications()', 'resetFavorites()', 'resetCommunication()']) assert.match(profile, new RegExp(call.replace(/[()]/g, '\\$&')));
});
test('confirmed logout signs out through the account gate', () => assert.match(source('src/screens/ProfileScreen.tsx'), /await auth.account.signOut\(\)/));

test('Login has no credential-free continuation', () => {
  const login = source('src/screens/LoginScreen.tsx'); assert.doesNotMatch(login, /Continue without signing in|navigation\.reset/);
});

test('fresh startup registers the signed-out Login navigator', () => assert.match(source('App.tsx'), /initialRouteName=\{auth\.intent === 'manager' \? 'ManagerLogin' : 'Login'\}/));

test('auth transitions replace the navigator instead of retaining stale public routes', () => {
  assert.match(source('App.tsx'), /auth.phase === 'authenticated' && auth.user/);
  assert.match(source('App.tsx'), /key=\{auth.user.id\}/);
});

test('manager implementation introduces no network or persistence APIs', () => {
  const combined = source('src/manager.ts') + source('src/screens/ManagerScreen.tsx'); assert.doesNotMatch(combined, /fetch\(|axios|AsyncStorage|SecureStore|supabase|firebase/i);
});

function dirtyManagerForm() {
  const { harness, elements } = require('./profile-harness.cjs');
  const screen = harness('src/screens/ManagerScreen.tsx');
  screen.render().find((node) => node.props.accessibilityLabel === 'Properties').props.onPress();
  let page = screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertiesPage');
  elements(page.type(page.props)).find((node) => node.type === 'Btn' && node.props.children === 'Add Property').props.onPress();
  page = screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertyForm');
  elements(page.type(page.props)).find((node) => node.type === 'Input' && node.props.label === 'Property name').props.onChangeText('Synthetic unsaved property');
  screen.render();
  return screen;
}
test('manager tab changes keep dirty property edits until explicit discard', () => {
  const screen = dirtyManagerForm();
  screen.render().find((node) => node.props.accessibilityLabel === 'Applications').props.onPress();
  assert.equal(screen.alerts.at(-1)[0], 'Discard unsaved changes?');
  const form = screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertyForm');
  assert.equal(form.props.fields.name, 'Synthetic unsaved property');
  assert.equal(screen.alerts.at(-1)[2][0].text, 'Keep editing');
  screen.alerts.at(-1)[2].find((button) => button.text === 'Discard').onPress();
  const nodes = screen.render();
  assert.ok(!nodes.some((node) => typeof node.type === 'function' && node.type.name === 'PropertyForm'));
  assert.ok(nodes.some((node) => typeof node.type === 'function' && node.type.name === 'ApplicationsPage'));
});
test('manager root removal protects dirty edits and dispatches only the confirmed action', () => {
  const screen = dirtyManagerForm(), action = { type: 'REPLACE', payload: { name: 'Main' } };
  assert.equal(screen.removal.enabled, true);
  screen.removal.callback({ data: { action } });
  assert.equal(screen.calls.length, 0);
  assert.equal(screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertyForm').props.fields.name, 'Synthetic unsaved property');
  screen.alerts.at(-1)[2].find((button) => button.text === 'Discard').onPress();
  assert.equal(screen.calls.at(-1).action, 'dispatch');
  assert.equal(screen.calls.at(-1).args[0], action);
});
test('an untouched manager property form still permits ordinary tab navigation without a dialog', () => {
  const { harness, elements } = require('./profile-harness.cjs');
  const screen = harness('src/screens/ManagerScreen.tsx');
  screen.render().find((node) => node.props.accessibilityLabel === 'Properties').props.onPress();
  const page = screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertiesPage');
  elements(page.type(page.props)).find((node) => node.type === 'Btn' && node.props.children === 'Add Property').props.onPress();
  assert.equal(screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertyForm').props.fields.name, '');
  assert.equal(screen.removal.enabled, false);
  screen.render().find((node) => node.props.accessibilityLabel === 'Applications').props.onPress();
  assert.equal(screen.alerts.length, 0);
  assert.ok(screen.render().some((node) => typeof node.type === 'function' && node.type.name === 'ApplicationsPage'));
});
