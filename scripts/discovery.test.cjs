const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');

function loadTypeScriptModule(file, modules = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (name) => modules[name] ?? (name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), name) + '.ts') ? loadTypeScriptModule(path.resolve(path.dirname(file), name) + '.ts', modules) : require(name)),
    Set,
  }, { filename: file });
  return module.exports;
}

const data = loadTypeScriptModule(path.join(root, 'src/data.ts'));
const discovery = loadTypeScriptModule(path.join(root, 'src/discovery.ts'), { './data': data });
const ids = (items) => Array.from(items, (item) => item.id);
const defaults = () => discovery.createDefaultDiscoveryFilters();

test('shared favorites state toggles consistently for every consuming screen', () => {
  let state = ['p1', 'p3'];
  state = discovery.favoritesReducer(state, { type: 'toggle', id: 'p2' });
  assert.deepEqual(Array.from(state), ['p1', 'p3', 'p2']);
  state = discovery.favoritesReducer(state, { type: 'toggle', id: 'p1' });
  assert.deepEqual(Array.from(state), ['p3', 'p2']);
});

test('adding an existing favorite does not create a duplicate', () => {
  const state = discovery.favoritesReducer(['p1'], { type: 'add', id: 'p1' });
  assert.deepEqual(Array.from(state), ['p1']);
});

test('favorite removal prunes comparison selection and duplicate entries', () => {
  assert.deepEqual(Array.from(discovery.pruneComparisonSelection(['p1', 'p2', 'p2'], ['p1'])), ['p1']);
});

test('search matches property, city, university, and amenity fields', () => {
  for (const query of ['Varsity Heights', 'Johannesburg', 'Wits', 'Gym']) {
    assert.ok(ids(discovery.filterAndSortProperties(data.properties, { ...defaults(), query })).includes('p2'));
  }
});

test('maximum price filters numeric property prices', () => {
  assert.deepEqual(ids(discovery.filterAndSortProperties(data.properties, { ...defaults(), maximumPrice: 4000 })), ['p1', 'p5']);
});

test('Home quick filters map to supported property data', () => {
  assert.deepEqual(ids(discovery.filterAndSortProperties(data.properties, { ...defaults(), quickFilter: 'Near Campus' })), ['p1', 'p3', 'p4']);
  assert.deepEqual(ids(discovery.filterAndSortProperties(data.properties, { ...defaults(), quickFilter: 'Single Room' })), ['p1', 'p2', 'p3', 'p4', 'p5']);
});

test('amenity filters use AND matching', () => {
  assert.deepEqual(ids(discovery.filterAndSortProperties(data.properties, { ...defaults(), amenities: ['Gym', 'Parking'] })), ['p2']);
});

test('search, university, price, and amenities combine without discarding one another', () => {
  const result = discovery.filterAndSortProperties(data.properties, {
    ...defaults(), query: 'Student Village', universityId: 'stellenbosch', maximumPrice: 5000, amenities: ['Wi-Fi', 'Laundry'],
  });
  assert.deepEqual(ids(result), ['p3']);
});

test('sorting is deterministic and keeps source order for ties', () => {
  const tied = [
    { ...data.properties[1], price: 3500 },
    { ...data.properties[0], price: 3500 },
  ];
  assert.deepEqual(ids(discovery.filterAndSortProperties(tied, { ...defaults(), sort: 'price-low' })), ['p2', 'p1']);
  assert.equal(discovery.filterAndSortProperties(data.properties, { ...defaults(), sort: 'rating' })[0].id, 'p3');
  assert.equal(discovery.filterAndSortProperties(data.properties, { ...defaults(), sort: 'distance' })[0].id, 'p4');
});

test('clear-filter defaults reset every discovery control', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(defaults())), {
    query: '', maximumPrice: 10000, amenities: [], sort: 'recommended',
  });
});

test('university navigation context accepts only real university IDs', () => {
  assert.deepEqual({ ...discovery.createUniversityDiscoveryContext('uct') }, { universityId: 'uct' });
  assert.deepEqual({ ...discovery.createUniversityDiscoveryContext('missing') }, {});
});

test('room navigation resolves only a matching available room', () => {
  assert.equal(discovery.resolveSelectedRoom(data.properties[0], 'r2').id, 'r2');
  const unavailable = { ...data.properties[0], rooms: [{ ...data.properties[0].rooms[0], available: 0 }] };
  assert.equal(discovery.resolveSelectedRoom(unavailable, 'r1'), undefined);
  assert.equal(discovery.resolveSelectedRoom(data.properties[0], 'missing'), undefined);
});

test('comparison marks every tied best property', () => {
  const tied = [data.properties[0], { ...data.properties[1], price: data.properties[0].price }];
  assert.deepEqual(Array.from(discovery.getBestPropertyIds(tied, (property) => property.price, 'lower')).sort(), ['p1', 'p2']);
});

test('comparison ignores missing optional numeric values', () => {
  const partial = [{ id: 'missing', rating: undefined }, { id: 'valid', rating: 4.5 }];
  assert.deepEqual(Array.from(discovery.getBestPropertyIds(partial, (property) => property.rating, 'higher')), ['valid']);
});

