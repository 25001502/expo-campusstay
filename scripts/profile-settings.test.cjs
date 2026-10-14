const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { harness, data, application, profile, communication, elements } = require('./profile-harness.cjs');
const screen = (name, options) => harness(`src/screens/${name}Screen.tsx`, options);
const find = (nodes, label) => nodes.find((node) => node.props.children === label || node.props.accessibilityLabel === label || node.props.label === label);
const text = (nodes) => nodes.filter((node) => node.type === 'Text').map((node) => node.props.children).flat(Infinity).filter((item) => typeof item === 'string').join(' ');
const saved = () => ({ ...profile.createEmptyProfile(), fullName: 'Alex Student', email: 'alex@example.com', phone: '+27 71 234 5678' });
function edit(result) { find(result.render(), 'Edit details').props.onPress(); return result.render(); }
function record(property = data.properties[0], sequence = 1) {
  const draft = application.createApplicationDraft(property, property.rooms[0].id);
  draft.selectedDocuments = ['student-id', 'identity'];
  return application.createSubmittedApplication(draft, '2026-10-14T00:00:00Z', sequence);
}

for (const [label, route] of [['Personal Information', 'PersonalInformation'], ['My Documents', 'MyDocuments'], ['Notifications, 2 unread', 'Notifications'], ['Security', 'Security'], ['Help & Support', 'HelpSupport'], ['Terms & Privacy', 'TermsPrivacy']]) {
  test(`Profile ${label} executes the typed destination callback`, () => {
    const result = screen('Profile'); find(result.render(), label).props.onPress();
    assert.deepEqual(result.calls, [{ action: 'navigate', args: [route] }]);
  });
}
test('fresh Profile renders an honest empty identity', () => {
  const copy = text(screen('Profile').render());
  assert.match(copy, /Your profile/); assert.doesNotMatch(copy, /Siyanda|2021012345|verified/i);
});
test('Profile header uses trimmed saved names and a short subtitle without a sign-in line', () => {
  for (const fullName of ['', '   ', '  Thandi Student  ', 'Nokuthula '.repeat(9).trim()]) {
    const nodes = screen('Profile', { profile: { ...saved(), fullName } }).render();
    const title = nodes.find((node) => node.props.accessibilityRole === 'header');
    assert.equal(title.props.children, fullName.trim() || 'Your profile');
    assert.equal(title.props.numberOfLines, undefined);
    assert.match(text(nodes), fullName.trim() ? /Personal information/ : /Add your personal details/);
    assert.doesNotMatch(text(nodes), /No sign-in required/);
  }
});
test('Profile header updates from the existing provider and clears after confirmed logout', () => {
  const result = screen('Profile', { profile: saved() });
  result.profile.fullName = 'Changed Name';
  assert.equal(result.render().find((node) => node.props.accessibilityRole === 'header').props.children, 'Changed Name');
  find(result.render(), 'Log Out').props.onPress(); result.alerts[0][2][1].onPress();
  assert.equal(result.render().find((node) => node.props.accessibilityRole === 'header').props.children, 'Your profile');
  assert.match(text(result.render()), /Add your personal details/);
});
for (const [label, destination] of [['Applications', 'Bookings'], ['Saved', 'Favorites'], ['Unread', 'Notifications']]) {
  test(`${label} statistic is an accessible single-action shortcut`, () => {
    const result = screen('Profile'), nodes = result.render();
    const card = nodes.find((node) => node.props.accessibilityLabel?.endsWith(` ${label}`));
    assert.equal(card.props.accessibilityRole, 'button'); assert.ok(card.props.accessibilityHint);
    assert.ok(card.props.activeOpacity < 1); assert.ok(card.props.style.minHeight >= 44);
    card.props.onPress(); assert.equal(result.calls.length, 1); assert.equal(result.calls[0].args[0], destination);
    if (label === 'Applications') assert.equal(result.calls[0].args[1].section, 'Applications');
  });
}
test('statistics reflect provider counts including multiple digits and empty collections', () => {
  for (const count of [0, 12]) {
    const result = screen('Profile', { applications: Array.from({ length: count }, () => record()), favoriteIds: Array.from({ length: count }, (_, i) => `p${i}`) });
    const nodes = result.render();
    for (const label of ['Applications', 'Saved']) {
      const card = find(nodes, `${count} ${label}`); assert.ok(card); card.props.onPress();
    }
    assert.equal(result.calls.length, 2);
  }
});
test('Unread shortcut and menu badge stay synchronized for individual reads and all-read', () => {
  const result = screen('Profile');
  for (const count of [2, 1, 0]) {
    const nodes = result.render();
    assert.ok(find(nodes, `${count} Unread`));
    assert.ok(find(nodes, count ? `Notifications, ${count} unread` : 'Notifications'));
    const next = result.communication.notifications.find((item) => !item.read);
    if (next) next.read = true;
  }
});
test('Unread count supports multiple digits and no notifications without a separate counter', () => {
  for (const count of [0, 12]) {
    const notifications = Array.from({ length: count }, (_, i) => ({ ...data.notifications[0], id: `notification-${i}`, read: false }));
    const nodes = screen('Profile', { notifications, fontScale: 2 }).render();
    assert.ok(find(nodes, `${count} Unread`));
    assert.ok(find(nodes, count ? `Notifications, ${count} unread` : 'Notifications'));
  }
});
test('Applications shortcut overrides a previously selected booking section without duplicate selection state', () => {
  const result = screen('Bookings');
  const tab = (nodes, label) => elements(nodes.find((node) => node.type === 'FlatList').props.ListHeaderComponent).find((node) => node.props.accessibilityRole === 'tab' && text(elements(node)) === label);
  tab(result.render(), 'Active').props.onPress();
  assert.equal(tab(result.render(), 'Active').props.accessibilityState.selected, true);
  result.route.params = { section: 'Applications' };
  let nodes = result.render();
  assert.equal(tab(nodes, 'Applications').props.accessibilityState.selected, true);
  assert.equal(nodes.find((node) => node.type === 'FlatList').props.ListEmptyComponent.props.title, 'No applications yet');
  assert.equal(result.route.params.section, 'Applications'); assert.equal(result.calls.length, 1);
  tab(nodes, 'Active').props.onPress(); nodes = result.render();
  assert.equal(tab(nodes, 'Active').props.accessibilityState.selected, true);
  result.route.params = { section: 'Applications' };
  assert.equal(tab(result.render(), 'Applications').props.accessibilityState.selected, true);
});
test('optional empty personal details are valid and render missing fields', () => {
  assert.equal(Object.keys(profile.validateProfile(profile.createEmptyProfile())).length, 0);
  const copy = text(screen('PersonalInformation').render()); assert.match(copy, /Not provided/);
});
test('profile validation accepts international names and phone formats', () => {
  assert.equal(Object.keys(profile.validateProfile({ ...saved(), fullName: "Nokuthula O’Connor-Müller", phone: '+44 (20) 7946-0958' })).length, 0);
});
for (const [field, value] of [['email', 'not-an-email'], ['phone', 'abc123'], ['phone', '+123'], ['fullName', 'a'.repeat(101)], ['studentNumber', 'a'.repeat(41)], ['universityId', 'missing'], ['fullName', 'Alex\u0000Student']]) {
  test(`validation rejects malformed ${field} (${JSON.stringify(value.slice(0, 15))})`, () => assert.ok(profile.validateProfile({ ...saved(), [field]: value })[field]));
}
test('save normalizes whitespace immutably without changing an application', () => {
  const original = saved(), app = record(), before = JSON.stringify(app);
  const next = profile.profileReducer(original, { type: 'save', details: { ...original, fullName: '  New Name  ' } });
  assert.equal(next.fullName, 'New Name'); assert.equal(original.fullName, 'Alex Student'); assert.equal(JSON.stringify(app), before);
});
test('reducer rejects malformed updates even when a caller bypasses the form', () => {
  const original = saved(); assert.equal(profile.profileReducer(original, { type: 'save', details: { ...original, email: 'invalid' } }), original);
});
test('profile reset clears edits without inventing a starting identity', () => assert.deepEqual(profile.profileReducer(saved(), { type: 'reset' }), profile.createEmptyProfile()));
test('screen save updates session details that survive reopening', () => {
  const result = screen('PersonalInformation'); find(edit(result), 'Full name').props.onChangeText('  Thandi Student  ');
  find(result.render(), 'Save changes').props.onPress();
  assert.equal(result.profile.fullName, 'Thandi Student'); assert.match(text(result.render()), /not sent to a server/);
  assert.match(text(screen('PersonalInformation', { profile: result.profile }).render()), /Thandi Student/);
});
test('screen validation prevents saving and exposes field errors', () => {
  const result = screen('PersonalInformation'); find(edit(result), 'Email address').props.onChangeText('invalid');
  find(result.render(), 'Save changes').props.onPress();
  assert.equal(result.profile.email, ''); assert.match(find(result.render(), 'Email address').props.error, /valid email/);
});
test('cancel editing preserves previous values after explicit discard', () => {
  const result = screen('PersonalInformation', { profile: saved() }); find(edit(result), 'Full name').props.onChangeText('Changed');
  find(result.render(), 'Cancel editing').props.onPress();
  const actions = result.alerts.at(-1)[2]; assert.equal(actions[0].onPress, undefined);
  actions[1].onPress(); assert.equal(result.profile.fullName, 'Alex Student'); assert.match(text(result.render()), /Alex Student/);
});
test('unsaved back navigation is guarded and dispatches only after discard', () => {
  const result = screen('PersonalInformation'); find(edit(result), 'Full name').props.onChangeText('Changed'); result.render();
  assert.equal(result.removal.enabled, true); result.removal.callback({ data: { action: 'back-action' } });
  assert.equal(result.calls.length, 0); result.alerts.at(-1)[2][1].onPress();
  assert.deepEqual(result.calls, [{ action: 'dispatch', args: ['back-action'] }]);
});
test('documents empty state navigates to Explore and makes no upload claims', () => {
  const result = screen('MyDocuments'); const empty = result.render().find((node) => node.type === 'EmptyState');
  assert.equal(empty.props.title, 'No document selections'); empty.props.onAction();
  assert.equal(result.calls[0].action, 'popTo'); assert.equal(result.calls[0].args[0], 'Main'); assert.equal(result.calls[0].args[1].screen, 'Explore'); assert.equal(result.calls.length, 1);
  assert.match(text(result.render()), /No document files.*not uploaded files/);
});
test('document groups preserve application identity and do not mix category selections', () => {
  const one = record(), two = record(data.properties[1], 2); two.selectedDocuments = ['funding'];
  const groups = profile.getApplicationDocumentGroups([one, two], data.properties);
  assert.equal(groups[0].applicationId, one.id); assert.equal(groups[1].applicationId, two.id);
  assert.equal(groups[0].categories.find((item) => item.id === 'funding').selected, false);
  assert.equal(groups[1].categories.find((item) => item.id === 'funding').selected, true);
});
test('document action opens the exact application with truthful accessible status', () => {
  const app = record(), result = screen('MyDocuments', { applications: [app] }), nodes = result.render();
  assert.ok(nodes.some((node) => node.props.accessibilityLabel?.includes('No file uploaded or verified')));
  find(nodes, 'View application').props.onPress();
  assert.equal(result.calls[0].args[1].applicationId, app.id); assert.equal(result.calls[0].args[1].property.id, app.propertyId);
});
test('missing property or room preserves categories while withholding invalid navigation', () => {
  for (const patch of [{ propertyId: 'missing' }, { selectedRoomId: 'missing' }]) {
    const result = screen('MyDocuments', { applications: [{ ...record(), ...patch }] }), nodes = result.render();
    assert.equal(find(nodes, 'View application'), undefined); assert.match(text(nodes), /unavailable/); assert.match(text(nodes), /Category selected/);
  }
});
test('missing document selections safely produce unselected category statuses', () => {
  const app = record(); delete app.selectedDocuments;
  assert.ok(profile.getApplicationDocumentGroups([app], data.properties)[0].categories.every((item) => !item.selected));
});
test('individual read and Mark All Read update the same state used by Profile badge', () => {
  const initial = communication.createCommunicationState(data.conversations, data.notifications);
  const one = communication.markNotificationRead(initial, 'n1'); assert.equal(communication.getUnreadNotificationCount(one), 1);
  const all = communication.markAllNotificationsRead(one); assert.equal(communication.getUnreadNotificationCount(all), 0);
  const result = screen('Profile');
  const notificationScreen = screen('Notifications'); const nodes = notificationScreen.render();
  const header = nodes.find((node) => node.type === 'ScreenHeader'); header.props.trailingAction.props.onPress();
  assert.equal(communication.getUnreadNotificationCount(notificationScreen.communication), 0);
  result.communication.notifications.forEach((item) => { item.read = true; });
  const row = find(result.render(), 'Notifications'); assert.ok(row); assert.equal(row.props.accessibilityLabel, 'Notifications');
  assert.ok(!elements(row).some((node) => node.type === 'Text' && typeof node.props.children === 'number'));
});
test('notification row marks read and reports a missing destination instead of fabricating one', () => {
  const result = screen('Notifications'); const list = result.render().find((node) => node.type === 'FlatList');
  const row = list.props.renderItem({ item: result.communication.notifications[0] }); row.props.onPress();
  assert.equal(result.communication.notifications[0].read, true); assert.equal(result.calls.length, 0); assert.equal(result.alerts[0][0], 'No destination available');
});
test('message notification opens its existing related conversation', () => {
  const result = screen('Notifications'); const list = result.render().find((node) => node.type === 'FlatList');
  list.props.renderItem({ item: result.communication.notifications.find((item) => item.id === 'n3') }).props.onPress();
  assert.equal(result.calls[0].action, 'navigate'); assert.equal(result.calls[0].args[0], 'Chat'); assert.equal(result.calls[0].args[1].convId, 'c1'); assert.equal(result.calls.length, 1);
});
test('empty notifications use a meaningful empty state', () => assert.equal(screen('Notifications', { notifications: [] }).render().find((node) => node.type === 'FlatList').props.ListEmptyComponent.props.title, 'No notifications'));
test('a notification whose linked conversation is missing cannot open a broken destination', () => {
  const result = screen('Notifications', { conversations: [] }); const list = result.render().find((node) => node.type === 'FlatList');
  list.props.renderItem({ item: result.communication.notifications.find((item) => item.id === 'n3') }).props.onPress();
  assert.equal(result.calls.length, 0); assert.equal(result.alerts[0][0], 'No destination available');
});
test('Security offers only a return to the established Profile session controls', () => {
  const result = screen('Security'), nodes = result.render(); find(nodes, 'Return to Profile').props.onPress();
  assert.deepEqual(result.calls, [{ action: 'goBack', args: [] }]); assert.equal(result.alerts.length, 0);
  assert.equal(nodes.filter((node) => node.type === 'Btn').length, 1); assert.match(text(nodes), /reset emails are unavailable/);
});
test('logout Cancel is inert and confirmation resets every established owner plus Profile', () => {
  const result = screen('Profile', { profile: saved() }); find(result.render(), 'Log Out').props.onPress();
  assert.equal(result.alerts[0][1], 'Are you sure you want to log out?'); const actions = result.alerts[0][2];
  assert.equal(actions[0].text, 'Cancel'); assert.equal(actions[0].onPress, undefined); assert.equal(result.resets.length, 0);
  actions[1].onPress(); assert.deepEqual(result.resets, ['applications', 'favorites', 'communication', 'profile']);
  assert.deepEqual(result.profile, profile.createEmptyProfile()); assert.deepEqual(result.calls, [{ action: 'replace', args: ['Login'] }]);
});
test('FAQ expansion and collapse reveal accurate answers', () => {
  const result = screen('HelpSupport'); const question = profile.PROFILE_FAQS.find((item) => item.id === 'apply');
  find(result.render(), question.question).props.onPress(); let nodes = result.render();
  assert.equal(find(nodes, question.question).props.accessibilityState.expanded, true); assert.match(text(nodes), /not sent to a provider/);
  find(nodes, question.question).props.onPress(); nodes = result.render(); assert.equal(find(nodes, question.question).props.accessibilityState.expanded, false);
  assert.ok(!text(nodes).includes(question.answer));
});
test('Help does not invent contact details or send-message success', () => {
  const nodes = screen('HelpSupport').render(); assert.match(text(nodes), /support contact channel is not available/);
  assert.equal(nodes.filter((node) => node.type === 'Btn').length, 0); assert.doesNotMatch(text(nodes), /support@|message sent/i);
});
test('Terms explains absent policies and avoids formal acceptance or legal promises', () => {
  const nodes = screen('TermsPrivacy').render(); assert.match(text(nodes), /not a legal agreement/); assert.match(text(nodes), /not available yet/);
  assert.match(text(nodes), /external image service/); assert.equal(nodes.filter((node) => node.type === 'Btn').length, 0);
});
for (const name of ['PersonalInformation', 'MyDocuments', 'Security', 'HelpSupport', 'TermsPrivacy']) {
  test(`${name} header back callback returns without login or manager access`, () => {
    const result = screen(name); result.render().find((node) => node.type === 'ProfileLayout').props.onBack();
    assert.deepEqual(result.calls, [{ action: 'goBack', args: [] }]);
  });
}
test('new profile modules introduce no network, persistence, or backend clients', () => {
  const files = ['src/profile.ts', 'src/state/ProfileContext.tsx', ...['PersonalInformation', 'MyDocuments', 'Security', 'HelpSupport', 'TermsPrivacy'].map((name) => `src/screens/${name}Screen.tsx`)];
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), /fetch\(|axios|AsyncStorage|SecureStore|supabase|firebase|expo-notifications/i);
});
