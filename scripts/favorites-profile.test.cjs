// Actual callbacks and shared session fixtures with native modules stubbed.
// These checks complement, and do not represent, device execution.
const assert = require('node:assert/strict');
const test = require('node:test');
const { harness, elements, data, profile } = require('./profile-harness.cjs');
const screen = (name, options) => harness(`src/screens/${name}Screen.tsx`, options);
const list = (result) => result.render().find((node) => node.type === 'FlatList');
const header = (result) => elements(list(result).props.ListHeaderComponent);
const compare = (result) => header(result).find((node) => node.type === 'Btn');
const copy = (nodes) => nodes.filter((node) => node.type === 'Text').map((node) => [node.props.children].flat(Infinity).join('')).join('\n');
const find = (nodes, name) => nodes.find((node) => (node.props.accessibilityLabel ?? node.props.label) === name || node.props.children === name);
const style = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const card = (result, id) => {
  const current = list(result);
  return current.props.renderItem({ item: current.props.data.find((property) => property.id === id) });
};
const select = (result, id) => card(result, id).props.onToggleComparison();
const selected = (result) => Array.from(list(result).props.data.filter((property) => card(result, property.id).props.comparisonSelected), (property) => property.id);
const ids = Array.from(data.properties, (property) => property.id);
const plain = (value) => JSON.parse(JSON.stringify(value));
const propertyHeaders = (nodes) => nodes.filter((node) => node.type === 'Text' && node.props.accessibilityRole === 'header').map((node) => node.props.children);

for (const count of [0, 1, 2, 5]) {
  test(`Favorites derives ${count} saved from the existing collection`, () => {
    const result = screen('Favorites', { favoriteIds: ids.slice(0, count) });
    assert.equal(list(result).props.data.length, count); assert.match(copy(header(result)), new RegExp(`${count} saved`));
  });
}

test('empty Favorites retains Compare 0 disabled and uses the existing Explore recovery', () => {
  const result = screen('Favorites', { favoriteIds: [] });
  assert.equal(compare(result).props.disabled, true); assert.equal(compare(result).props.children, 'Compare 0');
  const empty = list(result).props.ListEmptyComponent; assert.equal(empty.type, 'EmptyState');
  empty.props.onAction(); assert.deepEqual(result.calls, [{ action: 'navigate', args: ['Explore'] }]);
});

test('comparison selects and deselects independently from favorites and navigation', () => {
  const result = screen('Favorites', { favoriteIds: ids });
  select(result, 'p1'); assert.deepEqual(selected(result), ['p1']);
  assert.match(copy(header(result)), /Select 1 more/); assert.deepEqual(result.favoriteIds, ids); assert.equal(result.calls.length, 0);
  select(result, 'p1'); assert.deepEqual(selected(result), []); assert.match(copy(header(result)), /Select 2 or 3/);
});

test('zero and one selection cannot compare even if a stale callback is invoked', () => {
  const result = screen('Favorites', { favoriteIds: ids });
  for (let count = 0; count < 2; count++) {
    const button = compare(result); assert.equal(button.props.disabled, true); assert.ok(button.props.accessibilityHint);
    assert.equal(button.props.accessibilityLabel, `Compare ${count} selected ${count === 1 ? 'property' : 'properties'}`);
    button.props.onPress(); assert.equal(result.calls.length, 0); if (!count) select(result, 'p1');
  }
});

for (const chosen of [['p3', 'p1'], ['p3', 'p1', 'p2']]) {
  test(`${chosen.length}-property comparison preserves stable IDs and selection order`, () => {
    const result = screen('Favorites', { favoriteIds: ids }); chosen.forEach((id) => select(result, id));
    assert.equal(compare(result).props.disabled, false); compare(result).props.onPress();
    assert.deepEqual(Array.from(result.calls[0].args[1].ids), chosen); assert.equal(result.calls.length, 1);
    result.route.params = result.calls[0].args[1];
    assert.deepEqual(propertyHeaders(result.renderScreen('src/screens/CompareScreen.tsx')), chosen.map((id) => data.properties.find((property) => property.id === id).name));
    result.renderScreen('src/screens/CompareScreen.tsx').find((node) => node.type === 'ScreenHeader').props.onBack();
    assert.equal(result.calls.at(-1).action, 'goBack'); assert.equal(selected(result).length, chosen.length);
  });
}

test('a fourth selection gives accessible native feedback without replacing selections', () => {
  const result = screen('Favorites', { favoriteIds: ids }); ids.slice(0, 3).forEach((id) => select(result, id));
  select(result, 'p4'); assert.deepEqual(selected(result), ids.slice(0, 3));
  assert.equal(result.alerts.length, 1); assert.equal(result.alerts[0][0], 'Comparison limit reached');
  assert.match(copy(header(result)), /Maximum of 3/); assert.equal(result.calls.length, 0);
});

test('repeated queued selection callbacks cannot create duplicate IDs or exceed three', () => {
  const result = screen('Favorites', { favoriteIds: ids });
  const first = card(result, 'p1').props.onToggleComparison; first(); first(); first();
  assert.deepEqual(selected(result), ['p1']);
  const callbacks = ids.slice(1).map((id) => card(result, id).props.onToggleComparison); callbacks.forEach((callback) => callback());
  assert.equal(selected(result).length, 3); assert.equal(new Set(selected(result)).size, 3);
});

test('removing a selected favorite immediately updates saved and Compare counts', () => {
  const result = screen('Favorites', { favoriteIds: ['p1', 'p2'] }); select(result, 'p1'); select(result, 'p2');
  card(result, 'p1').props.onToggleFavorite(); assert.deepEqual(selected(result), ['p2']);
  assert.match(copy(header(result)), /1 saved/); assert.equal(compare(result).props.children, 'Compare 1');
  assert.equal(result.calls.length, 0); card(result, 'p2').props.onToggleFavorite();
  assert.deepEqual(selected(result), []); assert.match(copy(header(result)), /0 saved/);
});

test('removal on Explore prunes selection permanently when that property is saved again', () => {
  const result = screen('Favorites', { favoriteIds: ['p1', 'p2'] }); select(result, 'p1'); select(result, 'p2');
  const exploreCard = () => result.renderScreen('src/screens/ExploreScreen.tsx').find((node) => node.type === 'FlatList').props.renderItem({ item: data.properties[0] });
  exploreCard().props.onToggleFavorite(); assert.deepEqual(selected(result), ['p2']);
  exploreCard().props.onToggleFavorite(); assert.deepEqual(selected(result), ['p2']); assert.equal(result.favoriteIds.length, 2);
});

test('unknown saved IDs and invalid card callbacks cannot create comparison selections', () => {
  const result = screen('Favorites', { favoriteIds: ['p1', 'missing', ''] });
  assert.match(copy(header(result)), /1 saved/);
  for (const id of ['', undefined, 'missing', 'p2']) {
    const invalid = list(result).props.renderItem({ item: { ...data.properties[0], id } });
    invalid.props.onToggleComparison(); invalid.props.onToggleFavorite();
  }
  assert.deepEqual(selected(result), []); assert.deepEqual(result.favoriteIds, ['p1', 'missing', '']);
});

test('View resolves the current catalog record and handles an unavailable ID safely', () => {
  const result = screen('Favorites', { favoriteIds: ['p1', 'p2'] }); select(result, 'p1');
  list(result).props.renderItem({ item: { ...data.properties[0], name: 'Stale title' } }).props.onOpen();
  assert.equal(result.calls.length, 1); assert.equal(result.calls[0].args[1].property.name, data.properties[0].name);
  result.route.params = result.calls[0].args[1];
  result.renderScreen('src/screens/PropertyScreen.tsx').find((node) => node.type === 'IconButton' && node.props.label === 'Go back').props.onPress();
  assert.deepEqual(selected(result), ['p1']); assert.deepEqual(result.favoriteIds, ['p1', 'p2']);
  list(result).props.renderItem({ item: { ...data.properties[0], id: 'missing' } }).props.onOpen();
  assert.equal(result.alerts.at(-1)[0], 'Property unavailable'); assert.equal(result.calls.length, 2);
});

test('saved card check-circle, heart and View have independent callbacks and states', () => {
  const calls = [], property = data.properties[0];
  const nodes = harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: { variant: 'saved', property, favorite: true, comparisonSelected: true,
    onToggleComparison: () => calls.push('compare'), onToggleFavorite: () => calls.push('favorite'), onOpen: () => calls.push('details') } }).render();
  const selection = find(nodes, `Remove ${property.name} from comparison`), heart = find(nodes, `Remove ${property.name} from favorites`);
  assert.equal(selection.props.icon, 'checkmark-circle'); assert.equal(selection.props.selected, true); assert.match(selection.props.hint, /deselect/);
  assert.equal(heart.props.selected, true); assert.equal(heart.props.selectedBackgroundColor, '#EF4444');
  selection.props.onPress(); assert.deepEqual(calls, ['compare']); heart.props.onPress(); assert.deepEqual(calls, ['compare', 'favorite']);
  find(nodes, `View property details for ${property.name}`).props.onPress(); assert.deepEqual(calls, ['compare', 'favorite', 'details']);
});

test('saved cards preserve supplied image, price, rating, distance and listed-room metadata', () => {
  for (const property of data.properties) {
    const nodes = harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: { variant: 'saved', property, favorite: true, comparisonSelected: false } }).render();
    const text = copy(nodes); assert.ok(text.includes(property.name)); assert.ok(text.replace(/[\s,]/g, '').includes(`R${property.price}`));
    assert.ok(text.includes(`${property.distance} km from campus`)); assert.ok(text.includes(`${property.available} rooms listed`)); assert.ok(text.includes('/month'));
    assert.equal(nodes.find((node) => node.type === 'StarRating').props.rating, property.rating);
    assert.equal(nodes.find((node) => node.type === 'RemoteImage').props.source.uri, property.images[0]); assert.doesNotMatch(text, /Verified|Available Now/);
  }
});

test('saved cards use truthful fallbacks for missing numeric metadata and images', () => {
  const property = { ...data.properties[0], images: [], price: undefined, rating: NaN, distance: undefined, available: undefined };
  const nodes = harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: { variant: 'saved', property, favorite: true } }).render();
  assert.match(copy(nodes), /Price unavailable/); assert.match(copy(nodes), /Availability unavailable/); assert.doesNotMatch(copy(nodes), /km from campus|NaN|\/month/);
  assert.equal(nodes.find((node) => node.type === 'RemoteImage').props.source, null); assert.equal(nodes.find((node) => node.type === 'StarRating'), undefined);
});

test('missing image, room and amenity collections do not crash cards or invent comparison information', () => {
  const properties = data.properties.slice(0, 2).map((property) => ({ ...property, images: undefined, rooms: undefined, amenities: undefined }));
  const cardNodes = harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: { variant: 'saved', property: properties[0], favorite: true } }).render();
  assert.equal(cardNodes.find((node) => node.type === 'RemoteImage').props.source, null);
  const nodes = screen('Compare', { favoriteIds: ['p1', 'p2'], params: { ids: ['p1', 'p2'] }, data: { properties } }).render();
  assert.equal(nodes.filter((node) => node.type === 'Btn' && node.props.children === 'Apply').length, 0);
  assert.equal(nodes.filter((node) => node.type === 'Text' && node.props.children === 'Not provided').length, 14);
  assert.doesNotMatch(copy(nodes), /Included|Not included/);
});

test('Compare deduplicates IDs, excludes missing/unsaved properties and caps at three', () => {
  const result = screen('Compare', { favoriteIds: ids, params: { ids: ['p2', 'missing', 'p2', 'p1', 'p3', 'p4'] } });
  assert.deepEqual(propertyHeaders(result.render()), [data.properties[1].name, data.properties[0].name, data.properties[2].name]);
  const unavailable = screen('Compare', { favoriteIds: ['p1'], params: { ids: ['p1', 'p2', 'missing'] } });
  assert.equal(unavailable.render().find((node) => node.type === 'EmptyState').props.title, 'Choose at least two properties');
});

test('Compare handles missing route IDs and returns safely to Favorites', () => {
  const result = screen('Compare'); const empty = result.render().find((node) => node.type === 'EmptyState');
  empty.props.onAction(); assert.deepEqual(result.calls, [{ action: 'goBack', args: [] }]);
});

test('Compare reacts to favorite removal while its route still holds the old IDs', () => {
  const result = screen('Compare', { favoriteIds: ['p1', 'p2'], params: { ids: ['p1', 'p2'] } }); assert.equal(propertyHeaders(result.render()).length, 2);
  const favorites = result.renderScreen('src/screens/FavoritesScreen.tsx').find((node) => node.type === 'FlatList');
  favorites.props.renderItem({ item: data.properties[0] }).props.onToggleFavorite();
  assert.ok(result.render().find((node) => node.type === 'EmptyState'));
});

test('Compare marks both tied rent values as best without inventing missing values', () => {
  const properties = data.properties.slice(0, 2).map((property) => ({ ...property, price: 4000 }));
  const nodes = screen('Compare', { favoriteIds: ['p1', 'p2'], params: { ids: ['p1', 'p2'] }, data: { properties } }).render();
  const rent = nodes.find((node) => node.type === 'View' && style(node.props.style).flexDirection === 'row' && copy(elements(node)).startsWith('Monthly Rent'));
  assert.equal(elements(rent).filter((node) => node.type === 'Badge' && node.props.accessibilityLabel === 'Best Monthly Rent').length, 2);
  const bad = properties.map((property) => ({ ...property, price: NaN, distance: -1, rating: 9, available: 1.5 }));
  const invalidNodes = screen('Compare', { favoriteIds: ['p1', 'p2'], params: { ids: ['p1', 'p2'] }, data: { properties: bad } }).render();
  assert.equal(invalidNodes.filter((node) => node.type === 'Text' && node.props.children === 'Not provided').length, 8);
  assert.equal(invalidNodes.filter((node) => node.type === 'Badge').length, 0); assert.doesNotMatch(copy(invalidNodes), /NaN|Available/);
});

test('Compare preserves supplied room/amenity information and exact property navigation', () => {
  const result = screen('Compare', { favoriteIds: ['p1', 'p2'], params: { ids: ['p1', 'p2'] } }); const nodes = result.render();
  assert.match(copy(nodes), /Rooms listed/); assert.match(copy(nodes), /10 rooms/); assert.match(copy(nodes), /8 rooms/); assert.match(copy(nodes), /Included/); assert.match(copy(nodes), /Not included/);
  find(nodes, 'View Property').props.onPress(); assert.equal(result.calls[0].args[1].property.id, 'p1'); assert.equal(result.calls.length, 1);
});

test('Favorites and Profile Saved stay synchronized through shared callbacks', () => {
  const result = screen('Favorites', { favoriteIds: ['p1', 'p2'] }); card(result, 'p1').props.onToggleFavorite();
  let nodes = result.renderScreen('src/screens/ProfileScreen.tsx'); find(nodes, '1 Saved').props.onPress();
  assert.deepEqual(result.calls[0], { action: 'navigate', args: ['Favorites'] }); assert.match(copy(header(result)), /1 saved/);
  const explore = result.renderScreen('src/screens/ExploreScreen.tsx').find((node) => node.type === 'FlatList');
  explore.props.renderItem({ item: data.properties[0] }).props.onToggleFavorite();
  nodes = result.renderScreen('src/screens/ProfileScreen.tsx'); assert.ok(find(nodes, '2 Saved')); assert.equal(list(result).props.data.length, 2);
});

test('Profile Applications opens the applications section rather than confirmed bookings', () => {
  const result = screen('Profile', { applications: [{ id: 'a1' }, { id: 'a2' }] }); find(result.render(), '2 Applications').props.onPress();
  assert.deepEqual(plain(result.calls), [{ action: 'navigate', args: ['Bookings', { section: 'Applications' }] }]);
});

test('actual Notifications callbacks synchronize Unread statistic and menu badge', () => {
  const result = screen('Profile'); find(result.render(), '2 Unread').props.onPress();
  assert.deepEqual(result.calls[0], { action: 'navigate', args: ['Notifications'] });
  const notificationNodes = result.renderScreen('src/screens/NotificationsScreen.tsx');
  const notifications = notificationNodes.find((node) => node.type === 'FlatList');
  notifications.props.renderItem({ item: result.communication.notifications.find((item) => !item.read) }).props.onPress();
  assert.ok(find(result.render(), '1 Unread')); assert.ok(find(result.render(), 'Notifications, 1 unread'));
  result.renderScreen('src/screens/NotificationsScreen.tsx').find((node) => node.type === 'ScreenHeader').props.trailingAction.props.onPress();
  assert.ok(find(result.render(), '0 Unread')); const row = find(result.render(), 'Notifications');
  assert.equal(elements(row).find((node) => node.type === 'Text' && node.props.children === 0), undefined);
});

for (const fullName of ['', '   ', '  Thandi Student  ', 'Nokuthula '.repeat(10).trim()]) {
  test(`Profile name wraps and uses the provider fallback: ${JSON.stringify(fullName.slice(0, 20))}`, () => {
    const result = screen('Profile', { profile: { ...profile.createEmptyProfile(), fullName } }); const nodes = result.render();
    const title = nodes.find((node) => node.props.accessibilityRole === 'header');
    assert.equal(title.props.children, fullName.trim() || 'Your profile'); assert.equal(title.props.numberOfLines, undefined);
    assert.match(copy(nodes), fullName.trim() ? /Personal information/ : /Add your personal details/);
  });
}

test('saving personal information updates the same Profile header immediately', () => {
  const result = screen('Profile'); let nodes = result.renderScreen('src/screens/PersonalInformationScreen.tsx');
  find(nodes, 'Edit details').props.onPress(); nodes = result.renderScreen('src/screens/PersonalInformationScreen.tsx');
  find(nodes, 'Full name').props.onChangeText('Thandi Student');
  find(result.renderScreen('src/screens/PersonalInformationScreen.tsx'), 'Save changes').props.onPress();
  assert.equal(result.render().find((node) => node.props.accessibilityRole === 'header').props.children, 'Thandi Student');
});

test('all six Profile settings retain their existing routes and touch targets', () => {
  const result = screen('Profile');
  for (const [label, route] of [['Personal Information', 'PersonalInformation'], ['My Documents', 'MyDocuments'], ['Notifications, 2 unread', 'Notifications'], ['Security', 'Security'], ['Help & Support', 'HelpSupport'], ['Terms & Privacy', 'TermsPrivacy']]) {
    const button = find(result.render(), label); assert.equal(button.props.accessibilityRole, 'button'); assert.ok(style(button.props.style).minHeight >= 44); button.props.onPress();
    assert.deepEqual(result.calls.at(-1), { action: 'navigate', args: [route] });
  }
  assert.equal(result.calls.length, 6);
});

test('logout Cancel preserves state; confirmation resets every owner and opens Login', () => {
  const result = screen('Profile', { favoriteIds: ['p1', 'p2'], applications: [{ id: 'a1' }], profile: { ...profile.createEmptyProfile(), fullName: 'Thandi Student' } });
  find(result.render(), 'Log Out').props.onPress(); const actions = result.alerts[0][2];
  assert.equal(result.alerts[0][1], 'Are you sure you want to log out?'); assert.equal(actions[0].text, 'Cancel'); assert.equal(actions[0].onPress, undefined);
  assert.equal(result.resets.length, 0); assert.ok(find(result.render(), '1 Applications')); assert.equal(result.profile.fullName, 'Thandi Student');
  actions[1].onPress(); assert.deepEqual(result.resets, ['applications', 'favorites', 'communication', 'profile']);
  assert.ok(find(result.render(), '0 Applications')); assert.equal(result.profile.fullName, ''); assert.deepEqual(result.calls.at(-1), { action: 'replace', args: ['Login'] });
  const continuation = find(result.renderScreen('src/screens/LoginScreen.tsx'), 'Continue without signing in'); continuation.props.onPress();
  assert.deepEqual(plain(result.calls.at(-1)), { action: 'reset', args: [{ index: 0, routes: [{ name: 'Main', params: { screen: 'Home' } }] }] });
});

test('large notification counts remain inside the menu copy at enlarged text', () => {
  const notifications = Array.from({ length: 123 }, (_, index) => ({ ...data.notifications[0], id: `n-${index}`, read: false }));
  const result = screen('Profile', { notifications, width: 320, fontScale: 2 });
  const nodes = result.render(); assert.ok(find(nodes, '123 Unread'));
  const row = find(nodes, 'Notifications, 123 unread'); const badge = elements(row).find((node) => node.type === 'Text' && node.props.children === 123);
  assert.ok(badge); assert.equal(badge.props.numberOfLines, undefined);
});

test('Favorites and Profile own status-bar contrast only while focused', () => {
  for (const [name, contrast] of [['Favorites', 'dark'], ['Profile', 'light']]) {
    assert.equal(screen(name).render().find((node) => node.type === 'StatusBar').props.style, contrast);
    assert.equal(screen(name, { isFocused: false }).render().find((node) => node.type === 'StatusBar'), undefined);
  }
});

for (const width of [320, 411, 480, 800]) for (const fontScale of [1, 1.3, 2]) {
  test(`Favorites/Profile adaptable layout contract at ${width}dp and ${fontScale} text`, () => {
    const favorites = screen('Favorites', { width, fontScale, favoriteIds: ['p1', 'p2'], insets: { left: 8, right: 12, bottom: 34 } });
    const listNode = list(favorites); assert.ok(listNode.props.ListHeaderComponent); assert.equal(style(listNode.props.contentContainerStyle).paddingBottom, 66);
    assert.equal(favorites.render().filter((node) => node.type === 'ScrollView').length, 0);
    const button = compare(favorites); assert.equal(style(button.props.style).maxWidth, '100%');
    const panel = header(favorites).find((node) => node.type === 'View' && style(node.props.style).backgroundColor === '#FFFFFF');
    assert.equal(style(panel.props.style).height, undefined); assert.equal(style(panel.props.style).flexDirection, width - 20 < 360 || fontScale >= 1.5 ? 'column' : 'row');
    const nodes = screen('Profile', { width, fontScale, insets: { bottom: 34 } }).render();
    const stats = nodes.find((node) => node.type === 'View' && style(node.props.style).width === '100%' && style(node.props.style).gap === 8);
    assert.equal(style(stats.props.style).flexDirection, fontScale >= 1.5 && width < 600 ? 'column' : 'row');
    for (const label of ['Personal Information', 'Security', 'Help & Support', 'Terms & Privacy', 'Log Out']) {
      const item = find(nodes, label); assert.equal(style(item.props.style).height, undefined); assert.ok(style(item.props.style).minHeight >= 44);
    }
  });
}
