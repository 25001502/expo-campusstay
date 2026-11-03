const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./profile-harness.cjs');
const { AttachmentSession } = load('src/attachmentSession.ts');
const { createNativeDocumentStorage } = load('src/nativeDocumentStorage.ts');
const { DOCUMENT_MESSAGES, getDocumentSummary } = load('src/documents.ts');

function setup() {
  const files = new Map(), removed = [], queue = [], sourceCalls = [];
  let clean = true, deletionAllowed = true, reply, preparations = 0;
  const native = {
    initialize: () => clean, retryCleanup: () => clean,
    async stage(uri, id) {
      preparations++;
      if (reply) return typeof reply === 'function' ? reply(id) : reply;
      files.set(id, { uri: `file://private-no-backup/session/${id}.local`, size: 200 });
      return { code: 'ok', ...files.get(id), prefix: [37, 80, 68, 70, 45] };
    },
    available: (id, size) => files.get(id)?.size === size,
    remove(id) { if (!deletionAllowed) return false; removed.push(id); files.delete(id); return true; },
  };
  const storage = createNativeDocumentStorage(native);
  const adapter = {
    pick(source) { storage.ready(); sourceCalls.push(source); return Promise.resolve(queue.shift() ?? { canceled: true }); },
    prepare: storage.prepare, releasePicked() {},
  };
  const session = new AttachmentSession(adapter);
  const put = () => queue.push({ canceled: false, assets: [{ uri: 'content://synthetic/original.pdf', name: 'same-name.pdf', size: 200, mimeType: 'application/pdf' }] });
  return { native, storage, adapter, session, put, files, removed, sourceCalls,
    setClean: (value) => { clean = value; }, setDeletion: (value) => { deletionAllowed = value; }, setReply: (value) => { reply = value; }, preparations: () => preparations };
}

test('native capability is mandatory for attachments; cleanup failure blocks pick and retries without affecting Home', async () => {
  assert.throws(() => createNativeDocumentStorage(null).ready(), (error) => error.code === 'nativeStorage');
  const s = setup(); s.setClean(false); s.put();
  const failed = await s.session.choose('draft', 'identity');
  assert.equal(failed.message, DOCUMENT_MESSAGES.cleanup); assert.equal(s.sourceCalls.length, 0); assert.equal(s.preparations(), 0);
  s.setClean(true); assert.equal((await s.session.choose('draft', 'identity')).status, 'selected');
  const unavailable = { ...s.native, initialize: () => false };
  assert.throws(() => createNativeDocumentStorage(unavailable, () => 0).ready(), (error) => error.code === 'storage');
  for (const reading of [undefined, NaN, -1, 100 * 1024 * 1024]) {
    assert.throws(() => createNativeDocumentStorage(unavailable, () => reading).ready(), (error) => error.code === 'cleanup');
  }
  assert.throws(() => createNativeDocumentStorage(unavailable, () => { throw new Error('unavailable'); }).ready(), (error) => error.code === 'cleanup');
});

test('all native source routes preserve prior attachment and other categories on every staging failure', async () => {
  const s = setup(); s.put(); const old = (await s.session.choose('draft', 'identity')).document;
  s.put(); const registration = (await s.session.choose('draft', 'registration')).document;
  for (const source of ['files', 'library', 'camera']) {
    for (const code of ['storage', 'staging', 'unreadable', 'size', 'content', 'cleanup']) {
      s.setReply({ code }); s.put(); const result = await s.session.choose('draft', 'identity', source);
      assert.equal(result.status, 'error'); assert.equal(result.message, DOCUMENT_MESSAGES[code]);
      assert.equal(s.session.status('draft', old.id), 'attached-local'); assert.equal(s.session.status('draft', registration.id), 'attached-local');
      assert.equal(s.files.size, 2); assert.equal(s.removed.length, 0);
    }
  }
});

test('native success is verified before commit: missing, short, invalid signature and read failures dispose only candidate', async () => {
  const s = setup(); s.put(); const old = (await s.session.choose('draft', 'identity')).document;
  for (const mode of ['missing', 'short', 'signature', 'read']) {
    s.setReply((id) => {
      if (mode !== 'missing') s.files.set(id, { uri: `file://private-no-backup/session/${id}.local`, size: mode === 'short' ? 199 : 200 });
      if (mode === 'read') s.native.available = (key) => { if (key === id) throw new Error('private URI must not leak'); return true; };
      return { code: 'ok', uri: `file://private-no-backup/session/${id}.local`, size: 200, prefix: mode === 'signature' ? [0, 0, 0] : [37, 80, 68, 70, 45] };
    });
    s.put(); const result = await s.session.choose('draft', 'identity');
    assert.equal(result.status, 'error'); assert.doesNotMatch(result.message, /private URI/);
    assert.equal(s.session.status('draft', old.id), 'attached-local'); assert.equal(s.files.size, 1);
    s.native.available = (id, size) => s.files.get(id)?.size === size;
  }
  assert.equal(s.removed.length, 4);
});

test('bridge rejection after native copy cleans the uncommitted candidate without leaking its error or deleting the old file', async () => {
  const s = setup(); s.put(); const old = (await s.session.choose('draft', 'identity')).document;
  s.setReply((id) => { s.files.set(id, { size: 200 }); throw new Error('sensitive native source URI'); });
  s.put(); const result = await s.session.choose('draft', 'identity');
  assert.equal(result.message, DOCUMENT_MESSAGES.staging); assert.equal(s.files.size, 1);
  assert.equal(s.files.has(old.id), true); assert.equal(s.removed.length, 1);
});

test('failed physical deletion remains pending, blocks new sensitive copies, then retries successfully', async () => {
  const s = setup(); s.put(); const one = (await s.session.choose('draft', 'identity')).document;
  s.setDeletion(false); s.session.remove('draft', one.id);
  assert.equal(s.session.status('draft', one.id), 'unavailable'); assert.equal(s.files.size, 1);
  s.put(); assert.equal((await s.session.choose('draft', 'identity')).message, DOCUMENT_MESSAGES.cleanup);
  assert.equal(s.preparations(), 1);
  s.setDeletion(true); assert.equal((await s.session.choose('draft', 'identity')).status, 'selected');
  assert.equal(s.files.has(one.id), false); assert.equal(s.files.size, 1);
  s.session.clear(); assert.equal(s.files.size, 0);
});

test('temporary read denial can recover after unlock without accepting forged metadata or recovered applications', async () => {
  const s = setup(); s.put(); const file = (await s.session.choose('draft', 'identity')).document;
  const available = s.native.available;
  s.native.available = () => false;
  assert.equal((await s.session.inspect('draft', { identity: file })).identity.state, 'unavailable');
  assert.equal(s.session.matches('draft', file), false);
  s.native.available = available;
  assert.equal((await s.session.inspect('draft', { identity: file })).identity.state, 'attached-local');
  assert.equal((await s.session.inspect('draft', { identity: { ...file, name: 'forged.pdf' } })).identity.state, 'unavailable');
  assert.equal((await s.session.inspect('other-owner', { identity: file })).identity.state, 'unavailable');
});

test('identical names and original URI across owners/categories get independent copies and accurate document counts', async () => {
  const s = setup(), saved = {};
  for (const category of ['student-id', 'registration', 'identity', 'funding']) {
    s.put(); saved[category] = (await s.session.choose('draft', category)).document;
  }
  s.session.promote('draft', 'application-1', saved);
  s.put(); const other = (await s.session.choose('draft-2', 'identity')).document;
  assert.equal(new Set([...Object.values(saved), other].map((file) => file.id)).size, 5);
  s.session.remove('application-1', saved.identity.id);
  assert.equal(s.session.status('draft-2', other.id), 'attached-local');
  const counts = getDocumentSummary('application-1', saved, (owner, id) => s.session.status(owner, id));
  assert.equal(counts.required, 2); assert.equal(counts.optional, 1); assert.equal(counts.unavailable, 1);
  assert.doesNotMatch(JSON.stringify(saved), /uri|base64|content:\/\//);
  s.session.releaseOwner('draft-2'); assert.equal(s.files.size, 3);
});

test('physical aliases are reference-counted across owners, failed candidates and replacements', async () => {
  let deletes = 0;
  const adapter = { pick: async () => ({ canceled: false, assets: [{ name: 'same.pdf', size: 200 }] }),
    prepare: async () => ({ uri: 'file://same-owned-resource', size: 200, prefix: new Uint8Array([37, 80, 68, 70, 45]), available: () => true, dispose: () => { deletes++; } }), releasePicked() {} };
  const session = new AttachmentSession(adapter);
  const one = (await session.choose('one', 'identity')).document;
  const two = (await session.choose('two', 'identity')).document;
  session.remove('one', one.id); assert.equal(deletes, 0);
  const replacement = (await session.choose('two', 'identity')).document;
  assert.notEqual(replacement.id, two.id); assert.equal(deletes, 0);
  adapter.prepare = async () => ({ uri: 'file://same-owned-resource', size: 200, prefix: new Uint8Array([0]), available: () => true, dispose: () => { deletes++; } });
  assert.equal((await session.choose('two', 'identity')).status, 'error'); assert.equal(deletes, 0);
  session.clear(); assert.equal(deletes, 1);
});

test('logout while native copy resolves cannot resurrect a candidate; later runtime creates no recovered metadata', async () => {
  const s = setup(); let complete, entered;
  const stagingStarted = new Promise((resolve) => { entered = resolve; });
  s.setReply((id) => new Promise((resolve) => { complete = () => { s.files.set(id, { size: 200 }); resolve({ code: 'ok', uri: `file://private-no-backup/session/${id}.local`, size: 200, prefix: [37, 80, 68, 70, 45] }); }; entered(); }));
  s.put(); const pending = s.session.choose('draft', 'identity');
  await stagingStarted; s.session.clear(); complete();
  assert.equal((await pending).status, 'cancelled'); assert.equal(s.files.size, 0);
  const fresh = new AttachmentSession(s.adapter);
  assert.equal(fresh.status('draft', 'historical-id'), 'unavailable');
});

test('funding cancellation/save/removal clean only editor or replaced funding, retaining identity and application ownership', async () => {
  const s = setup(); s.put(); const identity = (await s.session.choose('draft', 'identity')).document;
  s.put(); const old = (await s.session.choose('draft', 'funding')).document;
  s.session.promote('draft', 'app', { identity, funding: old });
  s.put(); const cancelled = (await s.session.choose('editor-cancel', 'funding')).document;
  s.session.releaseOwner('editor-cancel'); assert.equal(s.files.has(cancelled.id), false); assert.equal(s.files.has(old.id), true);
  s.put(); const next = (await s.session.choose('editor-save', 'funding')).document;
  s.session.commitFunding('editor-save', 'app', next, old.id);
  assert.equal(s.files.has(old.id), false); assert.equal(s.session.status('app', next.id), 'attached-local');
  s.session.commitFunding('editor-remove', 'app', undefined, next.id);
  assert.equal(s.files.size, 1); assert.equal(s.session.status('app', identity.id), 'attached-local');
});
