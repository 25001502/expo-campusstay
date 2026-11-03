const assert = require('node:assert/strict');
const test = require('node:test');
const { Buffer } = require('node:buffer');
const { load } = require('./profile-harness.cjs');
const { createSessionStorage } = load('src/auth/sessionStorage.ts');
function fixture() {
  const values = new Map(); let id = 0, fail = false;
  const secure = { getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { if (fail && key.endsWith('.1')) throw new Error('Keychain full'); values.set(key, value); },
    removeItem: async (key) => { values.delete(key); } };
  return { values, secure, storage: createSessionStorage(secure, () => `generation-${++id}`), fail: () => { fail = true; } };
}
test('native session storage round-trips large token payloads in small encrypted entries', async () => {
  const f = fixture(), value = JSON.stringify({ access_token: 'token'.repeat(1500), refresh_token: 'refresh', full_name: '学生'.repeat(500) });
  await f.storage.setItem('auth-token', value); assert.equal(await f.storage.getItem('auth-token'), value);
  assert.ok([...f.values.values()].every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 2048));
  assert.ok(!f.values.get('auth-token').includes('refresh'));
});
test('refresh replaces a committed generation and removes its old encrypted chunks', async () => {
  const f = fixture(); await f.storage.setItem('auth-token', 'old'.repeat(1000));
  await f.storage.setItem('auth-token', 'new'); assert.equal(await f.storage.getItem('auth-token'), 'new');
  assert.ok([...f.values.keys()].every((key) => !key.includes('generation-1')));
});
test('incomplete writes never replace the last committed session', async () => {
  const f = fixture(); await f.storage.setItem('auth-token', 'previous'); f.fail();
  await assert.rejects(f.storage.setItem('auth-token', 'replacement'.repeat(1000)));
  assert.equal(await f.storage.getItem('auth-token'), 'previous');
  assert.ok(![...f.values.keys()].some((key) => key.includes('generation-2')));
});
test('sign-out removes the manifest and all currently referenced session chunks', async () => {
  const f = fixture(); await f.storage.setItem('auth-token', 'token'.repeat(1000));
  await f.storage.removeItem('auth-token'); assert.equal(f.values.size, 0); assert.equal(await f.storage.getItem('auth-token'), null);
});
test('queued refresh and sign-out cannot revive a removed session', async () => {
  const f = fixture(); await Promise.all([f.storage.setItem('auth-token', 'old'), f.storage.setItem('auth-token', 'refreshed'), f.storage.removeItem('auth-token')]);
  assert.equal(await f.storage.getItem('auth-token'), null); assert.equal(f.values.size, 0);
});
test('corrupt or missing chunks fail closed rather than returning truncated credentials', async () => {
  const f = fixture(); await f.storage.setItem('auth-token', 'token'); f.values.delete('auth-token.generation-1.0');
  await assert.rejects(f.storage.getItem('auth-token'));
  f.values.set('auth-token', '{"id":"../outside","count":999999}');
  await assert.rejects(f.storage.getItem('auth-token'));
  await f.storage.removeItem('auth-token'); assert.equal(await f.storage.getItem('auth-token'), null);
});
test('PKCE verifier slots and session tokens are stored independently', async () => {
  const f = fixture(); await f.storage.setItem('auth-token', 'token'); await f.storage.setItem('auth-token-flow-code-verifier', 'verifier/recovery');
  await f.storage.removeItem('auth-token-flow-code-verifier'); assert.equal(await f.storage.getItem('auth-token'), 'token');
});
test('web previews keep session tokens only in memory', async () => {
  const first = load('src/auth/secureStorage.web.ts').authStorage; await first.setItem('token', 'synthetic'); assert.equal(await first.getItem('token'), 'synthetic');
  const reload = load('src/auth/secureStorage.web.ts').authStorage; assert.equal(await reload.getItem('token'), null);
});
