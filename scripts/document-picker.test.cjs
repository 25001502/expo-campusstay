const assert = require('node:assert/strict');
const test = require('node:test');
const { load } = require('./profile-harness.cjs');
const docs = load('src/documents.ts');
const { AttachmentSession } = load('src/attachmentSession.ts');
const signatures = { pdf: [37, 80, 68, 70, 45], jpg: [255, 216, 255], jpeg: [255, 216, 255], png: [137, 80, 78, 71, 13, 10, 26, 10] };
function setup() {
  const queue = [], prepared = [], released = [];
  let pickCount = 0;
  const adapter = {
    async pick() { pickCount++; const next = queue.shift(); if (next instanceof Error) throw next; return next; },
    async prepare(asset) {
      if (asset.fail) throw new Error('private sensitive path');
      const resource = { uri: `file://private-copy-${prepared.length}`, size: asset.actualSize ?? asset.size ?? 200, prefix: new Uint8Array(asset.prefix ?? signatures[asset.name.split('.').pop()]), readable: true, disposed: 0,
        available() { return this.readable; }, dispose() { this.disposed++; },
      };
      prepared.push(resource); return resource;
    },
    releasePicked(asset) { released.push(asset); },
  };
  const session = new AttachmentSession(adapter);
  const put = (asset = {}) => queue.push({ canceled: false, assets: [{ name: 'sample.pdf', mimeType: 'application/pdf', size: 200, ...asset }] });
  return { queue, prepared, released, adapter, session, put, get pickCount() { return pickCount; } };
}
for (const extension of ['pdf', 'jpg', 'jpeg', 'png']) test(`real-reference selection accepts ${extension.toUpperCase()} signature and retains metadata only`, async () => {
  const s = setup(); s.put({ name: `sample.${extension}`, mimeType: extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : 'image/jpeg' });
  const result = await s.session.choose('draft', 'identity');
  assert.equal(result.status, 'selected'); assert.equal(result.document.name, `sample.${extension}`);
  assert.equal(result.document.category, 'identity'); assert.equal(result.document.size, 200);
  assert.deepEqual(Object.keys(result.document).sort(), ['category', 'id', 'mimeType', 'name', 'size', 'state']);
  assert.equal(s.prepared[0].prefix.length, 0); assert.equal(s.released.length, 1);
});
test('unsupported type, mismatched MIME, renamed content, oversize and absent metadata reject safely', async () => {
  for (const asset of [{ name: 'file.exe' }, { mimeType: 'image/png' }, { prefix: [0, 1, 2] }, { size: docs.MAX_DOCUMENT_BYTES + 1 }, { name: '' }, { size: 0 }, { size: -1 }, { size: NaN }, { name: '../private.pdf' }]) {
    const s = setup(); s.put(asset); const result = await s.session.choose('d', 'identity');
    assert.equal(result.status, 'error'); assert.doesNotMatch(result.message, /private sensitive path|file:\/\//);
    assert.ok(s.prepared.every((r) => r.disposed === 1));
  }
});
test('missing MIME and size are accepted only after real size and matching content checks', async () => {
  const s = setup(); s.put({ mimeType: undefined, size: undefined });
  assert.equal((await s.session.choose('d', 'registration')).document.mimeType, 'application/pdf');
});
test('10 MB boundary is accepted and actual oversized bytes reject even with smaller picker size', async () => {
  const s = setup(); s.put({ size: docs.MAX_DOCUMENT_BYTES });
  assert.equal((await s.session.choose('d', 'identity')).status, 'selected');
  s.put({ actualSize: docs.MAX_DOCUMENT_BYTES + 1 });
  assert.equal((await s.session.choose('d', 'identity')).status, 'error');
});
test('cancellation, picker failure, empty and multiple results cannot erase an existing attachment', async () => {
  const s = setup(); s.put(); const first = (await s.session.choose('d', 'identity')).document;
  for (const result of [{ canceled: true }, new Error('secret picker path'), { canceled: false, assets: [] }, { canceled: false, assets: [{}, {}] }]) {
    s.queue.push(result); assert.notEqual((await s.session.choose('d', 'identity')).status, 'selected');
    assert.equal(s.session.status('d', first.id), 'attached-local'); assert.equal(s.prepared[0].disposed, 0);
  }
});
test('failed replacement disposes its copy while preserving the prior category and other categories', async () => {
  const s = setup(); s.put(); const one = (await s.session.choose('d', 'identity')).document;
  s.put(); const two = (await s.session.choose('d', 'registration')).document;
  s.put({ prefix: [0, 0, 0] }); assert.equal((await s.session.choose('d', 'identity')).status, 'error');
  assert.equal(s.session.status('d', one.id), 'attached-local'); assert.equal(s.session.status('d', two.id), 'attached-local'); assert.equal(s.prepared[2].disposed, 1);
  s.put({ name: 'replacement.pdf' }); const next = (await s.session.choose('d', 'identity')).document;
  assert.notEqual(next.id, one.id); assert.equal(s.prepared[0].disposed, 1); assert.equal(s.prepared[1].disposed, 0);
});
test('duplicate picker calls are prevented synchronously and the lock releases on failure', async () => {
  const s = setup(); let resolve;
  s.adapter.pick = () => new Promise((done) => { resolve = done; });
  const pending = s.session.choose('d', 'identity');
  assert.equal(s.session.busy, true); assert.equal((await s.session.choose('d', 'funding')).status, 'busy');
  resolve({ canceled: true }); await pending; assert.equal(s.session.busy, false);
});
test('leaving a draft during picker selection does not stage the late selection or resurrect it', async () => {
  const s = setup(); let resolve; s.adapter.pick = () => new Promise((done) => { resolve = done; });
  const pending = s.session.choose('draft', 'identity'); s.session.releaseOwner('draft');
  resolve({ canceled: false, assets: [{ name: 'sample.pdf', size: 200 }] });
  assert.equal((await pending).status, 'cancelled'); assert.equal(s.prepared.length, 0);
});
test('logout during an unresolved picker prevents a new sensitive copy', async () => {
  const s = setup(); let resolve; s.adapter.pick = () => new Promise((done) => { resolve = done; });
  const pending = s.session.choose('draft', 'identity'); s.session.clear();
  resolve({ canceled: false, assets: [{ name: 'sample.pdf', size: 200 }] });
  assert.equal((await pending).status, 'cancelled'); assert.equal(s.prepared.length, 0);
});
test('ownership transfer preserves saved references, disallows cross-application access, and logout cleans once', async () => {
  const s = setup(); s.put(); const doc = (await s.session.choose('draft', 'identity')).document;
  s.session.promote('draft', 'app-1', { identity: doc }); s.session.releaseOwner('draft');
  assert.equal(s.session.status('app-1', doc.id), 'attached-local');
  assert.equal(s.session.status('app-2', doc.id), 'unavailable'); s.session.remove('app-2', doc.id);
  assert.equal(s.prepared[0].disposed, 0); s.session.clear(); s.session.clear(); assert.equal(s.prepared[0].disposed, 1);
});
test('expired references are marked unavailable and filename history remains readable', async () => {
  const s = setup(); s.put(); const doc = (await s.session.choose('d', 'identity')).document;
  s.prepared[0].readable = false;
  const result = await s.session.inspect('d', { identity: doc });
  assert.equal(result.identity.state, 'unavailable'); assert.equal(result.identity.name, doc.name);
  assert.equal(s.session.status('d', doc.id), 'unavailable'); assert.equal(s.session.preview('d', doc).status, 'error');
});
test('copied IDs with altered names or categories are not owned metadata', async () => {
  const s = setup(); s.put(); const doc = (await s.session.choose('d', 'identity')).document;
  assert.equal(s.session.matches('d', { ...doc, name: 'forged.pdf' }), false);
  assert.equal(s.session.matches('d', { ...doc, category: 'funding' }), false);
  const checked = await s.session.inspect('d', { identity: { ...doc, uri: 'private-reference', file: {} } });
  assert.doesNotMatch(JSON.stringify(checked), /private-reference|"uri"|"file"/);
});
test('image preview is owner-scoped, metadata-free URI access is unavailable, PDF preview is optional', async () => {
  const s = setup(); s.put({ name: 'image.png', mimeType: 'image/png' }); const doc = (await s.session.choose('d', 'identity')).document;
  assert.equal(s.session.canPreview('d', doc), true); assert.equal(s.session.preview('d', doc).status, 'image');
  assert.equal(s.session.preview('other', doc).status, 'error');
  s.put(); const pdf = (await s.session.choose('d', 'registration')).document;
  assert.equal(s.session.canPreview('d', pdf), false);
  s.prepared[1].openPdf = () => { throw new Error('platform denied preview'); };
  assert.equal(s.session.preview('d', pdf).status, 'error');
});
test('size formatting and metadata copies exclude raw handles, payloads and URIs', () => {
  assert.equal(docs.formatDocumentSize(100), '100 bytes'); assert.equal(docs.formatDocumentSize(1025), '2 KB'); assert.equal(docs.formatDocumentSize(1048576), '1.0 MB');
  const copy = docs.copyAttachments({ identity: { id: 'opaque', category: 'identity', name: 'sample.pdf', mimeType: 'application/pdf', size: 200, state: 'attached-local', uri: 'secret', file: {}, base64: 'secret' } });
  assert.doesNotMatch(JSON.stringify(copy), /uri|base64|secret|"file"/);
});

test('native adapter uses app-owned copies and never deletes original user files', async () => {
  const files = new Map(), reportedSizes = new Map(), deletions = [], copies = [];
  class Directory { constructor(...parts) { this.uri = parts.map((p) => p.uri ?? p).join('/'); } create() {} }
  class File {
    constructor(...parts) { this.uri = parts.map((p) => p.uri ?? p).join('/'); }
    get exists() { return files.has(this.uri); } get size() { return reportedSizes.get(this.uri) ?? files.get(this.uri)?.length; }
    get parentDirectory() { return { uri: this.uri.slice(0, this.uri.lastIndexOf('/')) }; }
    async copy(target) { copies.push(target.uri); files.set(target.uri, files.get(this.uri)); }
    open() { return { readBytes: (length) => files.get(this.uri).slice(0, length), close() {} }; }
    delete() { deletions.push(this.uri); files.delete(this.uri); }
  }
  const native = {
    initialize: () => true, retryCleanup: () => true,
    async stage(uri, id) {
      const bytes = files.get(uri);
      if (!bytes) return { code: 'unreadable' };
      if (bytes.length > docs.MAX_DOCUMENT_BYTES) return { code: 'size' };
      const target = `file://private-no-backup/session/${id}.local`;
      copies.push(target); files.set(target, bytes.slice());
      return { code: 'ok', uri: target, size: bytes.length, prefix: [...bytes.slice(0, 16)] };
    },
    available: (id, size) => files.get(`file://private-no-backup/session/${id}.local`)?.length === size,
    remove(id) { const uri = `file://private-no-backup/session/${id}.local`; deletions.push(uri); files.delete(uri); return true; },
  };
  const pickerCalls = [];
  const platform = { OS: 'android' };
  const adapter = load('src/documentAdapter.ts', { 'expo': { requireOptionalNativeModule: () => native }, 'react-native': { Platform: platform }, './nativeImagePicker': { pickNativeImage: () => { throw new Error('This test exercises Files only'); } }, 'expo-document-picker': { getDocumentAsync: (options) => { pickerCalls.push(options); return Promise.resolve({ canceled: true }); } }, 'expo-file-system': { Directory, File, FileMode: { ReadOnly: 'r' }, Paths: { cache: 'file://private-cache' } } }).documentAdapter;
  await adapter.pick(); assert.equal(pickerCalls[0].copyToCacheDirectory, false); assert.equal(pickerCalls[0].base64, false);
  platform.OS = 'ios'; await adapter.pick(); assert.equal(pickerCalls[1].copyToCacheDirectory, true);
  const original = 'file://Downloads/original.pdf'; files.set(original, new Uint8Array(signatures.pdf));
  const resource = await adapter.prepare({ uri: original, name: 'original.pdf', mimeType: 'application/pdf' }, 'opaque-id');
  assert.equal(resource.available(), true); resource.dispose(); adapter.releasePicked({ uri: original });
  assert.equal(files.has(original), true); assert.ok(deletions.every((uri) => uri.startsWith('file://private-no-backup/session/')));
  assert.equal(copies.length, 1);
  const privatePickerCopy = 'file://private-cache/DocumentPicker/unique.pdf'; files.set(privatePickerCopy, new Uint8Array(signatures.pdf)); adapter.releasePicked({ uri: privatePickerCopy });
  assert.equal(files.has(privatePickerCopy), false); assert.equal(files.has(original), true);
  adapter.releasePicked({ uri: 'file://private-cache/DocumentPicker/../original.pdf' }); assert.equal(deletions.length, 2);
  const privateImageCopy = 'file://private-cache/ImagePicker/opaque.jpg'; files.set(privateImageCopy, new Uint8Array(signatures.jpg));
  const imageOriginal = 'file://Downloads/ImagePicker/original.jpg'; files.set(imageOriginal, new Uint8Array(signatures.jpg));
  adapter.releasePicked({ uri: privateImageCopy }); adapter.releasePicked({ uri: imageOriginal });
  assert.equal(files.has(privateImageCopy), false); assert.equal(files.has(imageOriginal), true);
  const saf = 'content://synthetic-documents/selected.pdf'; files.set(saf, new Uint8Array(signatures.pdf));
  const safCopy = await adapter.prepare({ uri: saf, name: 'selected.pdf', mimeType: 'application/pdf' }, 'opaque-saf-id');
  safCopy.dispose(); adapter.releasePicked({ uri: saf }); assert.equal(files.has(saf), true); assert.equal(copies.length, 2);
  const mismatchedSize = 'content://synthetic-documents/misreported.pdf';
  files.set(mismatchedSize, new Uint8Array(docs.MAX_DOCUMENT_BYTES + 1)); reportedSizes.set(mismatchedSize, 200);
  await assert.rejects(adapter.prepare({ uri: mismatchedSize, name: 'misreported.pdf', mimeType: 'application/pdf' }, 'oversized-copy'), (error) => error.code === 'size');
  assert.equal(files.has(mismatchedSize), true); assert.equal(files.has('file://private-no-backup/session/oversized-copy.local'), false);
});

test('browser adapter opens directly, cancellation removes its input, URLs revoke on disposal', async () => {
  let input, clicks = 0, removes = 0, revoked = 0;
  const listeners = new Map();
  const browserDocument = { createElement: () => (input = { style: {}, addEventListener: (name, fn) => listeners.set(name, fn), remove: () => removes++, click: () => clicks++ }), body: { appendChild() {} } };
  const window = { addEventListener() {}, removeEventListener() {}, open: () => ({ opener: null, location: {} }) };
  const URL = { createObjectURL: () => 'blob:owned', revokeObjectURL: () => revoked++ };
  const adapter = load('src/documentAdapter.web.ts', {}, { document: browserDocument, window, URL, setTimeout, clearTimeout, Uint8Array }).documentAdapter;
  const first = adapter.pick(); assert.equal(clicks, 1); listeners.get('cancel')(); assert.equal((await first).canceled, true); assert.equal(removes, 1);
  const file = new Blob([new Uint8Array(signatures.pdf)], { type: 'application/pdf' }); Object.defineProperty(file, 'name', { value: 'browser.pdf' });
  const next = adapter.pick(); input.files = [file]; listeners.get('change')(); const selected = await next;
  assert.equal(selected.assets[0].name, 'browser.pdf'); assert.equal(removes, 2);
  const resource = await adapter.prepare(selected.assets[0], 'opaque'); assert.equal(resource.available(), true);
  assert.equal(resource.openPdf(), true); window.open = () => null; assert.equal(resource.openPdf(), false);
  resource.dispose(); resource.dispose(); assert.equal(revoked, 1); assert.equal(resource.available(), false);
});
