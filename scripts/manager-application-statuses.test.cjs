const assert = require('node:assert/strict');
const test = require('node:test');
const { load, harness, elements } = require('./profile-harness.cjs');
const file = 'src/screens/ManagerScreen.tsx';
const component = (screen, name) => screen.render().find((node) => typeof node.type === 'function' && node.type.name === name);
const page = (screen) => component(screen, 'ApplicationsPage');
const detail = (screen) => component(screen, 'ApplicationDetail');
const list = (screen) => screen.render().find((node) => node.props.accessibilityLabel === 'Applications').props.onPress();
function cards(screen) {
  const current = page(screen);
  return elements(current.type(current.props)).filter((node) => node.type === 'TouchableOpacity' && node.props.accessibilityRole === 'button');
}
const badges = (card) => elements(card).filter((node) => node.type === 'StatusBadge');
const labels = (card) => badges(card).map((node) => node.props.label);
function choose(screen, index, status) {
  const current = page(screen);
  current.props.onOpen(current.props.applications[index]);
  const view = detail(screen);
  elements(view.type(view.props)).find((node) => node.props.accessibilityLabel === `Funding review: ${status}`).props.onPress();
  detail(screen).props.onBack();
}
const text = (card) => elements(card).filter((node) => node.type === 'Text').map((node) => node.props.children).flat(Infinity).join(' ');

test('all cards show their existing application status and default funding status', () => {
  const screen = harness(file);
  list(screen);
  const records = page(screen).props.applications;
  const rendered = cards(screen);
  assert.equal(rendered.length, records.length);
  rendered.forEach((card, index) => {
    assert.deepEqual(labels(card), [`Application: ${records[index].status}`, 'Funding: Not reviewed']);
    assert.match(card.props.accessibilityLabel, new RegExp(`Application: ${records[index].status}, Funding: Not reviewed`));
    assert.ok(text(card).includes(records[index].applicantName));
    assert.ok(text(card).includes(records[index].documentSummary));
    card.props.onPress();
    assert.equal(detail(screen).props.application.id, records[index].id);
    detail(screen).props.onBack();
  });
});

test('Needs information updates only the relevant card without changing any application status', () => {
  const screen = harness(file);
  list(screen);
  const records = page(screen).props.applications;
  const before = cards(screen).map(labels);
  choose(screen, 1, 'Needs information');
  const after = cards(screen);
  after.forEach((card, index) => assert.deepEqual(labels(card), index === 1 ? [before[index][0], 'Funding: Needs information'] : before[index]));
  assert.ok(page(screen).props.applications.every((record, index) => record === records[index]), 'Funding labels read saved reviews without replacing application records');
  assert.equal(badges(after[1])[1].props.variant, 'amber');
  assert.ok(!elements(after[1]).some((node) => node.props.accessibilityRole === 'alert'));
  assert.equal(screen.alerts.length, 0);
  assert.equal(screen.calls.length, 0, 'No student notification or external action');
});

test('Reviewed locally and Not reviewed remain separate from overall application status', () => {
  const screen = harness(file);
  list(screen);
  choose(screen, 0, 'Reviewed locally');
  choose(screen, 1, 'Needs information');
  assert.deepEqual(labels(cards(screen)[0]), ['Application: New', 'Funding: Reviewed locally']);
  assert.equal(badges(cards(screen)[0])[1].props.variant, 'blue', 'Local review does not use a verified/approved green badge');
  choose(screen, 0, 'Not reviewed');
  assert.deepEqual(labels(cards(screen)[0]), ['Application: New', 'Funding: Not reviewed']);
  assert.equal(badges(cards(screen)[0])[1].props.variant, 'gray');
  assert.deepEqual(labels(cards(screen)[1]), ['Application: In review', 'Funding: Needs information']);
});

test('cards use the retained session reviews after leaving and re-entering the manager portal', () => {
  const managerModule = load('src/manager.ts');
  const first = harness(file, { managerModule });
  list(first);
  choose(first, 1, 'Needs information');
  first.render().find((node) => node.props.label === 'Return to student Home').props.onPress();
  const reopened = harness(file, { managerModule });
  list(reopened);
  assert.deepEqual(cards(reopened).map(labels), cards(first).map(labels));
  assert.deepEqual(labels(cards(reopened)[1]), ['Application: In review', 'Funding: Needs information']);
  const restarted = harness(file, { managerModule: load('src/manager.ts') });
  list(restarted);
  assert.ok(cards(restarted).every((card) => labels(card)[1] === 'Funding: Not reviewed'));
});

test('filtering applications does not associate a review with another card index', () => {
  const screen = harness(file);
  list(screen);
  choose(screen, 1, 'Needs information');
  page(screen).props.onFilter('In review');
  assert.equal(cards(screen).length, 1);
  assert.deepEqual(labels(cards(screen)[0]), ['Application: In review', 'Funding: Needs information']);
  page(screen).props.onFilter('New');
  assert.deepEqual(labels(cards(screen)[0]), ['Application: New', 'Funding: Not reviewed']);
});

test('historical Studio room references and property information remain readable', () => {
  const screen = harness(file);
  list(screen);
  const historical = cards(screen)[2];
  assert.match(text(historical), /Studio Room/);
  assert.match(text(historical), /historical label/);
  assert.ok(page(screen).props.properties.some((property) => text(historical).includes(property.name)));
  assert.deepEqual(labels(historical), ['Application: Review complete', 'Funding: Not reviewed']);
});

// These are headless layout-contract checks, not native glyph measurement.
for (const platform of ['android', 'ios']) for (const width of [320, 375]) for (const fontScale of [1, 1.3, 2]) {
  test(`status labels can wrap without truncation at ${platform}/${width}dp/${fontScale}`, () => {
    const screen = harness(file, { platform, width, fontScale });
    list(screen);
    choose(screen, 2, 'Needs information');
    const card = cards(screen)[2];
    assert.equal(card.props.style.height, undefined, 'Card height can grow with wrapped text');
    assert.equal(card.props.style.overflow, undefined);
    const row = elements(card).find((node) => node.props.style?.flexWrap === 'wrap');
    assert.ok(row);
    assert.equal(row.props.style.flexDirection, 'row');
    const items = elements(row).filter((node) => node.props.style?.maxWidth === '100%');
    assert.equal(items.length, 2);
    assert.ok(items.every((node) => node.props.style.flexShrink === 1));
    assert.deepEqual(labels(card), ['Application: Review complete', 'Funding: Needs information']);
    assert.ok(elements(card).every((node) => !node.props.numberOfLines && !node.props.ellipsizeMode));
  });
}
