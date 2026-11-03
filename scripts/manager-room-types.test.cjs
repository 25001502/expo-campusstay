const assert = require('node:assert/strict');
const test = require('node:test');
const { load, harness, elements, data } = require('./profile-harness.cjs');
const manager = load('src/manager.ts');
const application = load('src/application.ts');
const rooms = load('src/rooms.ts');
const copy = (value) => JSON.parse(JSON.stringify(value));
const single = () => ({ draftId:'single-draft',roomType:'Single',roomCapacity:'1',roomPrice:'3500',roomAvailable:'4' });
const shared = () => ({ draftId:'shared-draft',roomType:'Shared',roomCapacity:'2',roomPrice:'2200',roomAvailable:'6' });
const form = (sections = [single()]) => ({ name:'College Court',city:'Pretoria',address:'12 College Road',university:'up',description:'Student residence near campus',type:'Residence',amenities:'Wi-Fi, Water',...sections[0],rooms:sections });
for (const sections of [[single()],[shared()],[single(),shared()],[shared(),single()]]) test(`one property is created for ${sections.map((r)=>r.roomType).join(' + ')}`,()=>{
  const property=manager.createManagerProperty(form(sections),7);
  assert.equal(property.id,'manager-property-7');assert.equal(property.rooms.length,sections.length);
  assert.equal(new Set(property.rooms.map((r)=>r.id)).size,sections.length);
  assert.deepEqual(Array.from(property.rooms,(r)=>r.type),sections.map((r)=>r.roomType));
  assert.equal(property.available,sections.reduce((sum,r)=>sum+Number(r.roomAvailable),0));
  assert.equal(property.price,Math.min(...sections.map((r)=>Number(r.roomPrice))));
  assert.ok(property.rooms.every((r)=>r.id.startsWith(`${property.id}-room-`)));
  assert.deepEqual(copy(property.rooms),copy(manager.createManagerProperty(form(sections),7).rooms),'Saved IDs are deterministic, independent of draft keys');
});
test('the legacy first-room API and its stable ID remain compatible',()=>{
  const fields=form();delete fields.rooms;delete fields.draftId;
  const property=manager.createManagerProperty(fields,3);assert.equal(property.rooms[0].id,'manager-property-3-room-1');
});
test('duplicate types are rejected atomically with errors on both sections',()=>{
  const fields=form([single(),{...single(),draftId:'second'}]);
  const errors=manager.validateRoomSections(fields.rooms);
  assert.ok(errors.every((error)=>error.roomType));assert.ok(manager.validatePropertyForm(fields).rooms);
  assert.throws(()=>manager.createManagerProperty(fields,1));
});
for(const [key,value]of [['roomCapacity','1'],['roomCapacity','2.5'],['roomCapacity',''],['roomPrice','0'],['roomPrice','-1'],['roomPrice','Infinity'],['roomPrice','not a number'],['roomAvailable','-1'],['roomAvailable','1.5'],['roomAvailable','']])test(`invalid second-room ${key}=${value} prevents the entire save`,()=>{
  const fields=form([single(),{...shared(),[key]:value}]);
  assert.ok(manager.validateRoomSections(fields.rooms)[1][key]);assert.throws(()=>manager.createManagerProperty(fields,1));
});
test('Single capacity must be 1; Shared permits whole-number capacity above 2',()=>{
  assert.ok(manager.validateRoomForm({...single(),roomCapacity:'2'}).roomCapacity);
  assert.equal(Object.keys(manager.validateRoomForm({...shared(),roomCapacity:'4'})).length,0);
});
test('zero listed rooms is valid, but an empty or oversized room list is not',()=>{
  assert.equal(manager.createManagerProperty(form([{...single(),roomAvailable:'0'}]),1).available,0);
  for(const sections of [[],[single(),shared(),single()]])assert.throws(()=>manager.createManagerProperty(form(sections),1));
});
test('Studio cannot be configured as a new room type',()=>assert.throws(()=>manager.createManagerProperty(form([{...single(),roomType:'Studio'}]),1)));
test('add/edit/remove draft sections retain independent values and stable draft keys',()=>{
  let fields=form();fields=manager.addRoomSection(fields);
  assert.equal(fields.rooms[1].roomType,'Shared');assert.equal(fields.rooms[1].roomCapacity,'2');
  const secondId=fields.rooms[1].draftId;
  fields=manager.changeRoomSection(fields,1,'roomPrice','2200');fields=manager.changeRoomSection(fields,1,'roomAvailable','6');
  fields=manager.changeRoomSection(fields,0,'roomPrice','3700');
  assert.equal(fields.rooms[1].roomPrice,'2200');assert.equal(fields.rooms[0].roomPrice,'3700');
  assert.equal(manager.addRoomSection(fields),fields);assert.equal(manager.changeRoomSection(fields,1,'roomType','Single'),fields);
  fields=manager.removeRoomSection(fields,0);
  assert.equal(fields.rooms.length,1);assert.equal(fields.rooms[0].draftId,secondId);assert.equal(fields.roomType,'Shared');
  assert.equal(fields.roomPrice,'2200');assert.equal(fields.roomAvailable,'6');assert.equal(manager.removeRoomSection(fields,0),fields);
  const next=manager.addRoomSection(fields);assert.equal(next.rooms[1].roomType,'Single');assert.notEqual(next.rooms[1].draftId,secondId);
});
test('selecting a type supplies its correct capacity and prevents duplicates/Studio',()=>{
  let fields=manager.emptyPropertyForm();assert.equal(manager.addRoomSection(fields),fields);
  fields=manager.changeRoomSection(fields,0,'roomType','Shared');assert.equal(fields.roomCapacity,'2');
  fields=manager.changeRoomSection(fields,0,'roomType','Single');assert.equal(fields.roomCapacity,'1');
  assert.equal(manager.changeRoomSection(fields,0,'roomType','Studio'),fields);
});
test('transient draft identities do not cause false dirty-form changes',()=>{
  const fields=form();const same={...fields,rooms:[{...fields.rooms[0],draftId:'another-UI-key'}]};
  assert.equal(manager.propertyFormSignature(fields),manager.propertyFormSignature(same));
});
for(const original of [single(),shared()])test(`adding a missing type to ${original.roomType} preserves the same property and old room`,()=>{
  const initial=manager.createManagerState();const property=manager.createManagerProperty(form([original]),1);
  const state=manager.managerReducer(initial,{type:'add-property',property});
  const before=state.properties.find((p)=>p.id===property.id);const oldRoom=copy(before.rooms[0]);
  const missing=original.roomType==='Single'?shared():single();
  const next=manager.managerReducer(state,{type:'add-room',propertyId:property.id,fields:missing});
  const saved=next.properties.find((p)=>p.id===property.id);
  assert.equal(next.properties.length,state.properties.length);assert.equal(next.nextPropertySequence,state.nextPropertySequence);
  assert.equal(saved.id,property.id);assert.equal(saved.rooms.length,2);assert.deepEqual(copy(saved.rooms[0]),oldRoom);
  assert.notEqual(saved.rooms[1].id,saved.rooms[0].id);assert.equal(saved.available,10);assert.equal(saved.price,2200);
  assert.equal(next.applications,state.applications);assert.equal(next.tenants,state.tenants);
  assert.equal(manager.managerReducer(next,{type:'add-room',propertyId:property.id,fields:missing}),next,'Repeated taps cannot duplicate a type');
});
test('invalid/foreign add-room actions cannot partially update state',()=>{
  const state=manager.createManagerState();const before=copy(state);
  for(const action of [
    {type:'add-room',propertyId:'missing',fields:shared()},
    {type:'add-room',propertyId:'p1',fields:shared()},
    {type:'add-room',propertyId:'p1',fields:{...shared(),roomPrice:'0'}},
    {type:'add-room',propertyId:'p1',fields:{...single(),roomType:'Studio'}},
  ])assert.equal(manager.managerReducer(state,action),state);
  assert.deepEqual(copy(state),before);
});
test('new room IDs avoid existing IDs without changing historical references',()=>{
  const property={...data.properties[0],rooms:[{...data.properties[0].rooms[0],id:'p1-room-shared'}]};
  const updated=manager.addManagerRoom(property,shared());
  assert.equal(updated.rooms[0].id,'p1-room-shared');assert.equal(updated.rooms[1].id,'p1-room-shared-2');
  assert.equal(rooms.getHistoricalRoom(data.properties[0],'r3').price,4800);
});
test('retired Studio records are excluded and cannot be revived by adding a category',()=>{
  const historical=rooms.getHistoricalRoom(data.properties[0],'r3');
  const property={...data.properties[0],rooms:[data.properties[0].rooms[0],historical]};
  const updated=manager.addManagerRoom(property,shared());
  assert.ok(!updated.rooms.some((r)=>r.id==='r3'));assert.equal(updated.available,10);
  assert.equal(application.createApplicationDraft(updated,'r3').selectedRoomId,null);
  assert.equal(rooms.getHistoricalRoom(updated,'r3').id,'r3');
});
test('both room prices/counts can be edited independently while retaining IDs and property metadata',()=>{
  const property=manager.createManagerProperty(form([single(),shared()]),1),snapshot=copy(data.properties);
  const submitted=application.createSubmittedApplication(application.createApplicationDraft(property,property.rooms[0].id),'2026-10-17T12:00:00Z',1),historical=copy(submitted);
  let updated=manager.updateManagerRoom(property,property.rooms[0].id,{price:'3000',available:'3'});
  updated=manager.updateManagerRoom(updated,property.rooms[1].id,{price:'2000',available:'9'});
  assert.deepEqual(Array.from(updated.rooms,(r)=>r.id),Array.from(property.rooms,(r)=>r.id));
  assert.equal(updated.available,12);assert.equal(updated.price,2000);assert.equal(updated.address,property.address);
  assert.deepEqual(copy(submitted),historical);assert.deepEqual(copy(data.properties),snapshot);
});
test('student draft/review preselection targets each new room ID and price',()=>{
  const property=manager.createManagerProperty(form([single(),shared()]),1);
  for(const room of property.rooms){
    const draft=application.createApplicationDraft(property,room.id),review=application.buildApplicationReview(draft,property);
    assert.equal(draft.propertyId,property.id);assert.equal(draft.selectedRoomId,room.id);
    assert.equal(review.roomPrice,room.price);assert.equal(review.roomType,`${room.type} Room`);
  }
  const zero={...property,rooms:[{...property.rooms[0],available:0},property.rooms[1]]};
  assert.equal(application.createApplicationDraft(zero,zero.rooms[0].id).selectedRoomId,null);
});
test('the existing student application screen selects an added room in a registered-property snapshot',()=>{
  const base={...data.properties[0],rooms:[data.properties[0].rooms[0]]},property=manager.addManagerRoom(base,shared()),id=property.rooms[1].id;
  const screen=harness('src/screens/ApplyScreen.tsx',{params:{property,selectedRoomId:id}});
  const choices=screen.render().filter((node)=>node.props.accessibilityRole==='radio'&&node.props.testID?.startsWith('room-option-'));
  assert.equal(choices.length,2);assert.equal(choices.find((node)=>node.props.testID === `room-option-${id}`).props.accessibilityState.selected,true);
});
const editor=(screen)=>screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyForm');
const detail=(screen)=>screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertyDetail');
function openAdd(screen){
  screen.render().find((n)=>n.props.accessibilityLabel==='Properties').props.onPress();
  screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertiesPage').props.onAdd();
  for(const [key,value]of Object.entries(form()).filter(([key])=>!['rooms','draftId'].includes(key)))editor(screen).props.onChange(key,value);
}
test('the actual Add Property form saves two types, one gallery and one property on repeated taps',async()=>{
  const adapter={pick:async()=>({canceled:false,assets:[{uri:'file:///picker/photo.jpg',mimeType:'image/jpeg',fileName:'photo.jpg',fileSize:100}]}),
    prepare:async()=>({uri:'file:///owned/photo.jpg',size:100,fingerprint:'photo',available:()=>true,dispose(){}}),close(){}};
  const screen=harness('src/screens/ManagerScreen.tsx',{managerPhotoAdapter:adapter});openAdd(screen);
  await editor(screen).props.onChoosePhotos('library');editor(screen).props.onAddRoom();
  editor(screen).props.onRoomChange(1,'roomPrice','2200');editor(screen).props.onRoomChange(1,'roomAvailable','6');
  const save=editor(screen).props.onSave;save();save();const property=detail(screen).props.property;
  assert.equal(property.id,'manager-property-1');assert.equal(property.rooms.length,2);assert.equal(property.available,10);assert.equal(property.price,2200);
  assert.equal(property.photos.length,1);assert.equal(property.photos[0].propertyId,property.id);assert.equal(property.images[0],'file:///owned/photo.jpg');
  assert.deepEqual(Array.from(property.amenities),['Wi-Fi','Water']);assert.equal(screen.alerts.filter((a)=>a[0]==='Changes saved').length,1);
});
test('an invalid second section keeps the property/gallery draft instead of partially saving',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx');openAdd(screen);editor(screen).props.onAddRoom();editor(screen).props.onSave();
  assert.ok(editor(screen));assert.ok(editor(screen).props.roomErrors[1].roomPrice);assert.ok(editor(screen).props.roomErrors[1].roomAvailable);
  assert.equal(detail(screen),undefined);assert.equal(screen.alerts.length,0);
});
test('adding a type through the actual manager screen keeps property count, gallery and existing room intact',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx');openAdd(screen);editor(screen).props.onSave();
  const original=copy(detail(screen).props.property);const add=detail(screen).props.onAddRoom;add(shared());add(shared());
  const updated=detail(screen).props.property;assert.equal(updated.id,original.id);assert.equal(updated.rooms.length,2);
  assert.deepEqual(copy(updated.rooms[0]),original.rooms[0]);assert.deepEqual(copy(updated.photos),original.photos);
  assert.equal(updated.available,10);assert.equal(updated.price,2200);detail(screen).props.onBack();
  const page=screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='PropertiesPage');
  assert.equal(page.props.properties.length,3);assert.equal(page.props.properties.filter((p)=>p.id===original.id).length,1);
  screen.render().find((n)=>n.props.accessibilityLabel==='Dashboard').props.onPress();
  const dashboard=screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='Dashboard');
  assert.equal(dashboard.props.metrics.totalProperties,3);assert.equal(dashboard.props.metrics.availableRooms,28);
});
test('removing the first unsaved section saves only the retained Shared Room',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx');openAdd(screen);editor(screen).props.onAddRoom();
  editor(screen).props.onRoomChange(1,'roomPrice','2200');editor(screen).props.onRoomChange(1,'roomAvailable','6');editor(screen).props.onRemoveRoom(0);editor(screen).props.onSave();
  const property=detail(screen).props.property;assert.equal(property.rooms.length,1);assert.equal(property.rooms[0].type,'Shared');assert.equal(property.rooms[0].capacity,2);
});
test('creation selectors exclude the other category and hide the add button after both exist',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx');openAdd(screen);
  let component=editor(screen),nodes=elements(component.type(component.props));
  assert.ok(nodes.some((n)=>n.type==='Btn'&&n.props.children==='Add Another Room Type'));
  component.props.onAddRoom();component=editor(screen);nodes=elements(component.type(component.props));
  assert.ok(!nodes.some((n)=>n.type==='Btn'&&n.props.children==='Add Another Room Type'));
  const sections=nodes.filter((n)=>typeof n.type==='function'&&n.type.name==='RoomTypeSection');
  assert.deepEqual(Array.from(sections[0].props.options),['Single']);assert.deepEqual(Array.from(sections[1].props.options),['Shared']);
});
test('Add Room Type editor validates, cancels, marks dirty and blocks rapid duplicate saves',()=>{
  const property=manager.createManagerProperty(form(),1),saves=[],dirty=[];
  const screen=harness('src/screens/ManagerScreen.tsx',{exportName:'AddRoomEditor',props:{property,onSave:(fields)=>saves.push(fields),onDirty:(value)=>dirty.push(value)}});
  screen.render().find((n)=>n.type==='Btn'&&n.props.children==='Add Room Type').props.onPress();
  const section=()=>screen.render().find((n)=>typeof n.type==='function'&&n.type.name==='RoomTypeSection');
  assert.deepEqual(Array.from(section().props.options),['Shared']);assert.equal(section().props.fields.roomCapacity,'2');
  screen.render().find((n)=>n.props.children==='Save Room Type').props.onPress();assert.ok(section().props.errors.roomPrice);assert.equal(saves.length,0);
  section().props.onChange('roomPrice','2200');section().props.onChange('roomAvailable','6');
  section().props.onChange('roomCapacity','4');section().props.onChange('roomType','Shared');assert.equal(section().props.fields.roomCapacity,'4');
  const save=screen.render().find((n)=>n.props.children==='Save Room Type').props.onPress;save();save();assert.equal(saves.length,1);assert.equal(dirty.at(-1),false);
  screen.render().find((n)=>n.props.children==='Add Room Type').props.onPress();screen.render().find((n)=>n.props.children==='Cancel Room Type').props.onPress();
  assert.equal(saves.length,1);assert.equal(dirty.at(-1),false);
});
test('no Add Room Type control remains when both categories exist',()=>{
  const screen=harness('src/screens/ManagerScreen.tsx',{exportName:'AddRoomEditor',props:{property:manager.createManagerProperty(form([single(),shared()]),1),onSave(){},onDirty(){}}});
  assert.equal(screen.render().length,0);
});
for(const width of [320,411,480,800])for(const fontScale of [1,1.3,2])test(`room sections retain accessible inputs at ${width}dp/${fontScale}`,()=>{
  const screen=harness('src/screens/ManagerScreen.tsx',{exportName:'RoomTypeSection',width,fontScale,props:{fields:single(),errors:{},title:'Room type 1',options:['Single'],onChange(){},onRemove(){}}});
  const nodes=screen.render(),inputs=nodes.filter((n)=>n.type==='Input');assert.equal(inputs.length,3);
  assert.equal(inputs.find((n)=>n.props.label==='Room type 1: capacity').props.disabled,true);
  assert.ok(nodes.some((n)=>n.props.accessibilityLabel==='Remove room type 1'));
});
