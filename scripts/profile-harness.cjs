// Actual screen callbacks with native modules stubbed; this is not device execution.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function load(file, modules = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
  }).outputText;
  vm.runInNewContext(code, { ...globals, module, exports: module.exports, require: (name) => modules[name] ?? (name.startsWith('.') && fs.existsSync(path.resolve(root, path.dirname(file), name) + '.ts') ? load(path.relative(root, path.resolve(root, path.dirname(file), name) + '.ts'), modules) : require(name)) }, { filename: file });
  return module.exports;
}
const data = load('src/data.ts');
const application = load('src/application.ts');
const profile = load('src/profile.ts', { './application': application, './data': data });
const communication = load('src/communication.ts');
const bookings = load('src/bookings.ts');
const theme = load('src/theme.ts');
const discovery = load('src/discovery.ts', { './data': data });
const home = load('src/home.ts');
const elements = (node) => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(elements)];
function harness(file, options = {}) {
  let details = options.profile ?? profile.createEmptyProfile();
  let comm = communication.createCommunicationState(options.conversations ?? data.conversations, options.notifications ?? data.notifications);
  let applications = options.applications ?? [], applicationSequence = 0;
  const alerts = [], calls = [], resets = [], screenSlots = new Map(), components = new Map();
  let slots = [], focusEffect, keyboardDismissals = 0;
  let favoriteIds = [...(options.favoriteIds ?? ['p1'])];
  const route = { params: options.params };
  let hookIndex = 0, removal, renderChanged = false;
  let frameSequence = 0;
  const frames = new Map();
  const frameGlobals = { requestAnimationFrame: (callback) => { const id = ++frameSequence; frames.set(id, callback); return id; }, cancelAnimationFrame: (id) => frames.delete(id) };
  const navigation = Object.fromEntries(['navigate', 'replace', 'reset', 'popTo', 'goBack', 'dispatch'].map((action) => [action, (...args) => calls.push({ action, args })]));
  navigation.setParams = (params) => { route.params = { ...route.params, ...params }; calls.push({ action: 'setParams', args: [params] }); };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useEffect: () => {}, useRef: (current) => {
      const i = hookIndex++;
      if (!(i in slots)) slots[i] = { current };
      return slots[i];
    }, useCallback: (callback) => callback, useMemo: (callback) => callback(), useState: (initial) => {
      const i = hookIndex++;
      const stateSlots = slots;
      if (!(i in stateSlots)) stateSlots[i] = typeof initial === 'function' ? initial() : initial;
      return [stateSlots[i], (value) => {
        const next = typeof value === 'function' ? value(stateSlots[i]) : value;
        if (!Object.is(next, stateSlots[i])) { stateSlots[i] = next; renderChanged = true; }
      }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      Alert: { alert: (...args) => alerts.push(args) },
      Image: 'Image', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' },
      View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', ScrollView: 'ScrollView', FlatList: 'FlatList',
      Keyboard: { dismiss: () => { keyboardDismissals++; } },
      StyleSheet: { create: (styles) => styles, absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }, useWindowDimensions: () => ({ width: options.width ?? 360, height: options.height ?? 800, fontScale: options.fontScale ?? 1 }),
    },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '@react-native-picker/picker': { Picker: Object.assign(() => null, { Item: 'PickerItem' }) },
    '@react-navigation/native': { useIsFocused: () => options.isFocused ?? true, useFocusEffect: (callback) => { focusEffect = callback; }, usePreventRemove: (enabled, callback) => { removal = { enabled, callback }; } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0, ...options.insets }) },
    '@react-native-community/slider': { __esModule: true, default: 'Slider' },
    '@fortawesome/react-native-fontawesome': { FontAwesomeIcon: 'FontAwesomeIcon' },
    '@fortawesome/free-solid-svg-icons': {},
    '../components/UI': { Btn: 'Btn', Input: 'Input', EmptyState: 'EmptyState', ErrorState: 'ErrorState', ScreenHeader: 'ScreenHeader', IconButton: 'IconButton', Badge: 'Badge', StatusBadge: 'StatusBadge', StarRating: 'StarRating', Divider: 'Divider' },
    '../components/PropertyCard': { PropertyCard: 'PropertyCard' },
    '../home': home, '../discovery': options.data ? load('src/discovery.ts', { './data': { ...data, ...options.data } }) : discovery,
    '../demoAuth': load('src/demoAuth.ts'), '../../assets/google-g.png': 'google-mark',
    './UI': { Badge: 'Badge', Btn: 'Btn', IconButton: 'IconButton', StarRating: 'StarRating' },
    './RemoteImage': { RemoteImage: 'RemoteImage' },
    '../components/RemoteImage': { RemoteImage: 'RemoteImage' },
    '../application': application, '../bookings': bookings,
    '../components/ProfileLayout': { ProfileLayout: 'ProfileLayout', ProfileSection: 'ProfileSection', profileStyles: {} },
    '../data': { ...data, ...options.data }, '../profile': profile, '../theme': theme, '../communication': communication,
    '../rooms': load('src/rooms.ts'), '../propertyDetails': load('src/propertyDetails.ts'),
    '../state/ProfileContext': { useProfile: () => ({ profile: details, saveProfile: (value) => {
      if (Object.keys(profile.validateProfile(value)).length) return false;
      details = profile.profileReducer(details, { type: 'save', details: value }); return true;
    }, resetProfile: () => { details = profile.createEmptyProfile(); resets.push('profile'); } }) },
    '../state/ApplicationContext': { useApplications: () => ({ applications,
      submitApplication: (draft) => {
        const record = application.createSubmittedApplication(draft, '2026-10-14T12:00:00.000Z', ++applicationSequence);
        applications = application.addSubmittedApplication(applications, record); return record;
      },
      getApplication: (id) => applications.find((item) => item.id === id),
      clearApplications: () => { applications = []; applicationSequence = 0; resets.push('applications'); } }) },
    '../state/FavoritesContext': { useFavorites: () => ({ favoriteIds, isFavorite: (id) => favoriteIds.includes(id),
      toggleFavorite: (id) => { favoriteIds = discovery.favoritesReducer(favoriteIds, { type: 'toggle', id }); },
      removeFavorite: (id) => { favoriteIds = discovery.favoritesReducer(favoriteIds, { type: 'remove', id }); },
      resetFavorites: () => { favoriteIds = [...(options.favoriteIds ?? ['p1'])]; resets.push('favorites'); } }) },
    '../state/CommunicationContext': { useCommunication: () => ({
      conversations: comm.conversations,
      notifications: comm.notifications,
      unreadMessageCount: communication.getUnreadMessageCount(comm),
      markConversationRead: (id) => { comm = communication.markConversationRead(comm, id); },
      sendMessage: (id, text) => {
        const next = communication.sendLocalMessage(comm, id, text, '14:00');
        if (next === comm) return false;
        comm = next; return true;
      },
      unreadNotificationCount: communication.getUnreadNotificationCount(comm),
      markNotificationRead: (id) => { comm = communication.markNotificationRead(comm, id); },
      markAllNotificationsRead: () => { comm = communication.markAllNotificationsRead(comm); },
      resetCommunication: () => { comm = communication.createCommunicationState(data.conversations, data.notifications); resets.push('communication'); },
    }) },
  };
  function renderScreen(target = file) {
    if (!screenSlots.has(target)) screenSlots.set(target, []);
    slots = screenSlots.get(target);
    if (!components.has(target)) { const exports = load(target, modules, frameGlobals); components.set(target, exports[options.exportName ?? 'default']); }
    for (let pass = 0; pass < 10; pass++) {
      hookIndex = 0; renderChanged = false;
      const nodes = elements(components.get(target)({ navigation, route, ...options.props }));
      if (!renderChanged) return nodes;
    }
    throw new Error(`Screen state did not settle: ${target}`);
  }
  const render = () => renderScreen(file);
  return { render, renderScreen, focus: () => focusEffect?.(), route, alerts, calls, resets,
    flushAnimationFrames: () => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(); },
    get keyboardDismissals() { return keyboardDismissals; }, get favoriteIds() { return favoriteIds; },
    get profile() { return details; }, get removal() { return removal; }, get communication() { return comm; } };
}
module.exports = { harness, load, elements, data, application, profile, communication };
