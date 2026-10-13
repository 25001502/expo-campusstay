const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const uiPath = path.join(root, 'src/components/UI.tsx');
const imagePath = path.join(root, 'src/components/RemoteImage.tsx');

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  }).outputText;
}

function loadTheme() {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/theme.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { module, exports: module.exports });
  return module.exports;
}

function loadComponent(file, { states = [], extraModules = {} } = {}) {
  let stateIndex = 0;
  const stateUpdates = [];
  const react = {
    useState: (initial) => {
      const index = stateIndex++;
      const value = index < states.length ? states[index] : initial;
      return [value, (next) => {
        const resolved = typeof next === 'function' ? next(value) : next;
        stateUpdates.push({ index, value: resolved });
      }];
    },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', TextInput: 'TextInput',
      ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: (styles) => styles, absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } },
    },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'expo-image': { Image: 'Image' },
    ...extraModules,
  };
  const module = { exports: {} };
  vm.runInNewContext(transpile(file), {
    module,
    exports: module.exports,
    require: (name) => {
      if (name.endsWith('/theme') || name === '../theme') return loadTheme();
      return modules[name] || {};
    },
  }, { filename: file });
  return { exports: module.exports, stateUpdates };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(elements)];
}

function flattenStyle(style) {
  return [style].flat(Infinity).filter(Boolean).reduce((result, item) => ({ ...result, ...item }), {});
}

test('disabled and loading buttons expose state and cannot trigger', () => {
  const { exports: ui } = loadComponent(uiPath);
  const disabled = ui.Btn({ children: 'Continue', onPress: () => assert.fail('disabled action ran'), disabled: true });
  assert.equal(disabled.type, 'TouchableOpacity');
  assert.equal(disabled.props.onPress, undefined);
  assert.equal(disabled.props.accessibilityRole, 'button');
  assert.equal(disabled.props.accessibilityLabel, 'Continue');
  assert.equal(disabled.props.accessibilityState.disabled, true);
  const loading = ui.Btn({ children: 'Save', onPress: () => assert.fail('busy action ran'), loading: true });
  assert.equal(loading.props.onPress, undefined);
  assert.equal(loading.props.accessibilityState.busy, true);
});

test('IconButton has an accessible name and a minimum 44 dp target', () => {
  const { exports: ui } = loadComponent(uiPath);
  const tree = ui.IconButton({ icon: 'arrow-back', label: 'Go back', onPress: () => {} });
  const style = flattenStyle(tree.props.style);
  assert.equal(tree.props.accessibilityRole, 'button');
  assert.equal(tree.props.accessibilityLabel, 'Go back');
  assert.ok(style.minWidth >= 44);
  assert.ok(style.minHeight >= 44);
});

test('Input communicates required and error state', () => {
  const { exports: ui } = loadComponent(uiPath);
  const tree = ui.Input({ label: 'Email address', required: true, error: 'Enter a valid email' });
  const input = elements(tree).find((element) => element.type === 'TextInput');
  const alert = elements(tree).find((element) => element.props?.accessibilityRole === 'alert');
  assert.equal(input.props.accessibilityLabel, 'Email address, required');
  assert.equal(input.props['aria-invalid'], true);
  assert.equal(input.props.accessibilityHint, 'Error: Enter a valid email');
  assert.ok(alert);
});

test('StatusBadge exposes status text and contrast-safe variant semantics', () => {
  const { exports: ui } = loadComponent(uiPath);
  const status = ui.StatusBadge({ label: 'Under Review' });
  assert.equal(status.type, ui.Badge);
  assert.equal(status.props.variant, 'blue');
  assert.equal(status.props.accessibilityLabel, 'Status: Under Review');
  const badge = ui.Badge(status.props);
  assert.equal(badge.props.accessibilityRole, 'text');
});

test('EmptyState and ErrorState render meaningful recovery actions', () => {
  const { exports: ui } = loadComponent(uiPath);
  const empty = ui.EmptyState({ title: 'Nothing saved', description: 'Save a property.', actionLabel: 'Explore', onAction: () => {} });
  assert.ok(elements(empty).some((element) => element.props.accessibilityRole === 'header' && element.props.children === 'Nothing saved'));
  assert.ok(elements(empty).some((element) => element.type === ui.Btn && element.props.children === 'Explore'));
  const error = ui.ErrorState({ message: 'Try the request again.', onRetry: () => {} });
  assert.ok(elements(error).some((element) => element.props.accessibilityRole === 'alert'));
  assert.ok(elements(error).some((element) => element.type === ui.Btn && element.props.children === 'Try Again'));
});

test('RemoteImage exposes loading and failure states with retry', () => {
  const uiModule = loadComponent(uiPath);
  const loadingModule = loadComponent(imagePath, { states: [true, false, 0], extraModules: { './UI': uiModule.exports } });
  const loading = loadingModule.exports.RemoteImage({ source: { uri: 'fixture' }, accessibilityLabel: 'Fixture property' });
  assert.ok(elements(loading).some((element) => element.props?.accessibilityRole === 'progressbar'));
  const failedModule = loadComponent(imagePath, { states: [false, true, 0], extraModules: { './UI': uiModule.exports } });
  const failed = failedModule.exports.RemoteImage({ source: { uri: 'fixture' }, accessibilityLabel: 'Fixture property' });
  assert.ok(elements(failed).some((element) => element.props?.accessibilityRole === 'alert'));
  const retry = elements(failed).find((element) => element.type === uiModule.exports.IconButton);
  assert.equal(retry.props.label, 'Retry image');
  retry.props.onPress();
  assert.deepEqual(failedModule.stateUpdates.map((update) => update.value), [false, true, 1]);
});
