const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { harness, load, elements, data, profile } = require('./profile-harness.cjs');
const home = load('src/home.ts');
const discovery = load('src/discovery.ts', { './data': data });
const source = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const text = (nodes) => nodes.filter((node) => node.type === 'Text').map((node) => node.props.children).flat(Infinity).join(' ');
const named = (nodes, label) => nodes.find((node) => node.props.accessibilityLabel === label || node.props.label === label || node.props.children === label);
const style = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const screen = (options) => harness('src/screens/HomeScreen.tsx', options);
const featured = (nodes) => nodes.find((node) => node.type === 'FlatList' && node.props.ListEmptyComponent?.props.title === 'No featured accommodation');
const results = (nodes) => nodes.find((node) => node.type === 'FlatList' && node.props.ListEmptyComponent?.props.title === 'No accommodation found');
const propertyCard = (props = {}) => harness('src/components/PropertyCard.tsx', { exportName: 'PropertyCard', props: {
  property: data.properties[0], favorite: false, variant: 'featured', onOpen: () => {}, onToggleFavorite: () => {}, ...props,
} });

test('empty and whitespace profiles have a neutral Home title and generic avatar', () => {
  for (const fullName of ['', '   ']) {
    const nodes = screen({ profile: { ...profile.createEmptyProfile(), fullName } }).render();
    assert.match(text(nodes), /Hey there!/); assert.doesNotMatch(text(nodes), /Siyanda|Hey,|\bSD\b/);
    assert.ok(elements(named(nodes, 'Open profile')).some((node) => node.props.name === 'person-outline'));
  }
});
test('saved names derive the first-name greeting and Unicode initials without truncating identity data', () => {
  for (const [fullName, title, initials] of [['  Thandi   Student  ', 'Hey, Thandi!', 'TS'], ['Élodie Müller', 'Hey, Élodie!', 'ÉM'], ['李 明', 'Hey, 李!', '李明'], ['Nomvula', 'Hey, Nomvula!', 'N']]) {
    const identity = home.getHomeIdentity(fullName); assert.equal(identity.title, title); assert.equal(identity.initials, initials);
    const nodes = screen({ profile: { ...profile.createEmptyProfile(), fullName } }).render();
    assert.match(text(nodes), new RegExp(title)); assert.match(text(elements(named(nodes, 'Open profile'))), new RegExp(initials));
  }
});
test('local greeting periods have explicit morning, afternoon, and evening boundaries', () => {
  for (const [hour, expected] of [[0, 'Good morning'], [11, 'Good morning'], [12, 'Good afternoon'], [17, 'Good afternoon'], [18, 'Good evening'], [23, 'Good evening']]) assert.equal(home.getTimeGreeting(hour), expected);
  const result = screen(); result.render(); result.focus();
  assert.ok(text(result.render()).includes(home.getTimeGreeting(new Date().getHours())));
  assert.doesNotMatch(source('src/screens/HomeScreen.tsx'), /setInterval|setTimeout/);
});
test('Personal Information save updates Profile and Home through the same session owner', () => {
  const result = screen(); result.render();
  let nodes = result.renderScreen('src/screens/PersonalInformationScreen.tsx'); named(nodes, 'Edit details').props.onPress();
  nodes = result.renderScreen('src/screens/PersonalInformationScreen.tsx'); named(nodes, 'Full name').props.onChangeText('  Thandi Student  ');
  named(result.renderScreen('src/screens/PersonalInformationScreen.tsx'), 'Save changes').props.onPress();
  assert.equal(result.profile.fullName, 'Thandi Student');
  assert.match(text(result.renderScreen('src/screens/ProfileScreen.tsx')), /Thandi Student/);
  assert.match(text(result.render()), /Hey, Thandi!/); assert.match(text(elements(named(result.render(), 'Open profile'))), /TS/);
});
test('editing a previously saved name refreshes the Home first name and initials without another focus event', () => {
  const result = screen({ profile: { ...profile.createEmptyProfile(), fullName: 'Thandi Student' } });
  assert.match(text(result.render()), /Hey, Thandi!/);
  let nodes = result.renderScreen('src/screens/PersonalInformationScreen.tsx'); named(nodes, 'Edit details').props.onPress();
  nodes = result.renderScreen('src/screens/PersonalInformationScreen.tsx'); named(nodes, 'Full name').props.onChangeText('  Élodie   Müller  ');
  named(result.renderScreen('src/screens/PersonalInformationScreen.tsx'), 'Save changes').props.onPress();
  nodes = result.render(); assert.match(text(nodes), /Hey, Élodie!/);
  assert.match(text(elements(named(nodes, 'Open profile'))), /ÉM/); assert.doesNotMatch(text(nodes), /Thandi/);
});
test('confirmed Profile logout clears Home identity while cancellation preserves it', () => {
  const result = screen({ profile: { ...profile.createEmptyProfile(), fullName: 'Thandi Student' } });
  named(result.renderScreen('src/screens/ProfileScreen.tsx'), 'Log Out').props.onPress();
  const actions = result.alerts[0][2]; assert.equal(actions[0].onPress, undefined);
  assert.match(text(result.render()), /Hey, Thandi!/);
  actions[1].onPress(); assert.equal(result.calls.at(-1).args[0], 'Login');
  assert.match(text(result.render()), /Hey there!/); assert.doesNotMatch(text(result.render()), /Thandi|TS/);
});
test('Home notification shortcut and indicator follow individual and all-read state shared with Profile', () => {
  const result = screen();
  named(result.render(), 'Notifications, 2 unread').props.onPress(); assert.deepEqual(result.calls, [{ action: 'navigate', args: ['Notifications'] }]);
  let nodes = result.renderScreen('src/screens/NotificationsScreen.tsx');
  nodes.find((node) => node.type === 'FlatList').props.renderItem({ item: result.communication.notifications.find((item) => !item.read) }).props.onPress();
  assert.ok(named(result.render(), 'Notifications, 1 unread'));
  nodes = result.renderScreen('src/screens/NotificationsScreen.tsx'); nodes.find((node) => node.type === 'ScreenHeader').props.trailingAction.props.onPress();
  assert.ok(named(result.render(), 'Notifications, no unread items'));
  assert.ok(named(result.renderScreen('src/screens/ProfileScreen.tsx'), '0 Unread'));
});
test('avatar opens the existing student Profile route with one callback', () => {
  const result = screen(); named(result.render(), 'Open profile').props.onPress();
  assert.deepEqual(result.calls, [{ action: 'navigate', args: ['Profile'] }]);
});
test('search arrow and keyboard submit preserve trimmed full queries and clear stale route context', () => {
  for (const query of ['', '   ', ' Wits ', 'University of Cape Town', 'Johannesburg', 'a'.repeat(400)]) {
    for (const keyboard of [false, true]) {
      const result = screen({ params: { universityId: 'uct', quickFilter: 'Near Campus', query: 'old' } });
      result.render().find((node) => node.type === 'TextInput').props.onChangeText(query);
      const nodes = result.render();
      if (keyboard) nodes.find((node) => node.type === 'TextInput').props.onSubmitEditing();
      else nodes.find((node) => node.type === 'IconButton' && node.props.label === 'Search accommodation').props.onPress();
      assert.equal(result.calls.length, 1); assert.equal(result.calls[0].args[0], 'Explore');
      const params = result.calls[0].args[1]; assert.equal(params.query, query.trim()); assert.equal(params.universityId, undefined); assert.equal(params.quickFilter, undefined);
      assert.equal(result.keyboardDismissals, 1);
      result.route.params = params;
      const actual = results(result.renderScreen('src/screens/ExploreScreen.tsx')).props.data;
      assert.deepEqual(Array.from(actual, (item) => item.id), Array.from(discovery.filterAndSortProperties(data.properties, { ...discovery.createDefaultDiscoveryFilters(), query: query.trim() }), (item) => item.id));
    }
  }
});
test('search focus styling keeps the input flexible and exposes an accessible search action', () => {
  const result = screen(); let nodes = result.render(); const input = nodes.find((node) => node.type === 'TextInput');
  assert.equal(input.props.accessibilityLabel, 'Search accommodation'); assert.equal(input.props.returnKeyType, 'search'); assert.equal(input.props.style.minWidth, 0);
  input.props.onFocus(); nodes = result.render(); assert.ok(nodes.some((node) => style(node.props.style).borderColor === '#3B82F6'));
  input.props.onBlur(); assert.ok(!result.render().some((node) => style(node.props.style).borderColor === '#3B82F6'));
});
test('all seven quick filters navigate once with actual predicates and no stale selected state', () => {
  for (const item of discovery.quickFilters) {
    const result = screen(); const list = result.render().find((node) => node.type === 'FlatList' && node.props.data[0] === 'Near Campus');
    const chip = list.props.renderItem({ item });
    assert.equal(chip.props.accessibilityRole, 'button'); assert.ok(chip.props.accessibilityHint); assert.ok(chip.props.activeOpacity < 1); assert.ok(chip.props.style.minHeight >= 44);
    assert.equal(chip.props.accessibilityState, undefined); chip.props.onPress();
    assert.equal(result.calls.length, 1); const params = result.calls[0].args[1]; assert.equal(params.quickFilter, item); assert.equal(params.query, '');
    result.route.params = params; const matches = results(result.renderScreen('src/screens/ExploreScreen.tsx')).props.data;
    assert.ok(matches.length); assert.ok(matches.every((property) => discovery.propertyMatchesQuickFilter(property, item)));
  }
});
test('Under R5,000 uses listing price strictly below the boundary', () => {
  const records = [4999, 5000, 5001].map((price) => ({ ...data.properties[0], price }));
  assert.deepEqual(records.map((item) => discovery.propertyMatchesQuickFilter(item, 'Under R5,000')), [true, false, false]);
});
test('single/shared room filters use available classified rooms, independent of property names', () => {
  const room = data.properties[0].rooms[0];
  assert.equal(discovery.propertyMatchesQuickFilter({ ...data.properties[0], name: 'Private Home', rooms: [{ ...room, type: 'Shared', capacity: 2 }] }, 'Single Room'), false);
  assert.equal(discovery.propertyMatchesQuickFilter({ ...data.properties[0], rooms: [{ ...room, type: 'Single', available: 0 }] }, 'Single Room'), false);
  assert.equal(discovery.propertyMatchesQuickFilter({ ...data.properties[0], name: 'A Residence', rooms: [{ ...room, type: 'Single' }] }, 'Single Room'), true);
  assert.equal(discovery.propertyMatchesQuickFilter({ ...data.properties[0], rooms: [{ ...room, type: 'Shared', capacity: 2 }] }, 'Shared Room'), true);
});
test('Near Campus rejects missing, invalid, and negative distances instead of inferring GPS proximity', () => {
  for (const distance of [undefined, null, NaN, Infinity, -1, 1.01]) assert.equal(discovery.propertyMatchesQuickFilter({ ...data.properties[0], distance }, 'Near Campus'), false);
  for (const distance of [0, 0.5, 1]) assert.equal(discovery.propertyMatchesQuickFilter({ ...data.properties[0], distance }, 'Near Campus'), true);
});
test('featured keys and card actions retain the exact property ID and record', () => {
  const result = screen(), list = featured(result.render());
  for (const item of list.props.data) {
    assert.equal(list.props.keyExtractor(item), item.id); const card = list.props.renderItem({ item });
    assert.equal(card.props.property.id, item.id); card.props.onOpen();
    assert.equal(result.calls.at(-1).args[0], 'Property'); assert.equal(result.calls.at(-1).args[1].property, item);
  }
  assert.equal(featured(result.render()).props.data, list.props.data);
});
test('See all and featured empty-state actions open the existing Explore listing', () => {
  for (const empty of [false, true]) {
    const result = screen(empty ? { data: { properties: [] } } : undefined); const nodes = result.render();
    if (empty) { assert.equal(featured(nodes).props.data.length, 0); featured(nodes).props.ListEmptyComponent.props.onAction(); } else named(nodes, 'See all accommodation').props.onPress();
    assert.equal(result.calls.length, 1); assert.equal(result.calls[0].args[0], 'Explore'); assert.equal(result.calls[0].args[1].query, '');
  }
});
test('university cards preserve data order and IDs, with full names and honest zero results', () => {
  const result = screen();
  for (const university of data.universities.slice(0, 4)) {
    const card = named(result.render(), `Explore accommodation for ${university.name}`); assert.ok(text(elements(card)).includes(university.name));
    card.props.onPress(); const params = result.calls.at(-1).args[1]; assert.equal(params.universityId, university.id);
    result.route.params = params; const list = results(result.renderScreen('src/screens/ExploreScreen.tsx'));
    assert.ok(list.props.data.every((item) => item.university === university.id));
    if (!data.properties.some((item) => item.university === university.id)) { assert.equal(list.props.data.length, 0); assert.equal(list.props.ListEmptyComponent.props.title, 'No accommodation found'); }
  }
  const nodes = result.render(); named(nodes, 'Explore properties near UNIVEN').props.onPress();
  assert.equal(result.calls.at(-1).args[1].universityId, 'univen');
  assert.doesNotMatch(text(nodes), /NEW LISTINGS/);
});
test('Home, Explore, Details, Favorites, and Profile share the favorite reducer with no duplicate or detail tap', () => {
  const result = screen({ favoriteIds: [] }), property = data.properties[0];
  const homeCard = () => featured(result.render()).props.renderItem({ item: property });
  homeCard().props.onToggleFavorite(); assert.equal(result.calls.length, 0); assert.equal(homeCard().props.favorite, true);
  assert.equal(results(result.renderScreen('src/screens/ExploreScreen.tsx')).props.renderItem({ item: property }).props.favorite, true);
  result.route.params = { property };
  named(result.renderScreen('src/screens/PropertyScreen.tsx'), `Remove ${property.name} from favorites`).props.onPress();
  assert.equal(homeCard().props.favorite, false); homeCard().props.onToggleFavorite();
  const favorites = result.renderScreen('src/screens/FavoritesScreen.tsx').find((node) => node.type === 'FlatList');
  assert.equal(favorites.props.data[0].id, property.id); assert.ok(named(result.renderScreen('src/screens/ProfileScreen.tsx'), '1 Saved'));
  favorites.props.renderItem({ item: property }).props.onToggleFavorite(); assert.equal(result.favoriteIds.length, 0);
  homeCard().props.onToggleFavorite(); homeCard().props.onToggleFavorite(); homeCard().props.onToggleFavorite();
  assert.deepEqual(Array.from(result.favoriteIds), [property.id]);
  assert.deepEqual(Array.from(discovery.favoritesReducer(result.favoriteIds, { type: 'add', id: property.id })), [property.id]);
});
test('card favorite controls are siblings of detail controls and never invoke the open callback', () => {
  let opened = 0, toggled = 0; const result = propertyCard({ onOpen: () => opened++, onToggleFavorite: () => toggled++ }); const nodes = result.render();
  nodes.find((node) => node.type === 'IconButton' && node.props.label.includes('favorites')).props.onPress();
  assert.equal(toggled, 1); assert.equal(opened, 0);
  assert.ok(!nodes.filter((node) => node.type === 'TouchableOpacity').some((node) => elements(node).some((item) => item.type === 'IconButton')));
  nodes.find((node) => node.type === 'TouchableOpacity').props.onPress(); assert.equal(opened, 1);
});
test('listing cards show only supplied price/rating/distance/count and a truthful property-type badge', () => {
  const property = data.properties[0], nodes = propertyCard().render(), copy = text(nodes);
  assert.ok(copy.includes(`R${property.price.toLocaleString()}`)); assert.match(copy, /\/month/);
  assert.ok(copy.includes(`${property.distance} km from campus`)); assert.ok(copy.includes(`${property.available} rooms listed`));
  assert.equal(nodes.find((node) => node.type === 'StarRating').props.rating, property.rating);
  assert.ok(nodes.some((node) => node.type === 'Badge' && node.props.label === property.type));
  assert.ok(!nodes.some((node) => node.type === 'VerifiedBadge' || /verified/i.test(node.props.label ?? '')));
  assert.ok(data.properties.every((item) => item.available === item.rooms.reduce((count, room) => count + room.available, 0)));
});
test('missing or malformed listing values have honest fallbacks without fabricated ratings or distance', () => {
  for (const invalid of [undefined, NaN, -1]) {
    const nodes = propertyCard({ property: { ...data.properties[0], city: '', price: invalid, rating: invalid, distance: invalid, available: invalid, images: [] } }).render();
    assert.match(text(nodes), /Price unavailable/); assert.match(text(nodes), /Availability unavailable/); assert.match(text(nodes), /Location unavailable/);
    assert.ok(!nodes.some((node) => node.type === 'StarRating')); assert.equal(nodes.find((node) => node.type === 'RemoteImage').props.source, null);
    assert.doesNotMatch(text(nodes), /NaN|undefined|km from campus|\/month/);
  }
  assert.match(text(propertyCard({ property: { ...data.properties[0], available: 0 } }).render()), /No rooms listed/);
});
test('Home-linked Details no longer uses fixture flags to claim property or manager verification', () => {
  const result = screen({ params: { property: data.properties[0] } });
  const nodes = result.renderScreen('src/screens/PropertyScreen.tsx'); assert.ok(!nodes.some((node) => /verified/i.test(node.props.label ?? '')));
  assert.doesNotMatch(source('src/screens/PropertyScreen.tsx'), /VerifiedBadge|label="Verified"/);
});
test('responsive Home props allow natural greeting wrapping and retain complete accessible names at all text scales', () => {
  for (const width of [320, 411, 480, 800]) for (const fontScale of [1, 1.3, 2]) {
    const result = screen({ width, fontScale, profile: { ...profile.createEmptyProfile(), fullName: 'N'.repeat(90) } }); const nodes = result.render();
    const title = nodes.find((node) => node.props.accessibilityRole === 'header'); assert.equal(title.props.numberOfLines, undefined); assert.equal(title.props.ellipsizeMode, undefined); assert.equal(title.props.style.fontSize, 24); assert.equal(title.props.accessibilityLabel, `Hey, ${'N'.repeat(90)}!`);
    const list = featured(nodes), card = list.props.renderItem({ item: data.properties[0] }); assert.ok(card.props.style.width < width - 40); assert.ok(card.props.style.width <= 300);
    const listStyle = style(list.props.contentContainerStyle);
    const nextCardVisibleWidth = width - listStyle.paddingHorizontal - card.props.style.width - listStyle.gap;
    assert.ok(nextCardVisibleWidth >= 24); assert.equal(listStyle.gap, 16); assert.equal(listStyle.paddingHorizontal, 20);
    if (width >= 360) assert.equal(card.props.style.width, 300); else assert.ok(card.props.style.width >= 260);
    const university = named(nodes, `Explore accommodation for ${data.universities[0].name}`), uniWidth = style(university.props.style).width;
    assert.ok(uniWidth <= width - 40); if (fontScale >= 1.5 || width < 360) assert.equal(uniWidth, Math.min(720, width) - 40);
    assert.ok(style(named(nodes, 'See all accommodation').props.style).minHeight >= 44);
    const scroll = nodes.find((node) => node.type === 'ScrollView'); assert.ok(scroll.props.contentContainerStyle.paddingBottom >= 32);
  }
});
test('university rows stretch naturally while full names and cities remain untruncated', () => {
  for (const width of [320, 411, 480, 800]) for (const fontScale of [1, 1.3, 2]) {
    const nodes = screen({ width, fontScale }).render();
    const grid = nodes.find((node) => node.type === 'View' && style(node.props.style).flexWrap === 'wrap');
    assert.equal(style(grid.props.style).alignItems, 'stretch');
    for (const university of data.universities.slice(0, 4)) {
      const card = named(nodes, `Explore accommodation for ${university.name}`), cardStyle = style(card.props.style);
      assert.equal(cardStyle.height, undefined); assert.equal(cardStyle.maxHeight, undefined);
      const children = elements(card), name = named(children, university.name), city = named(children, university.city);
      assert.equal(name.props.numberOfLines, undefined); assert.equal(name.props.ellipsizeMode, undefined);
      assert.equal(name.props.style.flexGrow, 1); assert.equal(name.props.style.flexShrink, 0);
      assert.equal(city.props.numberOfLines, undefined); assert.equal(city.props.style.flexShrink, 0);
      assert.equal(cardStyle.padding, 16); assert.ok(cardStyle.width <= width - 40);
    }
  }
});
test('Home owns a light status bar only while focused, so returning from Explore restores contrast', () => {
  assert.equal(screen().render().find((node) => node.type === 'StatusBar').props.style, 'light');
  assert.equal(screen({ isFocused: false }).render().find((node) => node.type === 'StatusBar'), undefined);
});
test('Home honors lateral safe areas and preserves the established six-tab order and narrow-label wrapping', () => {
  const result = screen({ width: 480, insets: { left: 30, right: 20, bottom: 34 } }), nodes = result.render();
  const content = nodes.find((node) => node.type === 'ScrollView').props.contentContainerStyle;
  assert.equal(content.paddingLeft, 30); assert.equal(content.paddingRight, 20); assert.equal(content.paddingBottom, 66);
  const app = source('App.tsx'), tabs = [...app.matchAll(/<Tab.Screen\s+name="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tabs, ['Home', 'Explore', 'Favorites', 'Bookings', 'Messages', 'Profile']);
  assert.match(app, /numberOfLines=\{2\}/); assert.match(app, /labelWrapSpace/);
});
