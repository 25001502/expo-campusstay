const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const {harness, load, elements, data, application} = require('./profile-harness.cjs');
const {providerHarness} = require('./application-provider-harness.cjs');
const documents = load('src/documents.ts');
const {normalizeImageAttachment} = load('src/imageAttachments.ts', {'./documents': documents});
const {DocumentIssue, MAX_DOCUMENT_BYTES} = documents;
const text = (value) => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text(value.props?.children) : value == null ? '' : String(value);
const visibleText = (nodes) => nodes.filter(n => n.type === 'Text').map(n => text(n.props.children)).join(' ');
const named = (nodes, label) => { const node = nodes.find(n => (n.props.accessibilityLabel ?? n.props.label ?? n.props.children) === label); assert.ok(node, label); return node; };
const sheet = (s) => s.render().find(n => n.type === 'ChoiceSheet');
const expand = (nodes) => nodes.flatMap(n => typeof n.type === 'function' ? elements(n.type(n.props)) : [n]);
const tick = () => new Promise(setImmediate);

test('shared select displays ordinary scaled text, opens options and returns the selected university on both platforms', () => {
  for (const platform of ['ios','android']) {
    const props = {label:'University',value:'',required:true,placeholder:'Select your university',options:data.universities.map(u => ({value:u.id,label:u.name})),onChange(value){props.value=value;}};
    const s = harness('src/components/SelectField.tsx',{exportName:'SelectField',props,platform});
    assert.match(visibleText(s.render()), /Select your university/);
    named(s.render(),'University, required').props.onPress(); assert.equal(sheet(s).props.visible,true); assert.equal(s.keyboardDismissals,1);
    named(s.render(),'University of the Witwatersrand').props.onPress(); assert.equal(props.value,'wits'); assert.equal(sheet(s).props.visible,false);
    assert.equal(named(s.render(),'University, required').props.accessibilityValue.text,'University of the Witwatersrand');
    const value=s.render().find(n=>n.type==='Text' && n.props.children==='University of the Witwatersrand');
    assert.equal(value.props.numberOfLines,undefined); assert.equal(value.props.allowFontScaling,undefined);
    named(s.render(),'University, required').props.onPress(); assert.equal(s.render().find(n=>n.props.accessibilityRole==='radio' && n.props.accessibilityLabel==='University of the Witwatersrand').props.accessibilityState.selected,true);
    sheet(s).props.onClose(); assert.equal(props.value,'wits');
  }
});

test('relationship select supports missing values, original options, selected text and accessible validation', () => {
  const props={label:'Relationship',value:'',required:true,error:'Choose an emergency contact relationship.',options:['Parent','Sibling','Guardian','Spouse','Friend'].map(value=>({value,label:value})),onChange(value){props.value=value;}};
  const s=harness('src/components/SelectField.tsx',{exportName:'SelectField',props,platform:'ios'});
  assert.match(visibleText(s.render()),/Select an option/); assert.ok(s.render().find(n=>n.props.accessibilityRole==='alert'));
  for(const value of props.options){named(s.render(),'Relationship, required').props.onPress();named(s.render(),value.label).props.onPress();assert.equal(named(s.render(),'Relationship, required').props.accessibilityValue.text,value.label);}
  assert.equal(application.validateApplicationStep(3,{...application.createApplicationDraft(data.properties[0]),emergency:{fullName:'Synthetic Contact',relationship:'',phone:'0711111111'}},data.properties[0])['emergency.relationship'],'Select a relationship.');
});

test('actual application keeps Wits and Guardian through Back, Review and editing while preserving required validation', async () => {
  const s=harness('src/screens/ApplyScreen.tsx',{params:{property:data.properties[0],selectedRoomId:'r2'}});
  const press=async label=>named(expand(expand(s.render())),label).props.onPress();
  const field=(label,value)=>s.render().find(n=>n.type==='Input' && n.props.label===label).props.onChangeText(value);
  await press('Continue →');
  named(s.render(),'University').props.onChange('');await press('Continue →');assert.ok(named(s.render(),'University').props.error);
  named(s.render(),'University').props.onChange('wits');
  for(const [label,value] of [['Full name','Synthetic Student'],['Student number','1234'],['Phone number','0712345678'],['Email address','synthetic@example.com']])field(label,value);
  await press('Continue →');await press('NSFAS');
  for(const label of ['Student ID','Proof of Registration','ID / Passport']){s.pickerQueue.push({canceled:false,assets:[{name:'synthetic.pdf',mimeType:'application/pdf',size:200}]});await press(`Choose file for ${label}`);}
  await press('Continue →'); named(s.render(),'Relationship').props.onChange('');await press('Review Application');assert.ok(named(s.render(),'Relationship').props.error);
  named(s.render(),'Relationship').props.onChange('Guardian');field('Full name','Synthetic Contact');field('Phone number','0711111111');
  await press('Back to Documents');await press('Continue →');assert.equal(named(s.render(),'Relationship').props.value,'Guardian');
  await press('Review Application');assert.match(visibleText(expand(expand(s.render()))),/University of the Witwatersrand/);assert.match(visibleText(expand(expand(s.render()))),/Guardian/);
  await press('Edit Personal information');assert.equal(named(s.render(),'University').props.value,'wits');
});

function sourceButton(platform,onChoose=async()=>{}){return harness('src/components/AttachmentSourceButton.tsx',{exportName:'AttachmentSourceButton',platform,props:{categoryLabel:'Proof of Funding',replacing:true,disabled:false,onChoose}});}
test('iOS attachment menu uses native ActionSheetIOS, explicit Cancel and an anchor; each source routes once', async () => {
  const routed=[];
  for(const [index,source] of ['library','camera','files'].entries()){
    const s=sourceButton('ios',async value=>routed.push(value));
    named(s.render(),'Replace Proof of Funding').props.onPress();named(s.render(),'Replace Proof of Funding').props.onPress();
    const calls=s.calls.filter(c=>c.action==='actionSheet');assert.equal(calls.length,1);
    assert.deepEqual(Array.from(calls[0].args[0].options),['Photo Library','Take Photo','Choose Files','Cancel']);assert.equal(calls[0].args[0].cancelButtonIndex,3);assert.equal(calls[0].args[0].anchor,1);
    calls[0].args[1](index);s.flushAnimationFrames();await Promise.resolve();await Promise.resolve();assert.equal(routed.at(-1),source);assert.equal(sheet(s).props.visible,false);
  }
  const s=sourceButton('ios',async()=>assert.fail('Cancel launched a picker'));named(s.render(),'Replace Proof of Funding').props.onPress();s.calls[0].args[1](3);assert.equal(sheet(s).props.visible,false);
});
test('Android source sheet dismisses before picker launch, cancels safely and prevents overlapping choices', async () => {
  const routed=[];let finish;
  const s=sourceButton('android',source=>{routed.push(source);return new Promise(resolve=>{finish=resolve;});});
  named(s.render(),'Replace Proof of Funding').props.onPress();assert.equal(sheet(s).props.visible,true);assert.equal(s.calls.length,0);
  for(const label of ['Photo Library','Take Photo','Choose Files']){const child=named(s.render(),label).props.children;assert.equal(child.type,'View');assert.ok(elements(child).some(n=>n.type==='Text' && n.props.children===label));}
  sheet(s).props.onClose();assert.equal(sheet(s).props.visible,false);assert.equal(routed.length,0);
  named(s.render(),'Replace Proof of Funding').props.onPress();const first=named(s.render(),'Photo Library').props.onPress();named(s.render(),'Take Photo').props.onPress();
  assert.equal(sheet(s).props.visible,false);s.flushAnimationFrames();await Promise.resolve();assert.deepEqual(routed,['library']);assert.equal(named(s.render(),'Replace Proof of Funding').props.disabled,true);
  finish();await first;await tick();assert.equal(named(s.render(),'Replace Proof of Funding').props.disabled,false);
});
test('choice sheet exposes Back/outside dismissal and keeps Cancel outside the scrollable choices', () => {
  let closed=0;const s=harness('src/components/ChoiceSheet.tsx',{exportName:'ChoiceSheet',props:{visible:true,title:'Attach Student ID',onClose:()=>closed++,children:'Choices'}});
  s.render().find(n=>n.type==='Modal').props.onRequestClose();s.render().find(n=>n.type==='Pressable').props.onPress();assert.equal(closed,2);
  assert.ok(s.render().find(n=>n.type==='ScrollView'));assert.ok(named(s.render(),'Cancel'));assert.equal(s.render().find(n=>n.type==='Modal').props.animationType,'none');
});

function nativePicker(platform='android'){
  const calls=[],queue=[],discarded=[];let permission={granted:true,canAskAgain:true},requested={granted:true,canAskAgain:true},pending=null;
  const api={UIImagePickerPreferredAssetRepresentationMode:{Current:'current'},getPendingResultAsync:async()=>{calls.push(['pending']);return pending;},getCameraPermissionsAsync:async()=>{calls.push(['permission']);return permission;},requestCameraPermissionsAsync:async()=>{calls.push(['request']);return requested;},launchCameraAsync:async opts=>{calls.push(['camera',opts]);const v=queue.shift();if(v instanceof Error)throw v;return v;},launchImageLibraryAsync:async opts=>{calls.push(['library',opts]);const v=queue.shift();if(v instanceof Error)throw v;return v;}};
  const {pickNativeImage}=load('src/nativeImagePicker.ts',{'expo-image-picker':api,'react-native':{Platform:{OS:platform}},'./documents':documents,'./imageAttachments':{normalizeImageAttachment}});
  return {calls,queue,discarded,pick:source=>pickNativeImage(source,a=>discarded.push(a.uri)),setPermission:v=>{permission=v;},setRequested:v=>{requested=v;},setPending:v=>{pending=v;}};
}
test('Photo Library routes image-only without broad permission, cropping, EXIF or payload reads', async () => {
  for(const platform of ['ios','android'])for(const [name,mime] of [['original.jpg','image/jpeg'],['registration.png','image/png']]){
    const p=nativePicker(platform);p.queue.push({canceled:false,assets:[{uri:`file://private/ImagePicker/${name}`,fileName:name,mimeType:mime,fileSize:200,type:'image'}]});
    const result=await p.pick('library');assert.equal(result.assets[0].name,name);assert.equal(result.assets[0].mimeType,mime);
    assert.ok(!p.calls.some(([name])=>['request','permission'].includes(name)));
    const options=p.calls.find(([name])=>name==='library')[1];assert.deepEqual(Array.from(options.mediaTypes),['images']);assert.equal(options.allowsEditing,false);assert.equal(options.quality,1);assert.equal(options.exif,false);assert.equal(options.base64,false);assert.equal(options.allowsMultipleSelection,false);
  }
});
test('camera requests only camera access on demand and normalizes a meaningful JPEG filename', async () => {
  const p=nativePicker();p.setPermission({granted:false,canAskAgain:true});p.queue.push({canceled:false,assets:[{uri:'file://private/ImagePicker/capture.jpg',mimeType:'image/jpeg',fileSize:500,type:'image'}]});
  const result=await p.pick('camera');assert.equal(p.calls.filter(([name])=>name==='request').length,1);assert.match(result.assets[0].name,/^document-photo-image-.*\.jpg$/);assert.equal(result.assets[0].size,500);assert.equal(p.calls.find(([name])=>name==='camera')[1].allowsEditing,false);
});
test('denied or permanently blocked camera access never launches a picker or repeats a blocked request', async () => {
  for(const canAskAgain of [true,false]){const p=nativePicker();p.setPermission({granted:false,canAskAgain});p.setRequested({granted:false,canAskAgain:false});await assert.rejects(p.pick('camera'),/Camera access is off/);assert.equal(p.calls.filter(([name])=>name==='request').length,canAskAgain?1:0);assert.ok(!p.calls.some(([name])=>name==='camera'));}
});
test('camera/library cancellation and system failure return safely without inventing attachments', async () => {
  for(const source of ['library','camera']){const p=nativePicker();p.queue.push({canceled:true,assets:null});assert.equal((await p.pick(source)).canceled,true);p.queue.push(new Error('native failed'));await assert.rejects(p.pick(source),source==='camera'?/camera could not open/:/Photo Library could not open/);}
});
test('HEIC/HEIF, video, metadata conflicts and oversized photos are rejected without renaming their bytes', () => {
  for(const value of [{fileName:'original.heic',mimeType:'image/heic'},{fileName:'original.heif',mimeType:'image/heif'},{fileName:'original.heic',mimeType:'image/jpeg'},{fileName:'capture.jpg',mimeType:'image/jpeg',type:'video'},{fileName:'capture.png',mimeType:'image/jpeg'},{fileName:'capture.jpg',mimeType:'image/jpeg',fileSize:MAX_DOCUMENT_BYTES+1}])assert.throws(()=>normalizeImageAttachment({uri:'file://private/photo',...value}));
  assert.throws(()=>normalizeImageAttachment({uri:'file://private/unknown'}),/HEIC, HEIF/);
  assert.equal(normalizeImageAttachment({uri:'file://private/picture.png',mimeType:'image/png'}).mimeType,'image/png');
});
test('recovered Android media is discarded rather than assigned to a new application; invalid candidates release only SDK copy references', async () => {
  const p=nativePicker();p.setPending({canceled:false,assets:[{uri:'file://private/ImagePicker/abandoned.jpg'}]});p.queue.push({canceled:true});assert.equal((await p.pick('library')).canceled,true);assert.deepEqual(p.discarded,['file://private/ImagePicker/abandoned.jpg']);
  const q=nativePicker();q.queue.push({canceled:false,assets:[{uri:'file://private/ImagePicker/heic',fileName:'photo.heic',mimeType:'image/heic'}]});await assert.rejects(q.pick('library'),/HEIC, HEIF/);assert.deepEqual(q.discarded,['file://private/ImagePicker/heic']);
});

test('all three sources use the real provider/session pipeline, exact-ID funding update, My Documents and original-document ownership', async () => {
  const p=providerHarness();const draft=await p.validDraft();draft.funding={source:'nsfas',nsfasStatus:'pending',paymentDiscussionRequested:false};const saved=p.render().submitApplication(draft);
  for(const [source,name,mimeType] of [['library','support.png','image/png'],['camera','document-photo.jpg','image/jpeg'],['files','confirmation.pdf','application/pdf']]){
    p.queue.push({canceled:false,assets:[{name,mimeType,size:200}]});const choice=await p.render().chooseDocument(`editor-${source}`,'funding',source);assert.equal(choice.status,'selected');assert.equal(p.sources.at(-1),source);
    assert.equal(p.render().getApplication(saved.id).funding.nsfasStatus,source==='library'?'pending':'confirmed');
    await p.render().updateFunding(saved.id,`editor-${source}`,{...draft.funding,nsfasStatus:'confirmed'},choice.document);
    const current=p.render().getApplication(saved.id);assert.equal(current.id,saved.id);assert.equal(current.selectedRoomId,'r2');assert.equal(application.getSubmittedApplicationSummary(current,data.properties[0]).roomPrice,2200);assert.equal(current.personal,saved.personal);assert.equal(current.emergency,saved.emergency);assert.equal(current.attachments.identity,saved.attachments.identity);assert.equal(p.render().applications.length,1);
    const docs=harness('src/screens/MyDocumentsScreen.tsx',{applicationApi:()=>p.render()});assert.match(visibleText(docs.render()),new RegExp(name.replace('.','\\.')));
    if(mimeType.startsWith('image/'))assert.equal(p.render().previewDocument(saved.id,current.attachments.funding).status,'image');
  }
  p.render().clearApplications();assert.equal(p.render().applications.length,0);assert.ok(p.disposed.length>=6);
});
test('new source failures preserve original funding evidence and do not mutate its declaration before Save', async () => {
  const p=providerHarness(),draft=await p.validDraft();const saved=p.render().submitApplication(draft);
  p.queue.push({canceled:false,assets:[{name:'original.pdf',mimeType:'application/pdf',size:200}]});const original=(await p.render().chooseDocument('initial','funding','files')).document;await p.render().updateFunding(saved.id,'initial',draft.funding,original);
  for(const source of ['library','camera','files'])for(const result of [{canceled:true},new DocumentIssue('cameraPermission'),{canceled:false,assets:[{name:'too-big.jpg',mimeType:'image/jpeg',size:MAX_DOCUMENT_BYTES+1}]}]){p.queue.push(result);const choice=await p.render().chooseDocument(`failed-${source}`,'funding',source);assert.notEqual(choice.status,'selected');assert.equal(p.render().documentStatus(saved.id,original.id),'attached-local');assert.equal(p.render().getApplication(saved.id).attachments.funding.id,original.id);}
});
test('actual Documents callbacks route mixed sources into one application and keep funding and selected university', async () => {
  const p=providerHarness(),s=harness('src/screens/ApplyScreen.tsx',{applicationApi:()=>p.render(),params:{property:data.properties[0],selectedRoomId:'r1'}});
  const press=async label=>named(expand(expand(s.render())),label).props.onPress();
  const field=(label,value)=>s.render().find(n=>n.type==='Input' && n.props.label===label).props.onChangeText(value);
  await press('Continue →');named(s.render(),'University').props.onChange('wits');
  for(const [label,value] of [['Full name','Synthetic Student'],['Student number','1234'],['Phone number','0712345678'],['Email address','synthetic@example.com']])field(label,value);
  await press('Continue →');await press('NSFAS');
  for(const [label,source,name,mimeType] of [['Student ID','library','student.png','image/png'],['Proof of Registration','camera','document-photo.jpg','image/jpeg'],['ID / Passport','files','identity.pdf','application/pdf']]){
    p.queue.push({canceled:false,assets:[{name,mimeType,size:200}]});
    const control=s.render().find(n=>n.type?.name==='AttachmentSourceButton' && n.props.categoryLabel===label);await control.props.onChoose(source);assert.equal(p.sources.at(-1),source);
  }
  await press('Continue →');field('Full name','Synthetic Contact');field('Phone number','0711111111');named(s.render(),'Relationship').props.onChange('Guardian');await press('Review Application');
  const review=visibleText(expand(expand(s.render())));assert.match(review,/student.png/);assert.match(review,/document-photo.jpg/);assert.match(review,/identity.pdf/);assert.match(review,/Awaiting confirmation/);
  await press('Save Application');const saved=p.render().applications[0];assert.equal(saved.selectedRoomId,'r1');assert.equal(saved.personal.universityId,'wits');assert.equal(saved.emergency.relationship,'Guardian');assert.equal(saved.funding.nsfasStatus,'pending');
});
test('actual funding editor passes Photo Library, Camera and Files to the shared pipeline and preserves saved evidence until Save', async () => {
  const p=providerHarness(),saved=p.render().submitApplication(await p.validDraft());
  for(const [source,name,mimeType] of [['library','status.png','image/png'],['camera','document-photo.jpg','image/jpeg'],['files','confirmation.pdf','application/pdf']]){
    const s=harness('src/screens/UpdateFundingScreen.tsx',{applicationApi:()=>p.render(),params:{applicationId:saved.id}});
    const before=p.render().getApplication(saved.id);p.queue.push({canceled:false,assets:[{name,mimeType,size:200}]});
    await s.render().find(n=>n.type?.name==='AttachmentSourceButton').props.onChoose(source);assert.equal(p.sources.at(-1),source);assert.equal(p.render().getApplication(saved.id),before);
    await named(s.render(),'Save funding update').props.onPress();assert.equal(p.render().getApplication(saved.id).attachments.funding.name,name);assert.equal(p.render().getApplication(saved.id).selectedRoomId,'r2');assert.equal(p.render().applications.length,1);
  }
});
test('configuration declares only document-camera purpose, blocks microphone/storage and introduces no sharing or persistent services', () => {
  const config=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
  const plugin=config.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-image-picker')[1];assert.match(plugin.cameraPermission,/documents you choose to attach/);assert.equal(plugin.photosPermission,false);assert.equal(plugin.microphonePermission,false);
  for(const p of ['RECORD_AUDIO','READ_EXTERNAL_STORAGE','WRITE_EXTERNAL_STORAGE'])assert.ok(config.android.blockedPermissions.includes(`android.permission.${p}`));
  for(const path of ['src/nativeImagePicker.ts','src/imageAttachments.ts','src/components/AttachmentSourceButton.tsx','src/components/SelectField.tsx'])assert.doesNotMatch(fs.readFileSync(path,'utf8'),/fetch\(|AsyncStorage|SecureStore|console\.|requestMediaLibraryPermissions/);
  assert.doesNotMatch(fs.readFileSync('src/screens/ManagerScreen.tsx','utf8'),/ApplicationContext|AttachmentSession|documentAdapter/);
});
