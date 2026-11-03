const assert = require('node:assert/strict');
const test = require('node:test');
const { load, harness, elements, data } = require('./profile-harness.cjs');
const gallery = load('src/managerGallery.ts');
const manager = load('src/manager.ts', { './managerGallery': gallery });
const details = load('src/propertyDetails.ts');
const clone = (value) => JSON.parse(JSON.stringify(value));
const image = (key = 'a') => ({ uri: `file:///picker/${key}.jpg`, fileName: `${key}.jpg`, mimeType: 'image/jpeg', fileSize: 100 });
function fixture() {
  const queue = [], disposed = [], resources = [], picks = [];
  let failure, closed = false;
  const adapter = {
    async pick(source, limit) { picks.push({ source, limit }); return queue.shift() ?? { canceled: true }; },
    async prepare(asset, id) {
      if (failure) throw failure;
      let exists = true;
      const resource = { uri: `file:///manager-owned/${id}.jpg`, size: asset.fileSize, fingerprint: asset.uri,
        available: () => exists, dispose() { exists = false; disposed.push(id); } };
      resources.push(resource); return resource;
    },
    close() { closed = true; },
  };
  const workspace = gallery.createPhotoWorkspace(adapter);
  const select = (draft = gallery.emptyGallery(), owner = 'p1', source = 'library', replaceId) => workspace.choose(owner, draft, source, () => true, replaceId);
  return { workspace, adapter, queue, disposed, resources, picks, select, fail: (error) => { failure = error; }, get closed() { return closed; } };
}
test('seed galleries retain fixture URIs and stable property-scoped identifiers', () => {
  const original = clone(data.properties[0]);
  const a = gallery.propertyGallery(original), b = gallery.propertyGallery(original);
  assert.deepEqual(a, b); assert.deepEqual(a.photos.map((photo) => photo.uri), original.images);
  assert.ok(a.photos.every((photo) => photo.kind === 'seed' && photo.propertyId === original.id));
  assert.deepEqual(original, clone(data.properties[0]));
});
test('library selection stages multiple owned images with stable IDs and correct property', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: [image('a'), image('b')] });
  const draft = await f.select();
  assert.equal(draft.photos.length, 2); assert.equal(new Set(draft.photos.map((p) => p.id)).size, 2);
  assert.ok(draft.photos.every((p) => p.propertyId === 'p1' && p.uri.startsWith('file:///manager-owned/')));
  assert.equal(draft.coverPhotoId, draft.photos[0].id); assert.equal(f.picks[0].limit, 8);
  f.workspace.validate('p1', draft); assert.throws(() => f.workspace.validate('p2', draft));
});
for (const source of ['library', 'camera']) test(`${source} cancellation preserves the original gallery and owns no new files`, async () => {
  const f = fixture(), original = gallery.propertyGallery(data.properties[0]);
  f.queue.push({ canceled: true }); assert.equal(await f.select(original, 'p1', source), original);
  assert.equal(f.resources.length, 0); assert.equal(f.disposed.length, 0);
});
test('cancelled replacement preserves the cover, URI, ID and order', async () => {
  const f = fixture(), original = gallery.propertyGallery(data.properties[0]);
  f.queue.push({ canceled: true }); assert.equal(await f.select(original, 'p1', 'library', original.photos[0].id), original);
});
test('failed replacement leaves the previously staged photo available', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: [image()] }); const original = await f.select();
  f.fail(new Error('copy failed')); f.queue.push({ canceled: false, assets: [image('b')] });
  await assert.rejects(f.select(original, 'p1', 'library', original.photos[0].id));
  assert.equal(f.resources[0].available(), true); f.workspace.validate('p1', original);
});
test('successful cover replacement preserves position and retires only the replaced draft copy', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: [image(), image('b')] }); const old = await f.select();
  f.queue.push({ canceled: false, assets: [image('c')] }); const next = await f.select(old, 'p1', 'library', old.photos[0].id);
  assert.equal(next.photos[1].id, old.photos[1].id); assert.notEqual(next.photos[0].id, old.photos[0].id);
  assert.equal(next.coverPhotoId, next.photos[0].id);
  f.workspace.reconcile([old, next]); assert.equal(f.resources[0].available(), true, 'Saved gallery still references the old copy');
  f.workspace.reconcile([next]); assert.equal(f.resources[0].available(), false); assert.equal(f.resources[1].available(), true);
});
test('cover selection is independent of gallery ordering and becomes the property list image', () => {
  const original = data.properties[0], draft = gallery.propertyGallery(original);
  const next = gallery.changeGallery(draft, draft.photos[1].id, 'cover');
  assert.deepEqual(next.photos, draft.photos);
  const saved = gallery.withPropertyGallery(original, next);
  assert.equal(saved.images[0], draft.photos[1].uri); assert.equal(saved.coverPhotoId, draft.photos[1].id);
  assert.equal(original.images[0], draft.photos[0].uri);
});
test('move earlier/later retains photo identifiers and property associations', () => {
  const draft = gallery.propertyGallery(data.properties[0]), id = draft.photos[1].id;
  const next = gallery.changeGallery(draft, id, 'earlier'); assert.equal(next.photos[0].id, id);
  assert.deepEqual(clone(gallery.changeGallery(next, id, 'later')), clone(draft));
  assert.equal(gallery.changeGallery(draft, draft.photos[0].id, 'earlier'), draft);
});
test('removing a cover selects the next surviving photo and permits an empty gallery', () => {
  let draft = gallery.propertyGallery(data.properties[0]);
  const next = gallery.changeGallery(draft, draft.coverPhotoId, 'remove'); assert.equal(next.coverPhotoId, next.photos[0]?.id);
  for (const photo of draft.photos) draft = gallery.changeGallery(draft, photo.id, 'remove');
  assert.equal(draft.photos.length, 0); assert.equal(draft.coverPhotoId, undefined);
});
test('duplicates and invalid batches are atomic and release only the candidates', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: [image()] }); const original = await f.select();
  f.queue.push({ canceled: false, assets: [image('b'), image()] }); await assert.rejects(f.select(original), { code: 'duplicate' });
  assert.equal(f.disposed.length, 2); assert.equal(f.resources[0].available(), true);
  f.queue.push({ canceled: false, assets: [image('c'), { ...image(), mimeType: 'image/heic', fileName: 'a.heic' }] });
  await assert.rejects(f.select(original), { code: 'type' }); assert.equal(f.disposed.length, 3);
});
for (const asset of [
  { ...image(), mimeType: 'image/heic' }, { ...image(), fileName: 'image.heic' },
  { ...image(), mimeType: 'image/gif' }, { ...image(), fileSize: 0 },
  { ...image(), fileSize: NaN }, { ...image(), fileSize: gallery.MAX_PROPERTY_PHOTO_BYTES + 1 },
]) test(`invalid photo rejected: ${asset.mimeType}/${asset.fileName}/${asset.fileSize}`, () => assert.throws(() => gallery.photoMime(asset)));
test('gallery count limit rejects an oversized system result without staging it', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: Array.from({ length: 9 }, (_, i) => image(String(i))) });
  await assert.rejects(f.select(), { code: 'limit' }); assert.equal(f.resources.length, 0);
});
test('missing owned files block save without changing the property', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: [image()] }); const draft = await f.select();
  f.resources[0].dispose(); assert.throws(() => f.workspace.validate('p1', draft), { code: 'file' });
});
test('an in-flight result cannot attach to a discarded editor or another property', async () => {
  const f = fixture(); let resolve; f.adapter.pick = () => new Promise((done) => { resolve = done; });
  let active = true; const pending = f.workspace.choose('p1', gallery.emptyGallery(), 'library', () => active);
  active = false; resolve({ canceled: false, assets: [image()] }); const result = await pending;
  assert.equal(result.photos.length, 0); assert.equal(f.resources.length, 0);
});
test('closing during asynchronous staging releases the late copy', async () => {
  const f = fixture(); let complete; f.queue.push({ canceled: false, assets: [image()] });
  const prepare = f.adapter.prepare; f.adapter.prepare = async (...args) => { await new Promise((done) => { complete = done; }); return prepare(...args); };
  const pending = f.select(); await new Promise(setImmediate); f.workspace.close(); complete();
  assert.equal((await pending).photos.length, 0); assert.equal(f.disposed.length, 1); assert.equal(f.closed, true);
});
test('shared saved references and other properties survive draft cancellation', async () => {
  const f = fixture(); f.queue.push({ canceled: false, assets: [image()] }); const saved = await f.select();
  f.queue.push({ canceled: false, assets: [image('b')] }); const other = await f.select(gallery.emptyGallery(), 'p2');
  f.queue.push({ canceled: false, assets: [image('c')] }); await f.select(saved);
  f.workspace.reconcile([saved, other]); assert.equal(f.disposed.length, 1);
  f.workspace.validate('p1', saved); f.workspace.validate('p2', other);
});
test('gallery association validation rejects cross-property records and invalid covers', () => {
  const a = gallery.propertyGallery(data.properties[0]); assert.throws(() => gallery.withPropertyGallery(data.properties[1], a));
  assert.throws(() => gallery.withPropertyGallery(data.properties[0], { ...a, coverPhotoId: 'missing' }));
});
for (const [address, city, expected] of [
  ['12 University Road, Thohoyandou', 'Thohoyandou', '12 University Road, Thohoyandou'],
  [' 12 University Road ,  thohoyandou, ', ' THOHOYANDOU ', '12 University Road, thohoyandou'],
  ['12 University Road', 'Thohoyandou', '12 University Road · Thohoyandou'],
  ['12 Road, Cape Town, 8001', 'Cape Town', '12 Road, Cape Town, 8001'],
  ['12 Road Cape Town South Africa', 'Cape Town', '12 Road Cape Town South Africa'],
  ['12 Road, , Cape Town,', 'Cape Town', '12 Road, Cape Town'],
  ['', 'Pretoria', 'Pretoria'], ['12 Road', '', '12 Road'], ['', '', ''],
]) test(`address display normalizes without city duplication: ${address}/${city}`, () => assert.equal(details.getPropertyAddress({ address, city }), expected));
test('amenities trim, deduplicate case-insensitively and preserve uncommon names', () => {
  assert.deepEqual(Array.from(manager.normalizeAmenities(' Wi-Fi,Water, wi-fi, Music room,  Water , Shared   kitchen ')), ['Wi-Fi','Water','Music room','Shared kitchen']);
});
test('manager inventory is listed rooms, not tenant-derived physical occupancy', () => {
  const state = manager.createManagerState(); const p1 = state.properties.find((p) => p.id === 'p1');
  assert.equal(p1.available, 10); assert.equal(p1.price, 2200);
  assert.deepEqual(Array.from(p1.rooms, (room) => [room.id, room.price, room.available]), [['r1',3500,4],['r2',2200,6]]);
  const metrics = manager.getManagerMetrics({ ...state, tenants: [...state.tenants, { ...state.tenants[1], id: 'another-shared-tenant' }] });
  assert.equal(metrics.activeTenants, 4); assert.equal(metrics.occupiedRooms, null); assert.equal(metrics.occupancyRate, null);
  assert.ok(!p1.rooms.some((room) => room.id === 'r3'));
});
function propertyEditor(screen) { return screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertyForm'); }
function openAdd(screen) {
  screen.render().find((node) => node.props.accessibilityLabel === 'Properties').props.onPress();
  const page = screen.render().find((node) => typeof node.type === 'function' && node.type.name === 'PropertiesPage'); page.props.onAdd();
}
test('Add Property saves a staged gallery once with its stable property ID', async () => {
  const f = fixture(), screen = harness('src/screens/ManagerScreen.tsx', { managerPhotoAdapter: f.adapter }); openAdd(screen);
  const fields = { name:'New Court',city:'Pretoria',address:'10 Road',university:'up',description:'Near campus',type:'Residence',roomType:'Single',roomCapacity:'1',roomPrice:'3500',roomAvailable:'4',amenities:'Water, water, Music room' };
  for (const [key,value] of Object.entries(fields)) propertyEditor(screen).props.onChange(key,value);
  f.queue.push({ canceled:false,assets:[image()] }); await propertyEditor(screen).props.onChoosePhotos('library');
  const save = propertyEditor(screen).props.onSave; save(); save();
  const detail = screen.render().find((n) => typeof n.type === 'function' && n.type.name === 'PropertyDetail');
  assert.equal(detail.props.property.id,'manager-property-1'); assert.equal(detail.props.property.photos.length,1);
  assert.equal(detail.props.property.photos[0].propertyId,'manager-property-1'); assert.equal(screen.alerts.filter((a) => a[0] === 'Changes saved').length,1);
});
test('invalid property save retains its draft gallery and creates no record', async () => {
  const f = fixture(), screen = harness('src/screens/ManagerScreen.tsx', { managerPhotoAdapter:f.adapter }); openAdd(screen);
  f.queue.push({ canceled:false,assets:[image()] }); await propertyEditor(screen).props.onChoosePhotos('library');
  propertyEditor(screen).props.onSave(); const editor=propertyEditor(screen);
  assert.ok(editor.props.errors.name); assert.equal(editor.props.gallery.photos.length,1); assert.equal(screen.alerts.length,0);
});
test('unsaved gallery changes invoke Keep editing/Discard and preserve saved fixtures', async () => {
  const f=fixture(), screen=harness('src/screens/ManagerScreen.tsx',{ managerPhotoAdapter:f.adapter }); openAdd(screen);
  f.queue.push({canceled:false,assets:[image()]}); await propertyEditor(screen).props.onChoosePhotos('camera');
  const editor = propertyEditor(screen); assert.equal(screen.removal.enabled,true); editor.props.onCancel();
  assert.equal(screen.alerts.at(-1)[0],'Discard unsaved changes?'); assert.equal(propertyEditor(screen).props.gallery.photos.length,1);
  screen.alerts.at(-1)[2].find((b)=>b.text==='Discard').onPress(); assert.equal(propertyEditor(screen),undefined); assert.equal(f.disposed.length,1);
});
test('all four manager navigation targets keep blue selected styling without a label underline/indicator', () => {
  const screen=harness('src/screens/ManagerScreen.tsx');
  for(const name of ['Dashboard','Properties','Applications','More']) {
    screen.render().find((n)=>n.props.accessibilityLabel===name).props.onPress();
    const tab=screen.render().find((n)=>n.props.accessibilityLabel===name);
    assert.equal(tab.props.accessibilityState.selected,true);
    const children=elements(tab); const label=children.find((n)=>n.type==='Text');
    assert.equal(label.props.style[1].color,'#2563EB'); assert.equal(label.props.style[1].textDecorationLine,undefined);
    assert.equal(children.filter((n)=>n.type==='View').length,0,'No decorative line below selected text');
  }
});
test('funding declarations are concise and approvals/rejections are truly disabled', () => {
  for(const application of manager.managerApplications) {
    const screen=harness('src/screens/ManagerScreen.tsx',{exportName:'ApplicationDetail',props:{application,note:'',reviewStatus:'Not reviewed',onNote(){},onFundingStatus(){},onSave(){},onBack(){}}});
    const nodes=screen.render(); const rows=nodes.filter((n)=>typeof n.type==='function'&&n.type.name==='DetailRow');
    assert.equal(rows.filter((n)=>n.props.label==='Student declaration').length,1);
    assert.ok(!rows.some((n)=>n.props.label==='Declaration'||n.props.label==='Student-declared status'));
    const decisions=nodes.filter((n)=>n.type==='Btn'&&/^(Approve|Reject) Unavailable$/.test(n.props.children));
    assert.equal(decisions.length,2); assert.ok(decisions.every((n)=>n.props.disabled&&!n.props.onPress));
  }
});
for(const width of [320,411,480,800]) for(const fontScale of [1,1.3,2]) test(`gallery controls adapt at ${width}dp/${fontScale}`,()=>{
  const screen=harness('src/components/ManagerPropertyGallery.tsx',{exportName:'ManagerPropertyGallery',width,fontScale,props:{gallery:gallery.propertyGallery(data.properties[0]),busy:false,error:'',onChange(){},onChoose:async()=>{}}});
  const nodes=screen.render(), cards=nodes.filter((n)=>n.type==='View'&&Array.isArray(n.props.style)&&n.props.style[1]?.width);
  assert.ok(cards.length); assert.ok(cards.every((n)=>n.props.style[1].width===(width<390||fontScale>=1.5?'100%':'48%')));
  assert.ok(nodes.some((n)=>n.props.accessibilityLabel==='Add property photos from Photo Library'));
});

// Exercise the installed-SDK adapter contract with an isolated in-memory file
// provider. This checks copy/ownership/error behavior, not native device I/O.
function sdkFixture(platform = 'android') {
  const files = new Map(), directories = new Set(['file:///documents/', 'file:///cache/', 'file:///cache/ImagePicker/']);
  const deleted = [], calls = [], config = { copyError:false, decodeError:false, deleteError:false };
  const path = (parts) => {
    const [base,...rest] = parts.map((p)=>typeof p === 'string'?p:p.uri);
    return [base.replace(/\/$/,''),...rest.map((p)=>p.replace(/^\/|\/$/g,''))].join('/');
  };
  class Directory {
    constructor(...parts) { this.uri=path(parts)+'/'; this.name=this.uri.split('/').at(-2); }
    get exists(){return directories.has(this.uri);}
    create(){directories.add(this.uri);}
    list(){return [...directories,...files.keys()].filter((uri)=>uri!==this.uri&&uri.startsWith(this.uri)&&!uri.slice(this.uri.length).replace(/\/$/,'').includes('/')).map((uri)=>uri.endsWith('/')?new Directory(uri):new File(uri));}
    delete(){if(config.deleteError)throw Error('locked'); for(const uri of files.keys())if(uri.startsWith(this.uri)){deleted.push(uri);files.delete(uri);} for(const uri of [...directories])if(uri.startsWith(this.uri))directories.delete(uri);}
  }
  class File {
    constructor(...parts){this.uri=path(parts);}
    get exists(){return files.has(this.uri);}
    get size(){return files.get(this.uri)?.size??0;}
    get md5(){return files.get(this.uri)?.hash??null;}
    get parentDirectory(){return new Directory(this.uri.slice(0,this.uri.lastIndexOf('/')));}
    async copy(target){files.set(target.uri,{...files.get(this.uri)}); if(config.copyError)throw Error('partial copy failure');}
    delete(){if(config.deleteError)throw Error('locked'); deleted.push(this.uri);files.delete(this.uri);}
    open(){const entry=files.get(this.uri);return{readBytes:(n)=>new Uint8Array(entry.prefix).slice(0,n),close(){}};}
  }
  const Paths={document:new Directory('file:///documents'),cache:new Directory('file:///cache'),availableDiskSpace:500*1024*1024};
  const picker={getPendingResultAsync:async()=>null,getCameraPermissionsAsync:async()=>({granted:true}),requestCameraPermissionsAsync:async()=>({granted:false}),
    launchCameraAsync:async(options)=>{calls.push(['camera',options]);return{canceled:true,assets:null};},
    launchImageLibraryAsync:async(options)=>{calls.push(['library',options]);return{canceled:true,assets:null};},
    UIImagePickerPreferredAssetRepresentationMode:{Current:'current'},
  };
  const native=load('src/managerPhotoAdapter.ts',{'expo-image-picker':picker,'expo-file-system':{Directory,File,Paths,FileMode:{ReadOnly:1}},'react-native':{Platform:{OS:platform},Image:{getSize:async()=>{if(config.decodeError)throw Error('not an image');return{width:100,height:100};}}},'./managerGallery':gallery});
  const source=image('source');source.uri='file:///cache/ImagePicker/source.jpg';
  files.set(source.uri,{size:100,prefix:[255,216,255,1,2,3,4,5],hash:'source-hash'});
  return{adapter:native.createManagerPhotoAdapter(),createAdapter:native.createManagerPhotoAdapter,files,directories,deleted,calls,config,Paths,picker,source};
}
for(const platform of ['android','ios']) test(`${platform} library picker supports bounded multiple images without broad library permission`,async()=>{
  const f=sdkFixture(platform); const result=await f.adapter.pick('library',3);
  assert.equal(result.canceled,true); assert.equal(f.calls[0][0],'library');
  const options=f.calls[0][1];assert.equal(options.allowsMultipleSelection,true);assert.equal(options.selectionLimit,3);
  assert.equal(options.base64,false);assert.equal(options.exif,false);assert.equal(options.preferredAssetRepresentationMode,'current');
});
test('camera denial and cancellation never stage files',async()=>{
  const f=sdkFixture();f.picker.getCameraPermissionsAsync=async()=>({granted:false,canAskAgain:false});
  await assert.rejects(f.adapter.pick('camera',1),{code:'permission'});assert.equal(f.calls.length,0);
  f.picker.getCameraPermissionsAsync=async()=>({granted:true});assert.equal((await f.adapter.pick('camera',1)).canceled,true);
});
test('SDK photo staging uses its own Documents namespace, preserves picker source and owns only its copy',async()=>{
  const f=sdkFixture();const resource=await f.adapter.prepare(f.source,'photo-a');
  assert.match(resource.uri,/^file:\/\/\/documents\/campusstay-manager-photos-v1\/property-photos-/);
  assert.equal(resource.available(),true);assert.equal(resource.fingerprint,'source-hash');
  resource.dispose();assert.equal(f.files.has(f.source.uri),true);assert.equal(resource.available(),false);
  f.adapter.close();assert.ok(f.deleted.every((uri)=>uri!==f.source.uri));
});
test('student staging and arbitrary file references cannot enter a property gallery',async()=>{
  const f=sdkFixture();for(const uri of ['file:///documents/student-id.jpg','file:///no_backup/campusstay-document-staging-v1/identity.jpg','content://external/1']){
    f.files.set(uri,{size:100,prefix:[255,216,255],hash:'private'});
    await assert.rejects(f.adapter.prepare({...f.source,uri},'photo-a'),{code:'file'});
    assert.equal(f.files.has(uri),true);
  }
  assert.equal(f.deleted.length,0);
});
test('low storage prevents copying, with an actionable photo error',async()=>{
  const f=sdkFixture();f.Paths.availableDiskSpace=1024;await assert.rejects(f.adapter.prepare(f.source,'photo-a'),{code:'storage'});
  assert.equal(f.files.size,1);
});
test('oversized source metadata is checked independently of the picker-reported size',async()=>{
  const f=sdkFixture();f.files.get(f.source.uri).size=gallery.MAX_PROPERTY_PHOTO_BYTES+1;
  await assert.rejects(f.adapter.prepare(f.source,'photo-a'),{code:'size'});assert.equal(f.files.size,1);
});
for(const failure of ['copyError','decodeError']) test(`${failure} releases a failed candidate and preserves its source`,async()=>{
  const f=sdkFixture();f.config[failure]=true;await assert.rejects(f.adapter.prepare(f.source,'photo-a'),{code:'file'});
  assert.equal(f.files.size,1);assert.equal(f.files.has(f.source.uri),true);
});
test('mislabelled image content is rejected before the gallery owns it',async()=>{
  const f=sdkFixture();f.files.get(f.source.uri).prefix=[37,80,68,70,45,0,0,0];
  await assert.rejects(f.adapter.prepare(f.source,'photo-a'),{code:'type'});assert.equal(f.files.size,1);
});
test('an existing staged filename is never overwritten or deleted on an ID collision',async()=>{
  const f=sdkFixture();const saved=await f.adapter.prepare(f.source,'photo-a');
  await assert.rejects(f.adapter.prepare(f.source,'photo-a'),{code:'file'});
  assert.equal(saved.available(),true);assert.equal(f.deleted.length,0);
});
test('an owned photo remains usable after the disposable picker cache copy disappears',async()=>{
  const f=sdkFixture();const photo=await f.adapter.prepare(f.source,'photo-a');
  f.files.delete(f.source.uri);assert.equal(photo.available(),true);f.adapter.close();
});
test('failed candidate deletion blocks another selection until cleanup succeeds',async()=>{
  const f=sdkFixture();f.config.copyError=true;f.config.deleteError=true;
  await assert.rejects(f.adapter.prepare(f.source,'photo-a'));
  await assert.rejects(f.adapter.pick('library',1),{code:'cleanup'});
  f.config.copyError=false;f.config.deleteError=false;await f.adapter.pick('library',1);assert.equal(f.files.size,1);
});
test('stale workspace cleanup does not delete another active workspace gallery',async()=>{
  const f=sdkFixture();const first=await f.adapter.prepare(f.source,'photo-a');
  // Same adapter module/provider, different workspace instance.
  const other=f.createAdapter();const second=await other.prepare({...f.source},'photo-b');
  assert.equal(first.available(),true);assert.equal(second.available(),true);
  f.adapter.close();assert.equal(first.available(),false);assert.equal(second.available(),true);
  other.close();assert.equal(second.available(),false);assert.equal(f.files.has(f.source.uri),true);
});

function openEdit(screen,id='p1') {
  screen.render().find((n)=>n.props.accessibilityLabel==='Properties').props.onPress();
  screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertiesPage').props.onOpen(id);
  screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyDetail').props.onEdit();
}
test('Edit Property saves gallery order/cover without changing another property or student fixtures',async()=>{
  const f=fixture(),screen=harness('src/screens/ManagerScreen.tsx',{managerPhotoAdapter:f.adapter}),seeds=clone(data.properties);
  openEdit(screen);const original=clone(propertyEditor(screen).props.gallery);
  f.queue.push({canceled:false,assets:[image('extra')]});await propertyEditor(screen).props.onChoosePhotos('library');
  let draft=propertyEditor(screen).props.gallery;const id=draft.photos.at(-1).id;
  draft=gallery.changeGallery(gallery.changeGallery(draft,id,'earlier'),id,'cover');propertyEditor(screen).props.onGallery(draft);
  propertyEditor(screen).props.onSave();let detail=screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyDetail');
  assert.equal(detail.props.property.id,'p1');assert.equal(detail.props.property.coverPhotoId,id);
  assert.equal(detail.props.property.images[0],draft.photos.find((p)=>p.id===id).uri);
  assert.deepEqual(clone(detail.props.property.photos.map((p)=>p.id)),clone(draft.photos.map((p)=>p.id)));
  detail.props.onBack();const list=screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertiesPage');
  assert.deepEqual(clone(list.props.properties.find((p)=>p.id==='p2').images),seeds.find((p)=>p.id==='p2').images);
  assert.deepEqual(clone(data.properties),seeds);assert.equal(original.photos.length+1,draft.photos.length);
});
test('Discarding an edited gallery keeps its saved gallery and releases only added copies',async()=>{
  const f=fixture(),screen=harness('src/screens/ManagerScreen.tsx',{managerPhotoAdapter:f.adapter});openEdit(screen);
  const original=clone(propertyEditor(screen).props.gallery);f.queue.push({canceled:false,assets:[image('extra')]});
  await propertyEditor(screen).props.onChoosePhotos('library');propertyEditor(screen).props.onCancel();
  screen.alerts.at(-1)[2].find((b)=>b.text==='Discard').onPress();
  const detail=screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyDetail');
  assert.deepEqual(clone(gallery.propertyGallery(detail.props.property)),original);assert.equal(f.disposed.length,1);
});
test('room edit ownership and root/tab exits participate in dirty-form protection',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx');openEdit(screen);propertyEditor(screen).props.onCancel();
  const detail=screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyDetail');
  detail.props.onRoomDirty('r1',true);screen.render();assert.equal(screen.removal.enabled,true);
  screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyDetail').props.onBack();assert.equal(screen.alerts.at(-1)[0],'Discard unsaved changes?');
  screen.alerts.at(-1)[2].find((b)=>b.text==='Discard').onPress();
  screen.render();assert.equal(screen.removal.enabled,false);
});
test('review-note cancellation and application switches do not mix saved notes or decisions',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx');screen.render().find((n)=>n.props.accessibilityLabel==='Applications').props.onPress();
  const appPage=()=>screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='ApplicationsPage');
  const detail=()=>screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='ApplicationDetail');
  const apps=appPage().props.applications;appPage().props.onOpen(apps[0]);detail().props.onNote('Saved for first applicant');detail().props.onSave();detail().props.onBack();
  appPage().props.onOpen(apps[1]);assert.equal(detail().props.note,'');detail().props.onNote('Discard second note');detail().props.onBack();
  screen.alerts.at(-1)[2].find((b)=>b.text==='Discard').onPress();appPage().props.onOpen(apps[0]);
  assert.equal(detail().props.note,'Saved for first applicant');assert.equal(detail().props.application.status,apps[0].status);
  assert.equal(detail().props.reviewStatus,'Not reviewed');assert.equal(screen.calls.length,0,'No external communication/navigation action was dispatched');
});
test('rapid photo-picker taps open only one native selection and keep the editor busy',async()=>{
  const f=fixture();let finish,picks=0;f.adapter.pick=()=>{picks++;return new Promise((done)=>{finish=done;});};
  const screen=harness('src/screens/ManagerScreen.tsx',{managerPhotoAdapter:f.adapter});openAdd(screen);
  const choose=propertyEditor(screen).props.onChoosePhotos;const pending=choose('library');await choose('camera');
  assert.equal(picks,1);assert.equal(propertyEditor(screen).props.photoBusy,true);
  finish({canceled:true});await pending;assert.equal(propertyEditor(screen).props.photoBusy,false);
});
test('a save callback captured before selection cannot save while a picker is in flight',async()=>{
  const f=fixture();let finish;f.adapter.pick=()=>new Promise((done)=>{finish=done;});
  const screen=harness('src/screens/ManagerScreen.tsx',{managerPhotoAdapter:f.adapter});openAdd(screen);
  const fields={name:'New Court',city:'Pretoria',address:'10 Road',university:'up',description:'Near campus',type:'Residence',roomType:'Single',roomCapacity:'1',roomPrice:'3500',roomAvailable:'4'};
  for(const [key,value]of Object.entries(fields))propertyEditor(screen).props.onChange(key,value);
  const editor=propertyEditor(screen),save=editor.props.onSave,pending=editor.props.onChoosePhotos('library');
  save();assert.ok(propertyEditor(screen));assert.equal(screen.alerts.length,0);
  finish({canceled:true});await pending;
});
test('saved-photo preview button children remain valid native text content',()=>{
  const screen=harness('src/components/ManagerPropertyGallery.tsx',{exportName:'ManagerPhotoPreview',props:{gallery:gallery.propertyGallery(data.properties[0])}});
  const buttons=screen.render().filter((n)=>n.type==='Btn'&&n.props.accessibilityLabel?.startsWith('Preview saved property photo'));
  assert.ok(buttons.length);assert.ok(buttons.every((button)=>typeof button.props.children==='string'));
});
test('workspace byte budget rejects only new candidates without releasing saved galleries',async()=>{
  const f=fixture();const large=(key)=>({...image(key),fileSize:10*1024*1024});
  f.queue.push({canceled:false,assets:Array.from({length:8},(_,i)=>large(String(i)))});const saved=await f.select();
  f.queue.push({canceled:false,assets:[large('other-a'),large('other-b'),large('other-c')]});
  await assert.rejects(f.select(gallery.emptyGallery(),'p2'),{code:'workspace'});
  f.workspace.validate('p1',saved);assert.equal(f.disposed.length,3);
});
for(const width of [320,411,480,800])for(const fontScale of [1,1.3,2])test(`manager dashboard/navigation retain responsive targets at ${width}dp/${fontScale}`,()=>{
  const screen=harness('src/screens/ManagerScreen.tsx',{width,fontScale});const nodes=screen.render();
  const tabs=nodes.filter((n)=>n.props.accessibilityRole==='tab');assert.equal(tabs.length,4);
  assert.ok(tabs.every((tab)=>tab.props.style[1].minHeight>=44));
  const dashboard=nodes.find((n)=>typeof n.type==='function'&&n.type.name==='Dashboard');
  assert.ok(dashboard.props.cardWidth<=width);const cards=elements(dashboard.type(dashboard.props)).filter((n)=>n.props.accessibilityHint?.startsWith('Opens '));
  assert.equal(cards.length,6);assert.ok(cards.some((n)=>n.props.accessibilityLabel.startsWith('Rooms listed:')));
  assert.ok(cards.some((n)=>n.props.accessibilityLabel==='Room occupancy: Not recorded'));
});
