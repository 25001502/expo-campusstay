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
  vm.runInNewContext(compiled, { module, exports: module.exports, require: (name) => modules[name] ?? require(name), Date, Object, Number, String, Set, Math }, { filename: file });
  return module.exports;
}
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const data = load(path.join(root, 'src/data.ts'));
const manager = load(path.join(root, 'src/manager.ts'), { './data': data });
const initial = () => manager.createManagerState(data.properties);
const validFields = () => ({ name: 'Library Court', city: 'Pretoria', address: '10 College Road', university: 'up', description: 'Student accommodation near campus.', type: 'Residence', roomType: 'Private', roomPrice: '4100', roomAvailable: '5', amenities: 'Wi-Fi, Study Area' });

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
test('zero-property metrics are safe and zero', () => {
  const metrics = manager.getManagerMetrics({ properties: [], applications: [], tenants: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(metrics)), { totalProperties: 0, availableRooms: 0, occupiedRooms: 0, awaitingReview: 0, activeTenants: 0, occupancyRate: 0 });
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
  for (const key of ['name', 'city', 'address', 'university', 'description', 'roomType', 'roomPrice', 'roomAvailable']) assert.ok(errors[key]);
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
test('analytics occupancy matches dashboard occupancy', () => {
  const state = initial(); const rows = manager.getPropertyAnalytics(state); const occupied = rows.reduce((sum, row) => sum + row.occupied, 0); const available = rows.reduce((sum, row) => sum + row.available, 0);
  assert.equal(manager.getManagerMetrics(state).occupancyRate, Math.round((occupied / (occupied + available)) * 100));
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
test('confirmed logout replaces the student stack with Login', () => assert.match(source('src/screens/ProfileScreen.tsx'), /navigation\.replace\('Login'\)/));
test('Continue without signing in resets navigation to student Home', () => {
  const login = source('src/screens/LoginScreen.tsx'); assert.match(login, /Continue without signing in/); assert.match(login, /name: 'Main', params: \{ screen: 'Home' \}/);
});
test('fresh startup still opens Main directly', () => assert.match(source('App.tsx'), /initialRouteName="Main"/));
test('logout and continuation remove stale navigation history', () => {
  assert.match(source('src/screens/ProfileScreen.tsx'), /navigation\.replace\('Login'\)/);
  assert.match(source('src/screens/LoginScreen.tsx'), /navigation\.reset/);
});
test('manager implementation introduces no network or persistence APIs', () => {
  const combined = source('src/manager.ts') + source('src/screens/ManagerScreen.tsx'); assert.doesNotMatch(combined, /fetch\(|axios|AsyncStorage|SecureStore|supabase|firebase/i);
});
