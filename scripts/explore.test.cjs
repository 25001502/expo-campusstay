// Screen callbacks and selectors with native modules stubbed, not device execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { harness, elements, load, data } = require('./profile-harness.cjs');
const discovery = load('src/discovery.ts', { './data': data });
const screen = (options) => harness('src/screens/ExploreScreen.tsx', options);
const list = (result) => result.render().find((node) => node.type === 'FlatList');
const header = (result) => elements(list(result).props.ListHeaderComponent);
const named = (nodes, label) => nodes.find((node) => (node.props.accessibilityLabel ?? node.props.label) === label);
const toggle = (result) => header(result).find((node) => node.type === 'IconButton' && node.props.icon === 'options-outline');
const expand = (result) => toggle(result).props.onPress();
const slider = (result) => header(result).find((node) => node.type === 'Slider');
const button = (result, text) => header(result).find((node) => node.type === 'Btn' && node.props.children === text);
const ids = (records) => Array.from(records, (record) => record.id);
const matches = (result) => ids(list(result).props.data);
const select = (result, amenity) => named(header(result), `${amenity} amenity`).props.onPress();
const sort = (result, label) => named(header(result), `Sort by ${label}`).props.onPress();
const input = (result) => named(header(result), 'Search accommodation');
const copy = (nodes) => nodes.filter((node) => node.type === 'Text').map((node) => [node.props.children].flat(Infinity).join('')).join('\n');
const style = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const pure = (source, filters = {}) => discovery.filterAndSortProperties(source, { ...discovery.createDefaultDiscoveryFilters(), ...filters });

test('filters expand and collapse with the actual button expanded state', () => {
  const result = screen(); assert.equal(slider(result), undefined); assert.equal(toggle(result).props.expanded, false);
  expand(result); assert.ok(slider(result)); assert.equal(toggle(result).props.expanded, true);
  expand(result); assert.equal(slider(result), undefined); assert.equal(toggle(result).props.expanded, false);
});
test('the shared IconButton forwards expanded state without changing unrelated button semantics', () => {
  for (const expanded of [true, false, undefined]) {
    const nodes = harness('src/components/UI.tsx', { exportName: 'IconButton', props: { icon: 'options-outline', label: 'Filters', expanded, selected: true } }).render();
    const button = nodes.find((node) => node.type === 'TouchableOpacity');
    assert.equal(button.props.accessibilityState.expanded, expanded); assert.equal(button.props.accessibilityState.selected, true);
    if (expanded === undefined) assert.equal(Object.hasOwn(button.props.accessibilityState, 'expanded'), false);
  }
});
test('collapse and reopening retain price, amenities, sort and Home query/context', () => {
  const result = screen({ params: { query: 'Wits', universityId: 'wits', quickFilter: 'Wi-Fi' } });
  expand(result); slider(result).props.onValueChange(6000); select(result, 'Parking'); sort(result, 'Price: High');
  const before = matches(result); expand(result); expand(result);
  assert.equal(slider(result).props.value, 6000); assert.equal(named(header(result), 'Parking amenity').props.accessibilityState.selected, true);
  assert.equal(named(header(result), 'Sort by Price: High').props.accessibilityState.selected, true);
  assert.equal(input(result).props.value, 'Wits'); assert.equal(result.route.params.universityId, 'wits'); assert.deepEqual(matches(result), before);
});
test('Show results collapses immediately applied filters and returns to a sensible list origin', () => {
  const result = screen(); expand(result); select(result, 'Gym');
  assert.deepEqual(matches(result), ['p2', 'p4']); button(result, 'Show 2').props.onPress();
  assert.equal(toggle(result).props.expanded, false); assert.deepEqual(matches(result), ['p2', 'p4']);
  const current = list(result); const calls = []; current.props.ref.current = { scrollToOffset: (value) => calls.push(value) };
  toggle(result).props.onPress(); // Opening retains the scroll position.
  assert.ok(slider(result));
  const rendered = list(result); rendered.props.ref.current = { scrollToOffset: (value) => calls.push(value) };
  elements(rendered.props.ListHeaderComponent).find((node) => node.type === 'Btn' && node.props.children === 'Show 2').props.onPress();
  assert.equal(calls.length, 1); assert.equal(calls[0].offset, 0); assert.equal(calls[0].animated, false);
});
test('price defaults and accessible bounds match the existing slider contract', () => {
  const result = screen(); expand(result); const value = slider(result).props;
  assert.equal(value.value, 10000); assert.equal(value.minimumValue, 1000); assert.equal(value.maximumValue, 10000); assert.equal(value.step, 500);
  assert.equal(value.accessibilityLabel, 'Maximum monthly price'); assert.equal(value.accessibilityValue.now, 10000);
  assert.equal(value.accessibilityValue.text, 'R10,000 per month'); assert.match(copy(header(result)), /Maximum price: R10,000\/month/);
});
test('price adjustment immediately filters listing prices rather than cheaper room prices', () => {
  const result = screen(); expand(result); slider(result).props.onValueChange(4000);
  assert.deepEqual(matches(result), ['p1', 'p5']); assert.equal(slider(result).props.accessibilityValue.now, 4000);
  assert.match(copy(header(result)), /Maximum price: R4,000\/month/);
  assert.ok(data.properties.some((property) => property.price > 4000 && property.rooms.some((room) => room.price <= 4000)));
});
test('slider bounds clamp and snap finite values, ignoring invalid callbacks', () => {
  const result = screen(); expand(result);
  for (const [value, expected] of [[-50, 1000], [15000, 10000], [5234, 5000], [5751, 6000], [NaN, 6000], [Infinity, 6000], [undefined, 6000]]) {
    slider(result).props.onValueChange(value); assert.equal(slider(result).props.value, expected);
  }
  assert.equal(discovery.normalizeMaximumPrice(NaN, NaN), 10000);
});
test('every displayed amenity exists in supplied data and toggles without duplicate entries', () => {
  const result = screen(); expand(result);
  for (const node of header(result).filter((item) => item.props.accessibilityLabel?.endsWith(' amenity'))) {
    const amenity = node.props.accessibilityLabel.replace(/ amenity$/, ''); assert.ok(data.properties.some((property) => property.amenities.includes(amenity)));
    select(result, amenity); assert.equal(named(header(result), `${amenity} amenity`).props.accessibilityState.selected, true);
    assert.ok(list(result).props.data.every((property) => property.amenities.includes(amenity)));
    select(result, amenity); assert.equal(named(header(result), `${amenity} amenity`).props.accessibilityState.selected, false);
    assert.equal(list(result).props.data.length, 5);
  }
});
test('multiple amenities use AND logic, not OR or fabricated Furnished amenity keys', () => {
  const result = screen(); expand(result); select(result, 'Gym'); select(result, 'Parking');
  assert.deepEqual(matches(result), ['p2']); select(result, 'Study Area'); select(result, 'Laundry');
  assert.deepEqual(matches(result), ['p2']); assert.equal(named(header(result), 'Furnished amenity'), undefined);
  assert.equal(pure(data.properties, { amenities: ['unknown'] }).length, 0);
  assert.deepEqual(ids(pure(data.properties, { amenities: ['Gym', 'Gym'] })), ['p2', 'p4']);
});
test('search combines with amenities and price instead of replacing either criterion', () => {
  const result = screen(); expand(result); select(result, 'Gym'); input(result).props.onChangeText('Wits');
  assert.deepEqual(matches(result), ['p2']); slider(result).props.onValueChange(5000); assert.deepEqual(matches(result), []);
  slider(result).props.onValueChange(5500); assert.deepEqual(matches(result), ['p2']);
});
test('Home query and university context survive typing and filter changes', () => {
  const result = screen({ params: { query: 'Student', universityId: 'stellenbosch' } });
  assert.equal(input(result).props.value, 'Student'); assert.deepEqual(matches(result), ['p3']);
  expand(result); select(result, 'Wi-Fi'); input(result).props.onChangeText('Cape Town'); assert.deepEqual(matches(result), []);
  assert.equal(result.route.params.universityId, 'stellenbosch');
});
test('clear filters resets only price and amenities, preserving query, university, quick filter and sort', () => {
  const result = screen({ params: { query: 'Wits', universityId: 'wits', quickFilter: 'Wi-Fi' } });
  expand(result); slider(result).props.onValueChange(1000); select(result, 'Parking'); sort(result, 'Highest Rated');
  button(result, 'Clear filters').props.onPress(); assert.equal(slider(result).props.value, 10000);
  assert.equal(named(header(result), 'Parking amenity').props.accessibilityState.selected, false);
  assert.equal(input(result).props.value, 'Wits'); assert.equal(result.route.params.universityId, 'wits'); assert.equal(result.route.params.quickFilter, 'Wi-Fi');
  assert.equal(named(header(result), 'Sort by Highest Rated').props.accessibilityState.selected, true); assert.deepEqual(matches(result), ['p2']);
});
test('Clear all explicitly resets the complete existing discovery contract', () => {
  const result = screen({ params: { query: 'Wits', universityId: 'wits', quickFilter: 'Wi-Fi' } }); expand(result);
  slider(result).props.onValueChange(3000); select(result, 'Gym'); sort(result, 'Nearest'); named(header(result), 'Clear all search and filters').props.onPress();
  assert.equal(input(result).props.value, ''); assert.equal(result.route.params.universityId, undefined); assert.equal(result.route.params.quickFilter, undefined);
  assert.equal(slider(result).props.value, 10000); assert.equal(named(header(result), 'Sort by Recommended').props.accessibilityState.selected, true);
  assert.deepEqual(matches(result), ids(data.properties));
});
test('search focus has a stable border and search submission dismisses the keyboard', () => {
  const result = screen(); const before = result.keyboardDismissals;
  assert.equal(input(result).props.returnKeyType, 'search'); input(result).props.onFocus();
  assert.ok(header(result).some((node) => style(node.props.style).borderColor === '#2563EB'));
  input(result).props.onSubmitEditing(); assert.equal(result.keyboardDismissals, before + 1);
  input(result).props.onBlur(); assert.ok(!header(result).some((node) => style(node.props.style).borderColor === '#2563EB'));
});
test('search explicitly remains one centered line so enlarged Android placeholder text cannot wrap underneath', () => {
  const result = screen({ width: 320, fontScale: 2 });
  assert.equal(input(result).props.multiline, false); assert.equal(input(result).props.numberOfLines, 1);
  assert.equal(input(result).props.textAlignVertical, 'center'); assert.equal(input(result).props.maxFontSizeMultiplier, undefined);
  const nodes = header(result);
  const hint = nodes.find((node) => node.type === 'Text' && node.props.children === 'University, city or property...');
  assert.equal(hint.props.numberOfLines, 1); assert.equal(hint.props.ellipsizeMode, 'tail');
  assert.equal(input(result).props.accessibilityHint, hint.props.children);
  const overlay = nodes.find((node) => elements(node).includes(hint) && node.props.pointerEvents === 'none');
  assert.equal(overlay.props.importantForAccessibility, 'no-hide-descendants');
  input(result).props.onChangeText('Wits');
  assert.ok(!header(result).some((node) => node.type === 'Text' && node.props.children === hint.props.children));
});
test('clear search preserves price, amenities, context and ordering, including long queries', () => {
  const result = screen({ params: { query: 'x'.repeat(500), universityId: 'wits' } }); expand(result); select(result, 'Gym'); sort(result, 'Price: Low');
  assert.equal(input(result).props.value.length, 500); named(header(result), 'Clear search').props.onPress();
  assert.equal(input(result).props.value, ''); assert.equal(result.route.params.universityId, 'wits');
  assert.equal(named(header(result), 'Gym amenity').props.accessibilityState.selected, true); assert.deepEqual(matches(result), ['p2']);
});
test('removing a context chip clears only its own route parameter', () => {
  const result = screen({ params: { query: 'Wits', universityId: 'wits', quickFilter: 'Wi-Fi' } });
  const university = data.universities.find((item) => item.id === 'wits');
  named(header(result), `Remove ${university.name} filter`).props.onPress(); assert.equal(result.route.params.universityId, undefined);
  assert.equal(input(result).props.value, 'Wits'); assert.equal(result.route.params.quickFilter, 'Wi-Fi');
  named(header(result), 'Remove Wi-Fi filter').props.onPress(); assert.equal(result.route.params.quickFilter, undefined);
});
for (const [label, expected] of [
  ['Recommended', ['p1', 'p2', 'p3', 'p4', 'p5']], ['Price: Low', ['p1', 'p5', 'p3', 'p2', 'p4']],
  ['Price: High', ['p4', 'p2', 'p3', 'p5', 'p1']], ['Highest Rated', ['p3', 'p1', 'p4', 'p2', 'p5']], ['Nearest', ['p4', 'p3', 'p1', 'p2', 'p5']],
]) test(`${label} sorting uses actual data and preserves accurate counts`, () => {
  const result = screen(); sort(result, label); assert.deepEqual(matches(result), expected);
  assert.equal(named(header(result), `Sort by ${label}`).props.accessibilityState.selected, true);
  assert.match(copy(header(result)), /5 properties found/);
});
test('sorting is stable for ties and does not mutate source records or array', () => {
  const records = [data.properties[1], data.properties[0], data.properties[2]].map((record) => Object.freeze({ ...record, rating: 4.8, distance: 1, price: 4000 }));
  Object.freeze(records); const original = JSON.stringify(records);
  for (const order of ['recommended', 'price-low', 'price-high', 'rating', 'distance']) assert.deepEqual(ids(pure(records, { sort: order })), ['p2', 'p1', 'p3']);
  assert.equal(JSON.stringify(records), original);
});
test('missing and invalid ratings or distances sort last without inventing replacements', () => {
  for (const [field, order] of [['rating', 'rating'], ['distance', 'distance']]) {
    const records = [undefined, NaN, -1, Infinity, ...(field === 'rating' ? [6] : [])].map((value, index) => ({ ...data.properties[0], id: `bad${index}`, [field]: value }));
    records.push({ ...data.properties[0], id: 'valid', [field]: 0 });
    const sorted = pure(records, { sort: order }); assert.equal(sorted[0].id, 'valid'); assert.deepEqual(ids(sorted).slice(1), ids(records).slice(0, -1));
  }
});
test('missing, negative and nonfinite listing prices cannot satisfy a numeric maximum', () => {
  const records = [undefined, NaN, -1, Infinity, null].map((price, index) => ({ ...data.properties[0], id: `bad${index}`, price }));
  records.push({ ...data.properties[0], id: 'valid', price: 0 });
  for (const order of ['recommended', 'price-low', 'price-high']) assert.deepEqual(ids(pure(records, { sort: order })), ['valid']);
});
test('result counts are singular, plural and zero, derived from the same list data', () => {
  const result = screen(); assert.match(copy(header(result)), /5 properties found/);
  input(result).props.onChangeText('Wits'); assert.match(copy(header(result)), /1 property found/); assert.equal(list(result).props.data.length, 1);
  input(result).props.onChangeText('no such property'); assert.match(copy(header(result)), /No properties found/); assert.equal(list(result).props.data.length, 0);
  assert.equal(header(result).find((node) => node.props.accessibilityLiveRegion === 'polite').type, 'Text');
});
for (const scenario of ['query', 'price', 'amenities', 'university', 'combined']) test(`${scenario} empty state has explicit complete recovery`, () => {
  const result = screen(scenario === 'university' ? { params: { universityId: 'up' } } : undefined); expand(result);
  if (scenario === 'query' || scenario === 'combined') input(result).props.onChangeText('missing');
  if (scenario === 'price' || scenario === 'combined') slider(result).props.onValueChange(1000);
  if (scenario === 'amenities') { select(result, 'Gym'); select(result, 'Parking'); select(result, 'Laundry'); select(result, 'Study Area'); input(result).props.onChangeText('Durban'); }
  assert.deepEqual(matches(result), []); const empty = list(result).props.ListEmptyComponent;
  assert.equal(empty.props.title, 'No accommodation found'); assert.equal(empty.props.actionLabel, 'Clear all'); assert.match(empty.props.description, /university/);
  empty.props.onAction(); assert.deepEqual(matches(result), ids(data.properties));
});
test('amenity-only zero results are honest for supported keys on a reduced fixture', () => {
  const result = screen({ data: { properties: [data.properties[0], data.properties[4]] } }); expand(result); select(result, 'Gym'); select(result, 'Laundry');
  assert.deepEqual(matches(result), []); button(result, 'Clear filters').props.onPress(); assert.deepEqual(matches(result), ['p1', 'p5']);
});
test('favorites synchronize across Explore, Home, Details, Favorites and Profile without opening details', () => {
  const result = screen({ favoriteIds: [] }), property = data.properties[0];
  const card = () => list(result).props.renderItem({ item: property }); card().props.onToggleFavorite();
  assert.equal(result.calls.length, 0); assert.equal(card().props.favorite, true);
  const home = result.renderScreen('src/screens/HomeScreen.tsx').find((node) => node.type === 'FlatList' && node.props.data[0]?.id === 'p1');
  assert.equal(home.props.renderItem({ item: property }).props.favorite, true);
  result.route.params = { property }; assert.ok(named(result.renderScreen('src/screens/PropertyScreen.tsx'), `Remove ${property.name} from favorites`));
  assert.equal(result.renderScreen('src/screens/FavoritesScreen.tsx').find((node) => node.type === 'FlatList').props.data[0].id, property.id);
  assert.ok(named(result.renderScreen('src/screens/ProfileScreen.tsx'), '1 Saved'));
  card().props.onToggleFavorite(); card().props.onToggleFavorite(); assert.deepEqual(Array.from(result.favoriteIds), [property.id]);
});
test('each View action resolves its stable ID and retains Explore filters after returning', () => {
  const result = screen({ params: { query: 'Wits' } }); expand(result); select(result, 'Gym'); sort(result, 'Price: High');
  const property = list(result).props.data[0]; assert.equal(list(result).props.keyExtractor(property), property.id);
  list(result).props.renderItem({ item: { ...property, name: 'stale record' } }).props.onOpen();
  assert.equal(result.calls.at(-1).args[0], 'Property'); assert.equal(result.calls.at(-1).args[1].property, property);
  assert.equal(input(result).props.value, 'Wits'); assert.equal(named(header(result), 'Gym amenity').props.accessibilityState.selected, true);
  assert.equal(named(header(result), 'Sort by Price: High').props.accessibilityState.selected, true);
});
test('invalid and missing property IDs show useful feedback and cannot navigate or become favorites', () => {
  const result = screen({ favoriteIds: [] });
  for (const id of ['missing', undefined, '']) {
    const card = list(result).props.renderItem({ item: { ...data.properties[0], id } }); card.props.onOpen(); card.props.onToggleFavorite();
  }
  assert.equal(result.calls.length, 0); assert.equal(result.alerts.length, 3); assert.equal(result.alerts[0][0], 'Property unavailable'); assert.equal(result.favoriteIds.length, 0);
});
test('Explore list cards retain actual metadata, truthful badges and independent favorite/View controls', () => {
  const property = data.properties[0], result = harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: { variant: 'list', property, favorite: false, onOpen: () => {}, onToggleFavorite: () => {} } });
  const nodes = result.render(); assert.equal(nodes.find((node) => node.type === 'RemoteImage').props.decorative, true);
  assert.ok(nodes.some((node) => node.props.label === property.type)); assert.ok(nodes.some((node) => node.props.label === `${property.available} rooms listed`));
  assert.ok(!nodes.some((node) => /verified/i.test(node.props.label ?? ''))); assert.ok(copy(nodes).includes(`R${property.price.toLocaleString()}`));
  assert.equal(nodes.find((node) => node.type === 'StarRating').props.rating, property.rating);
  assert.equal(nodes.find((node) => node.type === 'Btn').props.accessibilityLabel, `View property details for ${property.name}`);
  const tagged = data.properties.find((record) => record.tags.includes('Available Now'));
  const taggedNodes = harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: { variant: 'list', property: tagged, favorite: false, onOpen: () => {}, onToggleFavorite: () => {} } }).render();
  assert.ok(!taggedNodes.some((node) => node.props.label === 'Available Now'));
  assert.ok(taggedNodes.some((node) => node.props.label === `${tagged.available} rooms listed`));
});
test('all Home quick filters and real university contexts remain compatible with Explore', () => {
  for (const quickFilter of discovery.quickFilters) {
    const result = screen({ params: { quickFilter } }); assert.deepEqual(matches(result), ids(pure(data.properties, { quickFilter })));
  }
  for (const university of data.universities) {
    const result = screen({ params: { universityId: university.id } }); assert.deepEqual(matches(result), ids(data.properties.filter((property) => property.university === university.id)));
  }
});
test('one vertical list owns the full panel, all amenities, sorting and count across twelve viewport/text combinations', () => {
  for (const width of [320, 411, 480, 800]) for (const fontScale of [1, 1.3, 2]) {
    const result = screen({ width, fontScale, height: 480, insets: { left: 5, right: 7, bottom: 30 } }); expand(result);
    const nodes = header(result), panel = nodes.find((node) => node.props.testID === 'explore-filters');
    assert.equal(panel.type, 'View'); assert.equal(panel.props.style.maxHeight, undefined); assert.equal(panel.props.style.height, undefined);
    assert.equal(nodes.filter((node) => node.type === 'ScrollView' && !node.props.horizontal).length, 0);
    assert.equal(nodes.filter((node) => node.type === 'ScrollView' && node.props.horizontal).length, 1);
    assert.equal(elements(panel).filter((node) => node.props.accessibilityLabel?.endsWith(' amenity')).length, 7);
    assert.ok(nodes.indexOf(panel) < nodes.indexOf(named(nodes, 'Sort by Recommended')));
    assert.ok(nodes.indexOf(named(nodes, 'Sort by Recommended')) < nodes.indexOf(nodes.find((node) => node.props.accessibilityLiveRegion === 'polite')));
    assert.equal(list(result).props.keyboardDismissMode, 'on-drag'); assert.equal(style(list(result).props.contentContainerStyle).paddingBottom, 62);
    if (fontScale >= 1.5 || width < 360) assert.equal(style(button(result, 'Clear filters').props.style).flex, 0);
    assert.equal(style(list(result).props.renderItem({ item: data.properties[0] }).props.style).width, width - 44);
    for (const chip of nodes.filter((node) => node.props.accessibilityLabel?.endsWith(' amenity') || node.props.accessibilityLabel?.startsWith('Sort by'))) assert.ok(style(chip.props.style).minHeight >= 44);
  }
});
test('Explore owns status-bar contrast only while focused and student/manager routes remain intact', () => {
  assert.equal(screen().render().find((node) => node.type === 'StatusBar').props.style, 'dark');
  assert.equal(screen({ isFocused: false }).render().find((node) => node.type === 'StatusBar'), undefined);
  const app = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  assert.deepEqual([...app.matchAll(/<Tab.Screen\s+name="([^"]+)"/g)].map((match) => match[1]), ['Home', 'Explore', 'Favorites', 'Bookings', 'Messages', 'Profile']);
  assert.match(app, /initialRouteName="Main"/); assert.match(app, /name="Manager"/);
});
