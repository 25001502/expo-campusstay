const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { getDefaultConfig } = require('expo/metro-config');
const config = require('../metro.config');
const root = path.resolve(__dirname, '..');
const blocked = filename => config.resolver.blockList.some(rule => rule.test(filename));

test('Metro excludes the standalone admin source, cache and React tree on both separator forms', () => {
  for (const suffix of ['src/app/page.tsx', '.next/server/app.js', 'node_modules/react/index.js']) {
    const filename = path.join(root, 'admin-web', suffix);
    assert.equal(blocked(filename.replaceAll('\\', '/')), true);
    assert.equal(blocked(filename.replaceAll('/', '\\')), true);
    assert.equal(blocked(`admin-web/${suffix}`), true);
  }
});
test('Metro preserves the original mobile resolution and transform configuration', () => {
  const defaults = getDefaultConfig(root);
  assert.deepEqual(config.resolver.sourceExts, defaults.resolver.sourceExts);
  assert.deepEqual(config.resolver.assetExts, defaults.resolver.assetExts);
  assert.equal(config.transformer.babelTransformerPath, defaults.transformer.babelTransformerPath);
  assert.equal(blocked(path.join(root, 'App.tsx')), false);
  assert.equal(blocked(path.join(root, 'src/screens/ManagerScreen.tsx')), false);
  assert.equal(blocked(path.join(root, 'node_modules/react/index.js')), false);
  for (const rule of defaults.resolver.blockList) assert.ok(config.resolver.blockList.some(actual => actual.source === rule.source));
});
