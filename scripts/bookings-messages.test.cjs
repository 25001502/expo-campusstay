const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const { harness, load, elements, data, application, communication } = require('./profile-harness.cjs');
const bookings = load('src/bookings.ts');
const screen = (name, options = {}) => harness(`src/screens/${name}Screen.tsx`, options);
const list = (result) => result.render().find((node) => node.type === 'FlatList');
const header = (result) => elements(list(result).props.ListHeaderComponent);
const style = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const text = (nodes) => nodes.filter((node) => node.type === 'Text').map((node) => [node.props.children].flat(Infinity).join('')).join(' ');
const find = (nodes, label) => nodes.find((node) => (node.props.accessibilityLabel ?? node.props.label ?? node.props.children) === label);
const expand = (node) => typeof node?.type === 'function' ? expand(node.type(node.props)) : elements(node).flatMap((item) => typeof item.type === 'function' ? expand(item.type(item.props)) : [item]);
const rows = (result) => list(result).props.data.map((item) => expand(list(result).props.renderItem({ item })));
const chat = (options = {}) => screen('Chat', { params: { convId: 'c1' }, ...options });
const input = (result) => result.render().find((node) => node.type === 'TextInput');
const send = (result) => find(result.render(), 'Send message');
const state = () => communication.createCommunicationState(data.conversations, data.notifications);
const draft = () => {
  const value = application.createApplicationDraft(data.properties[0], 'r2');
  value.personal = { fullName: 'Thandi Student', studentNumber: '123456', universityId: 'univen', phone: '0712345678', email: 'thandi@example.com' };
  value.emergency = { fullName: 'Parent Student', relationship: 'Parent', phone: '0711111111' };
  value.selectedDocuments = ['student-id', 'registration', 'identity'];
  return value;
};
const record = () => application.createSubmittedApplication(draft(), '2026-10-14T12:00:00.000Z', 1);

for (const section of bookings.BOOKING_TABS) test(`Bookings selects ${section} through the actual route callback`, () => {
  const result = screen('Bookings');
  find(header(result), section).props.onPress();
  assert.equal(result.route.params.section, section);
  const selected = header(result).filter((node) => node.props.accessibilityState?.selected);
  assert.equal(selected.length, 1); assert.equal(selected[0].props.accessibilityLabel, section);
  assert.equal(list(result).props.data.length, section === 'Applications' || section === 'Cancelled' ? 0 : 1);
});

test('invalid booking sections fall back to Applications', () => {
  for (const section of [undefined, 'Approved', 'active', 'Paid']) {
    assert.equal(bookings.getBookingTab(section), 'Applications');
    assert.equal(find(header(screen('Bookings', { params: { section } })), 'Applications').props.accessibilityState.selected, true);
  }
});

const tabLayouts = (scale = 1) => Object.fromEntries(Array.from(bookings.BOOKING_TABS, (tab, index) => [tab, { x: index * 104 * scale, width: 100 * scale }]));
test('tab reveal waits for valid complete measurements and ignores invalid dimensions', () => {
  const layouts = tabLayouts();
  for (const dimensions of [[0, 520, 0], [280, 0, 0], [NaN, 520, 0], [280, Infinity, 0], [280, 520, NaN]]) {
    assert.equal(bookings.getBookingTabOffset('Completed', layouts, ...dimensions), undefined);
  }
  assert.equal(bookings.getBookingTabOffset('Completed', { ...layouts, Active: undefined }, 280, 520, 0), undefined);
  assert.equal(bookings.getBookingTabOffset('Completed', { ...layouts, Active: { x: -1, width: 100 } }, 280, 520, 0), undefined);
  assert.equal(bookings.getBookingTabOffset('Completed', layouts, 280, 100, 0), undefined);
});
test('tab reveal clamps both ends, keeps a visible selection still, and avoids tiny edge fragments', () => {
  const layouts = tabLayouts();
  assert.equal(bookings.getBookingTabOffset('Applications', layouts, 280, 520, 5000), 0);
  const x = bookings.getBookingTabOffset('Completed', layouts, 280, 520, 0);
  assert.equal(x, 132); // Completed ends at the edge; a useful part of Upcoming remains.
  assert.equal(bookings.getBookingTabOffset('Completed', layouts, 280, 520, x), x);
  assert.equal(bookings.getBookingTabOffset('Cancelled', layouts, 280, 520, -100), 236);
  assert.equal(bookings.getBookingTabOffset('Completed', layouts, 800, 520, 80), 0);
});
test('selected tab fits at every supported width/text scale without invalid offsets', () => {
  for (const width of [320, 411, 480, 800]) for (const scale of [1, 1.3, 2]) for (const selected of bookings.BOOKING_TABS) {
    const layouts = tabLayouts(scale); const viewport = width - 40; const content = 520 * scale;
    for (const current of [0, content / 2, content]) {
      const x = bookings.getBookingTabOffset(selected, layouts, viewport, content, current);
      assert.ok(x >= 0 && x <= Math.max(0, content - viewport));
      assert.ok(layouts[selected].x >= x - 0.01 && layouts[selected].x + layouts[selected].width <= x + viewport + 0.01);
    }
  }
  assert.equal(bookings.getBookingTabOffset('Applications', tabLayouts(4), 280, 2080, 100), 0);
});
test('fixture context appears once above booking cards and never reclassifies applications', () => {
  for (const section of ['Upcoming', 'Active', 'Completed', 'Cancelled']) {
    const result = screen('Bookings', { params: { section } });
    assert.match(text(header(result)), /Illustrative booking records · Not actual stays/);
    for (const row of rows(result)) assert.doesNotMatch(text(row), /On-device|Reference information|No live/);
  }
  assert.doesNotMatch(text(header(screen('Bookings', { applications: [record()] }))), /Illustrative booking/);
});
test('seed and local provenance survives mixed histories without repeating visual example labels', () => {
  const updated = communication.sendLocalMessage(state(), 'c1', 'My own question', '14:00').conversations[0];
  assert.equal(communication.hasIllustrativeMessages(updated), true);
  assert.equal(communication.getConversationPreview(updated).isExample, false);
  assert.equal(communication.hasIllustrativeMessages({ ...updated, messages: [updated.messages.at(-1)] }), false);
  const result = chat({ conversations: [updated] });
  assert.equal(text(result.render()).match(/Illustrative conversation/g)?.length, 1);
  assert.doesNotMatch(text(rows(result).flat()), /Example/);
  assert.match(text(rows(result).at(-1)), /14:00 · Saved locally/);
  assert.match(rows(result).at(-1)[0].props.accessibilityLabel, /saved locally/);
  const messages = screen('Messages', { conversations: [updated] });
  assert.match(text(header(messages)), /Illustrative conversations/);
  assert.match(text(rows(messages)[0]), /Saved locally/);
  assert.match(rows(messages)[0][0].props.accessibilityLabel, /illustrative conversation.*saved locally/);
});
test('fixture time labels accept valid clocks only and never invent relative dates', () => {
  for (const time of ['Yesterday', 'Today', '', '25:61', '12:99', '99:00']) assert.equal(communication.getMessageTimeLabel({ time }), '');
  for (const time of ['0:00', '09:30', '23:59']) assert.equal(communication.getMessageTimeLabel({ time }), time);
  assert.equal(communication.getMessageTimeLabel({ source: 'local', time: ' 14:05 ' }), '14:05');
  assert.equal(communication.getMessageTimeLabel({ source: 'local', time: ' ' }), 'Time unavailable');
});
test('long names and previews retain natural layout and full accessible content at enlarged text', () => {
  const conversation = { ...data.conversations[0], manager: 'A very long accommodation contact name '.repeat(3), messages: [{ ...data.conversations[0].messages[0], text: 'A long preview that must remain readable '.repeat(12) }] };
  const result = screen('Messages', { width: 320, fontScale: 2, conversations: [conversation] });
  const row = rows(result)[0];
  for (const value of [conversation.manager, conversation.messages[0].text.trim()]) {
    assert.equal(row.find((node) => node.type === 'Text' && node.props.children === value).props.numberOfLines, undefined);
    assert.ok(row[0].props.accessibilityLabel.includes(value));
  }
  assert.equal(style(row[0].props.style).height, undefined);
});
test('back from Chat returns through navigation without resetting local history or read state', () => {
  const result = chat(); input(result).props.onChangeText('Keep my message'); send(result).props.onPress();
  find(result.render(), 'Back to messages').props.onPress();
  assert.equal(result.calls.at(-1).action, 'goBack');
  const messages = result.renderScreen('src/screens/MessagesScreen.tsx').find((node) => node.type === 'FlatList');
  assert.equal(messages.props.data[0].messages.at(-1).text, 'Keep my message');
  assert.equal(messages.props.data[0].unread, 0);
});
test('the selected booking label scrolls fully into view after layout or text scaling', () => {
  const result = screen('Bookings', { params: { section: 'Active' }, width: 320, fontScale: 2 });
  const strip = header(result).find((node) => node.type === 'ScrollView'); const calls = [];
  strip.props.ref.current = { scrollTo: (value) => calls.push(value) };
  strip.props.onLayout({ nativeEvent: { layout: { width: 280 } } });
  strip.props.onContentSizeChange(804);
  for (const [index, label] of Array.from(bookings.BOOKING_TABS).entries()) {
    find(header(result), label).props.onLayout({ nativeEvent: { layout: { x: index * 160, width: 156 } } });
  }
  assert.equal(calls.length, 1);
  assert.ok(calls[0].x <= 320 && calls[0].x + 280 >= 476); assert.equal(calls[0].animated, false);
  strip.props.onScroll({ nativeEvent: { contentOffset: { x: 0 } } });
  find(header(result), 'Active').props.onPress();
  assert.equal(calls[1].x, calls[0].x);
  find(header(result), 'Upcoming').props.onLayout({ nativeEvent: { layout: { x: 160, width: 156 } } });
  assert.equal(calls.length, 2);
});
test('Applications empty state has useful existing Explore navigation', () => {
  const result = screen('Bookings'); const empty = list(result).props.ListEmptyComponent;
  assert.equal(empty.props.title, 'No applications yet'); assert.match(empty.props.description, /start an application/);
  empty.props.onAction(); assert.equal(result.calls.at(-1).args[0], 'Explore');
});
test('booking categories preserve fixture status without inferring it from old dates', () => {
  for (const [section, id, reference] of [['Upcoming', 'p2', '#CS-20522'], ['Active', 'p1', '#CS-20481'], ['Completed', 'p3', '#CS-19845']]) {
    const [item] = bookings.getBookingItems(section, data.properties);
    assert.equal(item.property.id, id); assert.equal(item.booking.ref, reference); assert.equal(item.booking.status, section);
  }
});
test('missing properties and invalid statuses never produce booking cards', () => {
  assert.equal(bookings.getBookingItems('Active', []).length, 0);
  assert.equal(bookings.getBookingItems('Active', data.properties, [{ propertyId: 'p1', ref: '#x', status: 'Approved' }]).length, 0);
  assert.equal(bookings.getBookingItems('Active', data.properties, [{ propertyId: 'p1', ref: '', status: 'Active' }]).length, 0);
});
test('booking card handles absent rent, room, date and image data', () => {
  const result = harness('src/screens/BookingsScreen.tsx', { exportName: 'BookingCard', props: { booking: { ref: '#x', status: 'Active' }, property: { ...data.properties[0], images: undefined }, onView() {} } });
  const nodes = expand(result.render()[0]);
  assert.match(text(nodes), /Room unavailable/); assert.match(text(nodes), /Move-in date unavailable/); assert.match(text(nodes), /Rent unavailable/);
  assert.equal(nodes.find((node) => node.type === 'RemoteImage').props.source, null);
});
test('rent and application dates never display NaN, Infinity or Invalid Date', () => {
  for (const value of [undefined, -1, NaN, Infinity]) assert.equal(bookings.formatMonthlyRent(value), 'Rent unavailable');
  assert.match(bookings.formatMonthlyRent(3500), /^R.*month$/);
  for (const value of ['', 'invalid', '2026-99-99']) assert.equal(application.formatApplicationDate(value), 'Date unavailable');
  assert.doesNotMatch(application.formatApplicationDate(record().submittedAt), /unavailable/);
});
test('applications use valid local status, property and selected room only', () => {
  const value = record();
  for (const changed of [{ propertyId: 'missing' }, { selectedRoomId: 'missing' }, { status: 'approved' }]) {
    assert.equal(list(screen('Bookings', { applications: [{ ...value, ...changed }] })).props.data.length, 0);
  }
});
test('application detail navigation passes its exact reference and property', () => {
  const value = record(); const result = screen('Bookings', { applications: [value] });
  const button = rows(result)[0].find((node) => node.type === 'Btn'); button.props.onPress();
  assert.equal(result.calls[0].args[0], 'AppStatus'); assert.equal(result.calls[0].args[1].applicationId, value.id);
  assert.equal(result.calls[0].args[1].property.id, value.propertyId);
  assert.match(button.props.accessibilityLabel, new RegExp(value.id));
  assert.match(text(rows(result)[0]), /No booking confirmed/);
});
test('application card invalid date and missing image use safe fallbacks', () => {
  const result = harness('src/screens/BookingsScreen.tsx', { exportName: 'ApplicationCard', props: { application: { ...record(), submittedAt: 'bad' }, property: { ...data.properties[0], images: [] }, onView() {} } });
  assert.match(text(expand(result.render()[0])), /Date unavailable/);
});
test('booking details preserve the exact fixture association and section on return', () => {
  const result = screen('Bookings', { params: { section: 'Completed' } });
  rows(result)[0].find((node) => node.type === 'Btn').props.onPress();
  result.route.params = result.calls.at(-1).args[1];
  const nodes = result.renderScreen('src/screens/AppStatusScreen.tsx');
  find(nodes, 'My Bookings').props.onPress();
  assert.equal(result.calls.at(-1).args[1].params.section, 'Completed');
  assert.equal(result.route.params.property.id, 'p3');
  assert.equal(result.route.params.sampleStatus, 'Completed');
  assert.doesNotMatch(text(nodes), /Manager review|Booking confirmed|Application Progress/);
});
test('local application status has accurate milestones and returns to Applications', () => {
  const value = record(); const result = screen('AppStatus', { applications: [value], params: { property: data.properties[0], applicationId: value.id } });
  const nodes = result.render(); assert.match(text(nodes), /No accommodation provider received it/);
  assert.ok(find(nodes, 'Application Progress')); assert.equal(nodes.filter((node) => node.type === 'StatusBadge')[0].props.label, 'Saved locally');
  find(nodes, 'My Applications').props.onPress(); assert.equal(result.calls[0].args[1].params.section, 'Applications');
});
test('missing or mismatched application IDs show the unavailable state', () => {
  for (const property of [data.properties[0], data.properties[1]]) {
    const result = screen('AppStatus', { applications: [record()], params: { property, applicationId: 'missing' } });
    assert.equal(result.render().find((node) => node.type === 'ErrorState').props.title, 'Application unavailable');
  }
  const result = screen('AppStatus', { applications: [record()], params: { property: data.properties[1], applicationId: record().id } });
  assert.ok(result.render().find((node) => node.type === 'ErrorState'));
});
test('five-step Apply callbacks create one application and synchronize Bookings and Profile', () => {
  const result = screen('Apply', { params: { property: data.properties[0], selectedRoomId: 'r2' } });
  const press = (label) => find(result.render(), label).props.onPress();
  const field = (label, value) => result.render().find((node) => node.type === 'Input' && node.props.label === label).props.onChangeText(value);
  press('Continue →');
  for (const [label, value] of [['Full name', 'Thandi Student'], ['Student number', '123456'], ['Phone number', '0712345678'], ['Email address', 'thandi@example.com']]) field(label, value);
  press('Continue →');
  for (const label of ['Student ID', 'Proof of Registration', 'ID / Passport']) press(`${label}, required selection`);
  press('Continue →'); field('Full name', 'Parent Student'); field('Phone number', '0711111111'); press('Review Application');
  const save = find(result.render(), 'Save Application'); save.props.onPress(); save.props.onPress();
  result.route.params = { section: 'Applications' };
  const applicationList = result.renderScreen('src/screens/BookingsScreen.tsx').find((node) => node.type === 'FlatList');
  assert.equal(applicationList.props.data.length, 1);
  assert.ok(find(result.renderScreen('src/screens/ProfileScreen.tsx'), '1 Applications'));
  result.route.params = { section: 'Upcoming' };
  const upcoming = result.renderScreen('src/screens/BookingsScreen.tsx').find((node) => node.type === 'FlatList');
  assert.equal(upcoming.props.data.length, 1); assert.equal(upcoming.props.data[0].booking.ref, '#CS-20522');
});

test('conversation list preserves stable IDs and exact property associations', () => {
  const result = screen('Messages');
  assert.deepEqual(Array.from(list(result).props.data, (item) => item.id), ['c1', 'c2']);
  for (const [index, property] of ['Campus View Residence', 'Varsity Heights'].entries()) assert.match(text(rows(result)[index]), new RegExp(property));
  assert.equal(list(result).props.keyExtractor(data.conversations[0]), 'c1');
});
test('conversation preview comes from the last message rather than stale cached text', () => {
  assert.equal(communication.getConversationPreview(data.conversations[0]).text, data.conversations[0].messages.at(-1).text);
  assert.match(text(rows(screen('Messages'))[0]), /schedule a viewing/);
});
test('fixture timestamps do not claim unsupported recent provider activity', () => {
  assert.equal(communication.getConversationPreview(data.conversations[0]).time, '10:32');
  assert.equal(communication.getConversationPreview(data.conversations[1]).time, '');
  assert.equal(communication.hasIllustrativeMessages(data.conversations[0]), true);
  assert.equal(communication.getConversationPreview(data.conversations[1]).isExample, true);
  assert.doesNotMatch(text(rows(screen('Messages'))[1]), /Yesterday/);
});
test('conversation opens the exact chat and synchronizes read counts', () => {
  const result = screen('Messages'); assert.equal(communication.getUnreadMessageCount(result.communication), 2);
  rows(result)[0][0].props.onPress();
  assert.equal(result.calls[0].args[1].convId, 'c1'); assert.equal(communication.getUnreadMessageCount(result.communication), 0);
  assert.equal(rows(result)[0].some((node) => style(node.props.style).backgroundColor === '#2563EB' && style(node.props.style).minWidth === 24), false);
});
test('second conversation navigation uses c2 without affecting other IDs', () => {
  const result = screen('Messages'); rows(result)[1][0].props.onPress(); assert.equal(result.calls[0].args[1].convId, 'c2');
  assert.equal(communication.getUnreadMessageCount(result.communication), 2);
});
test('unread counts retain message semantics and sanitize invalid values', () => {
  for (const [value, expected] of [[2, 2], [0, 0], [-3, 0], [NaN, 0], [Infinity, 0], [1.8, 1]]) {
    const current = communication.createCommunicationState([{ ...data.conversations[0], unread: value }], []);
    assert.equal(communication.getUnreadMessageCount(current), expected);
  }
});
test('empty conversations do not display stale preview or invented time', () => {
  const empty = { ...data.conversations[0], messages: [] };
  const preview = communication.getConversationPreview(empty); assert.equal(preview.text, 'No messages yet'); assert.equal(preview.time, '');
  assert.match(text(rows(screen('Messages', { conversations: [empty] }))[0]), /No messages yet/);
  assert.doesNotMatch(text(rows(screen('Messages', { conversations: [empty] }))[0]), /10:32/);
});
test('empty Messages offers truthful Explore navigation', () => {
  const result = screen('Messages', { conversations: [] }); const empty = list(result).props.ListEmptyComponent;
  assert.equal(empty.props.title, 'No conversations'); empty.props.onAction(); assert.equal(result.calls[0].args[0], 'Explore');
});
test('Chat missing ID never falls back to another conversation', () => {
  const result = chat({ params: { convId: 'missing' } }); assert.equal(result.render().find((node) => node.type === 'EmptyState').props.title, 'Conversation unavailable');
  assert.equal(input(result), undefined);
});
test('Chat links the explicit property and exposes no fabricated missing-property action', () => {
  const result = chat(); find(header(result), 'Open Campus View Residence property details').props.onPress();
  assert.equal(result.calls[0].args[1].property.id, 'p1');
  const missing = chat({ conversations: [{ ...data.conversations[0], propertyId: 'missing' }] });
  assert.match(text(header(missing)), /Property details unavailable/);
  assert.equal(header(missing).some((node) => node.props.icon === 'chevron-forward'), false);
});
test('Chat labels seed replies as examples without asserting verified identity or delivery', () => {
  const result = chat(); assert.match(text(result.render()), /Illustrative conversation/);
  for (const row of rows(result)) assert.match(row[0].props.accessibilityLabel, /example message/);
  assert.equal(rows(result)[1][0].props.accessibilityLabel.includes('Property manager at'), false);
});
test('empty Chat retains the composer and gives accurate local-only guidance', () => {
  const result = chat({ conversations: [{ ...data.conversations[0], messages: [] }] });
  assert.equal(list(result).props.ListEmptyComponent.props.title, 'No messages yet');
  assert.match(list(result).props.ListEmptyComponent.props.description, /stay in this session/); assert.ok(input(result));
});
test('whitespace cannot be sent through either composer or state transition', () => {
  const result = chat(); input(result).props.onChangeText(' \n  '); assert.equal(send(result).props.disabled, true);
  send(result).props.onPress(); assert.equal(result.communication.messageSequence, 0);
  const current = state(); assert.equal(communication.sendLocalMessage(current, 'c1', '  ', '14:00'), current);
});
test('length limit is enforced at input and local state boundaries', () => {
  const result = chat(); assert.equal(input(result).props.maxLength, 1000);
  input(result).props.onChangeText('x'.repeat(1001)); assert.equal(send(result).props.disabled, true); send(result).props.onPress();
  assert.equal(result.communication.messageSequence, 0);
  const current = state(); assert.equal(communication.sendLocalMessage(current, 'c1', 'x'.repeat(1001), '14:00'), current);
  assert.equal(communication.sendLocalMessage(current, 'c1', 'x'.repeat(1000), '14:00').messageSequence, 1);
});
test('local send trims, appends once under repeated taps, clears composer and updates preview', () => {
  const result = chat(); input(result).props.onChangeText('  A local question  ');
  const button = send(result); button.props.onPress(); button.props.onPress();
  assert.equal(result.communication.messageSequence, 1); assert.equal(input(result).props.value, ''); assert.equal(send(result).props.disabled, true);
  const message = result.communication.conversations[0].messages.at(-1); assert.equal(message.text, 'A local question'); assert.equal(message.source, 'local');
  assert.equal(communication.getConversationPreview(result.communication.conversations[0]).text, 'A local question');
  assert.match(text(elements(list(result).props.ListFooterComponent)), /Not delivered externally/);
});
test('local message time is consistent between Chat bubble and list preview', () => {
  const current = communication.sendLocalMessage(state(), 'c1', 'Hello', '14:05'); const conversation = current.conversations[0];
  assert.equal(communication.getConversationPreview(conversation).time, communication.getMessageTimeLabel(conversation.messages.at(-1)));
  assert.equal(communication.getConversationPreview(conversation).time, '14:05');
});
test('sending to c2 moves only c2 first and does not leak its messages into c1', () => {
  const current = state(); const next = communication.sendLocalMessage(current, 'c2', 'Only c2', '14:00');
  assert.equal(next.conversations[0].id, 'c2'); assert.equal(next.conversations[1], current.conversations[0]);
  assert.equal(next.conversations[1].messages.some((message) => message.text === 'Only c2'), false);
});
test('switching chat IDs clears the visible draft and feedback', () => {
  const result = chat(); input(result).props.onChangeText('Unsent c1'); result.route.params = { convId: 'c2' };
  assert.equal(input(result).props.value, ''); assert.equal(send(result).props.disabled, true);
});
test('scroll-to-latest follows the reader only near the bottom', () => {
  const result = chat(); const calls = []; list(result).props.ref.current = { scrollToOffset: (options) => calls.push(options) };
  list(result).props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  list(result).props.onContentSizeChange(320, 1000); result.flushAnimationFrames(); assert.equal(calls.length, 1);
  list(result).props.onScrollBeginDrag();
  list(result).props.onScroll({ nativeEvent: { contentSize: { height: 1000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 0 } } });
  list(result).props.onScrollEndDrag({ nativeEvent: { contentSize: { height: 1000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 0 } } });
  list(result).props.onContentSizeChange(320, 1000); result.flushAnimationFrames(); assert.equal(calls.length, 1);
  input(result).props.onChangeText('Latest'); send(result).props.onPress(); list(result).props.onContentSizeChange(320, 1500); result.flushAnimationFrames(); assert.equal(calls.length, 2);
  assert.equal(calls[1].animated, false);
  assert.equal(calls[1].offset, 1100);
});
test('Chat retains multiline input and keyboard tap/drag behavior', () => {
  const result = chat(); assert.equal(input(result).props.multiline, true);
  assert.equal(list(result).props.keyboardShouldPersistTaps, 'handled'); assert.equal(list(result).props.keyboardDismissMode, 'on-drag');
  assert.equal(result.render().find((node) => node.type === 'KeyboardAvoidingView').props.behavior, 'height');
});
test('a composer resize cannot cancel the pending scroll before the new message lays out', () => {
  const result = chat(); const calls = [];
  list(result).props.ref.current = { scrollToOffset: () => calls.push('end') };
  list(result).props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  list(result).props.onContentSizeChange(320, 1000); result.flushAnimationFrames();
  input(result).props.onChangeText('A long message '.repeat(20)); send(result).props.onPress();
  list(result).props.onLayout({ nativeEvent: { layout: { height: 500 } } }); result.flushAnimationFrames();
  list(result).props.onScroll({ nativeEvent: { contentSize: { height: 2000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 0 } } });
  list(result).props.onContentSizeChange(320, 2000); result.flushAnimationFrames();
  assert.equal(calls.length, 3);
  list(result).props.onScrollBeginDrag();
  list(result).props.onScroll({ nativeEvent: { contentSize: { height: 2000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 0 } } });
  list(result).props.onContentSizeChange(320, 2000); result.flushAnimationFrames(); assert.equal(calls.length, 3);
});

test('programmatic resize events cannot cancel follow-latest after the first content layout', () => {
  const result = chat(); const calls = [];
  list(result).props.ref.current = { scrollToOffset: (options) => calls.push(options) };
  list(result).props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  list(result).props.onContentSizeChange(320, 1000); result.flushAnimationFrames();
  input(result).props.onChangeText('Long multiline message '.repeat(20)); send(result).props.onPress();
  list(result).props.onContentSizeChange(320, 1500); result.flushAnimationFrames();
  list(result).props.onScroll({ nativeEvent: { contentSize: { height: 2000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 0 } } });
  list(result).props.onContentSizeChange(320, 2000); result.flushAnimationFrames();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].offset, 1600);
  list(result).props.onScrollBeginDrag();
  list(result).props.onScrollEndDrag({ nativeEvent: { contentSize: { height: 2000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 0 } } });
  list(result).props.onContentSizeChange(320, 2000); result.flushAnimationFrames(); assert.equal(calls.length, 3);
  list(result).props.onMomentumScrollEnd({ nativeEvent: { contentSize: { height: 2000 }, layoutMeasurement: { height: 400 }, contentOffset: { y: 1600 } } });
  list(result).props.onContentSizeChange(320, 2000); result.flushAnimationFrames(); assert.equal(calls.length, 4);
  list(result).props.onLayout({ nativeEvent: { layout: { height: 2400 } } }); result.flushAnimationFrames();
  assert.equal(calls.at(-1).offset, 0);
});
test('content and composer resizing coalesce into one scroll using the latest native measurements', () => {
  const result = chat(); const calls = [];
  list(result).props.ref.current = { scrollToOffset: (value) => calls.push(value) };
  list(result).props.onContentSizeChange(320, 1200);
  list(result).props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  list(result).props.onContentSizeChange(320, 2000);
  list(result).props.onLayout({ nativeEvent: { layout: { height: 500 } } });
  assert.equal(calls.length, 0);
  result.flushAnimationFrames();
  assert.equal(calls.length, 1); assert.equal(calls[0].offset, 1500); assert.equal(calls[0].animated, false);
});
test('a deliberate reader drag cancels an already scheduled automatic scroll', () => {
  const result = chat(); const calls = [];
  list(result).props.ref.current = { scrollToOffset: (value) => calls.push(value) };
  list(result).props.onContentSizeChange(320, 2000);
  list(result).props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  list(result).props.onScrollBeginDrag(); result.flushAnimationFrames();
  assert.equal(calls.length, 0);
});
test('notification c1 navigation and read state remain connected', () => {
  const result = screen('Notifications'); const item = list(result).props.data.find((item) => item.id === 'n3');
  expand(list(result).props.renderItem({ item }))[0].props.onPress(); assert.equal(result.calls[0].args[1].convId, 'c1');
  assert.equal(result.communication.notifications.find((notification) => notification.id === 'n3').read, true);
});
test('logout Cancel preserves applications/messages and confirmed logout restores seed state', () => {
  const result = chat({ applications: [record()] }); input(result).props.onChangeText('Temporary'); send(result).props.onPress();
  const logout = () => find(result.renderScreen('src/screens/ProfileScreen.tsx'), 'Log Out').props.onPress();
  logout(); assert.equal(result.alerts[0][2].find((button) => button.text === 'Cancel').onPress, undefined);
  assert.equal(result.communication.messageSequence, 1); assert.ok(find(result.renderScreen('src/screens/ProfileScreen.tsx'), '1 Applications'));
  logout(); result.alerts[1][2].find((button) => button.text === 'Log Out').onPress();
  assert.equal(result.communication.messageSequence, 0); assert.equal(communication.getUnreadMessageCount(result.communication), 2);
  assert.ok(find(result.renderScreen('src/screens/ProfileScreen.tsx'), '0 Applications'));
  assert.equal(result.calls.at(-1).args[0], 'Login');
});
test('focused tab status bars do not override the Profile or stack status bar', () => {
  for (const name of ['Bookings', 'Messages']) assert.equal(screen(name, { isFocused: false }).render().some((node) => node.type === 'StatusBar'), false);
});
test('communication remains in-memory without external delivery, persistence or receipt fields', () => {
  for (const file of ['src/communication.ts', 'src/state/CommunicationContext.tsx', 'src/screens/ChatScreen.tsx', 'src/screens/MessagesScreen.tsx']) {
    const source = fs.readFileSync(file, 'utf8'); assert.doesNotMatch(source, /fetch\(|axios|AsyncStorage|supabase|firebase|deliveredAt|readReceipt/);
  }
  const message = communication.sendLocalMessage(state(), 'c1', 'Hello', '14:00').conversations[0].messages.at(-1);
  assert.deepEqual(Object.keys(message).sort(), ['id', 'sender', 'source', 'text', 'time']);
});
for (const width of [320, 411, 480, 800]) for (const fontScale of [1, 1.3, 2]) test(`Bookings/Messages/Chat layout contract at ${width}dp and ${fontScale} text`, () => {
  const options = { width, fontScale, insets: { left: 8, right: 12, bottom: 34 } };
  const bookingScreen = screen('Bookings', options);
  const tabs = header(bookingScreen).filter((node) => node.props.accessibilityRole === 'tab');
  assert.equal(tabs.length, 5);
  for (const tab of tabs) { assert.ok(style(tab.props.style).minHeight >= 44); assert.equal(style(tab.props.style).height, undefined); assert.equal(style(tab.props.style).flexShrink, 0); assert.equal(elements(tab).find((node) => node.type === 'Text').props.numberOfLines, undefined); }
  assert.equal(header(bookingScreen).find((node) => node.type === 'ScrollView').props.horizontal, true);
  const messages = screen('Messages', options); const names = rows(messages)[0].filter((node) => node.type === 'Text');
  assert.equal(names.find((node) => node.props.children === 'Thabo Mkhize').props.numberOfLines, undefined);
  assert.equal(style(rows(messages)[0][0].props.style).height, undefined);
  const chatScreen = chat(options); assert.equal(style(input(chatScreen).props.style).minHeight, 44);
  assert.equal(style(chatScreen.render().find((node) => node.type === 'View').props.style).paddingLeft, 8);
  const bubble = rows(chatScreen)[1].find((node) => style(node.props.style).maxWidth);
  assert.equal(style(bubble.props.style).maxWidth, width < 360 || fontScale >= 1.3 ? '88%' : '78%');
  assert.equal(rows(chatScreen)[1].find((node) => node.type === 'Text' && node.props.children === data.conversations[0].messages[1].text).props.numberOfLines, undefined);
});
