const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { harness, load, elements, data, application } = require('./profile-harness.cjs');
const rooms = load('src/rooms.ts');
const details = load('src/propertyDetails.ts');
const manager = load('src/manager.ts');
const discovery = load('src/discovery.ts');
const property = data.properties[0];
const screen = (options = {}) => harness('src/screens/PropertyScreen.tsx', { params: { property }, ...options });
const expandedNodes = (result) => result.render().flatMap((node) => typeof node.type === 'function' ? elements(node.type(node.props)) : [node]);
const find = (nodes, label) => nodes.find((node) => (node.props.accessibilityLabel ?? node.props.label ?? node.props.children) === label);
const style = (value) => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const strings = (value) => Array.isArray(value) ? value.map(strings).join('') : value && typeof value === 'object' ? strings(value.props?.children) : value == null ? '' : String(value);
const text = (nodes) => nodes.filter((node) => node.type === 'Text').map((node) => strings(node.props.children)).join(' ');
const tab = (result, label) => result.render().find((node) => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === label).props.onPress();
const gallery = (result) => result.render().find((node) => node.type === 'FlatList');
const fixture = (propertyId, roomId) => data.properties.find((item) => item.id === propertyId).rooms.find((room) => room.id === roomId);
const fields = () => ({ ...manager.emptyPropertyForm(), name:'Library Court',city:'Pretoria',address:'10 College Road',university:'up',description:'Student accommodation.',type:'Residence',roomType:'Single',roomCapacity:'1',roomPrice:'4100',roomAvailable:'5',amenities:'Wi-Fi' });

test('the canonical taxonomy has exactly Single Room and Shared Room', () => {
  assert.deepEqual(Array.from(rooms.ROOM_TYPES, (type) => `${type} Room`), ['Single Room','Shared Room']);
  for (const value of ['Private','Studio','Apartment','Deluxe','']) assert.equal(rooms.isRoomType(value), false);
  for (const value of rooms.ROOM_TYPES) assert.equal(rooms.isRoomType(value), true);
});
test('occupancy classification supports one and multiple students without inventing invalid capacity', () => {
  assert.equal(rooms.classifyRoomCapacity(1), 'Single');
  for (const value of [2,3,8]) assert.equal(rooms.classifyRoomCapacity(value), 'Shared');
  for (const value of [0,-1,1.5,NaN,Infinity]) assert.equal(rooms.classifyRoomCapacity(value), undefined);
  for (const room of data.properties.flatMap((item) => item.rooms)) assert.equal(rooms.classifyRoomCapacity(room.capacity), room.type);
});
test('all eleven original property/room IDs, prices, counts and capacities are preserved', () => {
  const actual = data.properties.flatMap((item) => [...item.rooms, ...data.retiredRoomOfferings.filter((offering) => offering.propertyId === item.id).map((offering) => offering.room)].map((room) => [item.id,room.id,room.price,room.capacity,room.available,room.bathroom,room.furnished]));
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), [
    ['p1','r1',3500,1,4,'En-suite',true],['p1','r2',2200,2,6,'Shared',true],['p1','r3',4800,1,2,'En-suite',true],
    ['p2','r1',5200,1,3,'En-suite',true],['p2','r2',7800,2,5,'Shared',true],['p3','r1',4100,1,2,'En-suite',true],
    ['p3','r2',2600,2,3,'Shared',true],['p4','r1',6200,1,1,'En-suite',true],['p4','r2',3800,2,2,'Shared',true],
    ['p5','r1',3900,1,5,'En-suite',false],['p5','r2',2400,2,4,'Shared',false],
  ]);
});
test('single-occupancy studios retain their distinct variants and facilities', () => {
  assert.equal(rooms.getRoomLabel(rooms.getHistoricalRoom(property,'r3')), 'Single Room · Studio layout');
  assert.equal(rooms.getRoomLabel(fixture('p5','r1')), 'Single Room · Studio layout');
  assert.equal(fixture('p1','r1').variant, undefined);
  assert.equal(rooms.getRoomLabel(fixture('p2','r2')), 'Shared Room · Apartment layout');
});
test('category grouping preserves every offering exactly once and keeps totals unchanged', () => {
  for (const item of data.properties) {
    const groups = rooms.groupRoomOfferings(item.rooms);
    assert.deepEqual(Array.from(groups, (group) => group.type), ['Single','Shared']);
    assert.deepEqual(Array.from(groups.flatMap((group) => group.rooms), (room) => room.id).sort(), Array.from(item.rooms, (room) => room.id).sort());
    assert.equal(rooms.getListedRoomCount(item.rooms), item.available);
  }
  assert.equal(rooms.getListedRoomCount(rooms.groupRoomOfferings(property.rooms)[0].rooms), 4);
});
test('Property Rooms has only the Single and Shared offerings, with no Studio controls or price', () => {
  const result=screen(); tab(result,'Rooms'); const nodes=expandedNodes(result);
  assert.deepEqual(nodes.filter((node)=>node.type==='Text' && node.props.accessibilityRole==='header').map((node)=>strings(node.props.children)), ['Campus View Residence','Single Room','Shared Room']);
  assert.equal(nodes.filter((node)=>node.props.accessibilityRole==='radio').length,2);
  for(const id of ['r1','r2']) assert.ok(nodes.some((node)=>node.type==='Btn' && node.props.accessibilityLabel.endsWith(`offering ${id}`)));
  assert.equal(nodes.filter((node)=>node.type==='Btn' && node.props.accessibilityLabel?.startsWith('Apply for ')).length,2);
  assert.doesNotMatch(text(nodes), /Studio|4[\s,]?800|Private Room|Apartment Room|\bleft\b|\bFull\b/);
});
for(const id of ['r1','r2']) test(`room-specific Apply retains exact ${id} selection and price through review/status`,()=>{
  const result=screen(); tab(result,'Rooms');
  expandedNodes(result).find((node)=>node.type==='Btn' && node.props.accessibilityLabel.endsWith(`offering ${id}`)).props.onPress();
  const args=result.calls.at(-1).args; assert.equal(args[0],'Apply'); assert.equal(args[1].property.id,'p1'); assert.equal(args[1].selectedRoomId,id);
  const draft=application.createApplicationDraft(args[1].property,args[1].selectedRoomId);
  assert.equal(draft.selectedRoomId,id); assert.equal(application.buildApplicationReview(draft,property).roomPrice,fixture('p1',id).price);
  const saved=application.createSubmittedApplication(draft,'2026-10-14T12:00:00.000Z',1);
  const summary=application.getSubmittedApplicationSummary(saved,property);
  assert.equal(summary.roomType,rooms.getRoomLabel(fixture('p1',id))); assert.equal(summary.roomPrice,fixture('p1',id).price); assert.equal(summary.isBooking,false);
  result.route.params=args[1]; const applyNodes=result.renderScreen('src/screens/ApplyScreen.tsx');
  assert.ok(applyNodes.find((node)=>node.props.accessibilityRole==='radio' && node.props.accessibilityState.selected).props.accessibilityLabel.includes(`offering ${id}`));
});
test('sticky Apply requires an intentional room choice and scrolls to Rooms',()=>{
  const result=screen(); const calls=[];
  result.render().find((node)=>node.type==='ScrollView').props.ref.current={scrollTo:(value)=>calls.push(value)};
  result.render().find((node)=>node.type==='View' && node.props.onLayout).props.onLayout({nativeEvent:{layout:{y:540}}});
  find(result.render(),'Choose a room to apply').props.onPress(); result.flushAnimationFrames();
  assert.equal(result.calls.length,0); assert.equal(calls.at(-1).y,540);
  assert.equal(result.render().find((node)=>node.props.accessibilityLabel==='Rooms').props.accessibilityState.selected,true);
});
test('selection survives all property tabs and sticky Apply continues the exact Shared offering',()=>{
  const result=screen(); tab(result,'Rooms');
  expandedNodes(result).find((node)=>node.props.accessibilityRole==='radio' && node.props.accessibilityLabel.includes('offering r2')).props.onPress();
  tab(result,'Reviews'); tab(result,'About');
  find(result.render(),'Continue application for Shared Room, offering r2').props.onPress();
  assert.equal(result.calls.at(-1).args[1].selectedRoomId,'r2');
});
test('zero-listed offerings cannot be selected or applied to and never substitute another ID',()=>{
  const item={...property,rooms:property.rooms.map((room)=>({...room,available:0}))}; const result=screen({params:{property:item}}); tab(result,'Rooms');
  for(const node of expandedNodes(result).filter((node)=>node.props.accessibilityRole==='radio' || node.type==='Btn' && node.props.accessibilityLabel?.startsWith('Apply for'))) assert.equal(node.props.disabled,true);
  expandedNodes(result).find((node)=>node.type==='Btn' && node.props.accessibilityLabel?.endsWith('offering r1')).props.onPress();
  assert.equal(result.calls.length,0); assert.match(text(result.render()),/Room prices unavailable/);
});
test('favorites use the existing shared owner across both controls and tab changes',()=>{
  const result=screen(); find(result.render(),'Remove Campus View Residence from favorites').props.onPress();
  assert.deepEqual(Array.from(result.favoriteIds),[]); tab(result,'Rooms');
  result.render().find((node)=>node.type==='Btn' && node.props.accessibilityLabel==='Add Campus View Residence to favorites').props.onPress();
  assert.deepEqual(Array.from(result.favoriteIds),['p1']); tab(result,'Reviews'); assert.equal(find(result.render(),'Remove Campus View Residence from favorites').props.selected,true);
});
test('gallery pagination and swiping agree, including boundary offsets and safe content width',()=>{
  const result=screen({width:411,insets:{left:8,right:12}}); const calls=[]; gallery(result).props.ref.current={scrollToOffset:(value)=>calls.push(value)};
  find(result.render(),'View Campus View Residence image 3 of 4').props.onPress(); assert.equal(calls[0].offset,782);
  assert.equal(find(result.render(),'View Campus View Residence image 3 of 4').props.accessibilityState.selected,true);
  gallery(result).props.onMomentumScrollEnd({nativeEvent:{contentOffset:{x:391}}});
  assert.equal(find(result.render(),'View Campus View Residence image 2 of 4').props.accessibilityState.selected,true);
  assert.equal(gallery(result).props.getItemLayout(null,2).offset,782);
  for(const [offset,width,count,expected] of [[-100,300,4,0],[9999,300,4,3],[NaN,300,4,0],[100,0,4,0]]) assert.equal(details.getGalleryIndex(offset,width,count),expected);
});
test('missing or empty gallery images render one named fallback without a crash',()=>{
  for(const images of [undefined,[],['','  ']]) {
    const item={...property,images}; const result=screen({params:{property:item}}); const node=gallery(result).props.renderItem({item:gallery(result).props.data[0],index:0});
    assert.equal(node.props.source,null); assert.match(node.props.fallbackLabel,/Campus View Residence image unavailable/); assert.equal(gallery(result).props.data.length,1);
  }
});
test('a different property resets room/image/tab state and keeps Back delegated to navigation',()=>{
  const result=screen(); tab(result,'Rooms'); expandedNodes(result).find((node)=>node.props.accessibilityRole==='radio').props.onPress();
  find(result.render(),'View Campus View Residence image 4 of 4').props.onPress();
  result.route.params={property:data.properties[1]}; const nodes=result.render();
  assert.ok(find(nodes,'Choose a room to apply')); assert.equal(find(nodes,'About').props.accessibilityState.selected,true);
  assert.equal(find(nodes,'View Varsity Heights image 1 of 3').props.accessibilityState.selected,true);
  find(nodes,'Go back').props.onPress(); assert.equal(result.calls.at(-1).action,'goBack');
});
test('metadata uses room-derived starting price and listed count without false verification',()=>{
  const result=screen(); const nodes=result.render();
  assert.equal(details.getStartingRoomPrice(property),2200); assert.ok(nodes.some((node)=>node.type==='Badge' && node.props.label==='10 rooms listed'));
  assert.doesNotMatch(text(nodes),/12 available|Responds|Verified|verified property/);
  assert.match(text(nodes),/12 University Road/);
});
test('About uses actual amenities and supported address/distance, without an invented map',()=>{
  assert.equal(details.getPropertyAddress(property),property.address);
  assert.equal(details.getPropertyAddress({address:'12 University Road',city:'Thohoyandou'}),'12 University Road · Thohoyandou');
  const nodes=screen().render(); for(const amenity of property.amenities) assert.ok(find(nodes,amenity));
  assert.equal(nodes.filter((node)=>node.type==='RemoteImage').length,0); // Gallery is lazily rendered by FlatList.
  assert.match(text(nodes),/0.8 km from university/); assert.match(text(nodes),/No smoking on premises/);
});
test('review aggregate metadata and missing property-linked records remain distinct',()=>{
  const result=screen(); tab(result,'Reviews'); const nodes=expandedNodes(result);
  assert.ok(nodes.some((node)=>node.type==='EmptyState' && node.props.title==='No property-linked reviews'));
  assert.equal(nodes.filter((node)=>node.props.accessibilityLabel?.endsWith('-star breakdown not provided')).length,5);
  assert.equal(nodes.filter((node)=>node.type==='Text' && node.props.children==='Luvuyo M.').length,0);
  assert.match(text(nodes),/124 listed reviews/); assert.match(text(nodes),/Not independently verified/);
  for(const item of data.properties) assert.equal(details.getPropertyReviewRecords(item.id).length,0);
});
test('the three original comments remain opt-in unassociated examples with no invented recency',()=>{
  const result=screen(); tab(result,'Reviews'); find(result.render(),'View illustrative review examples').props.onPress(); const nodes=expandedNodes(result);
  assert.match(text(nodes),/Unassociated examples, not reviews of this property/);
  for(const comment of details.illustrativeReviewExamples) assert.ok(text(nodes).includes(comment.text));
  assert.doesNotMatch(text(nodes),/weeks ago|months? ago/);
  assert.equal(details.illustrativeReviewExamples.length,3);
});
test('invalid rating metadata and unrelated review records cannot produce a misleading summary',()=>{
  for(const rating of [0,-1,6,NaN,Infinity]) assert.equal(details.getRatingMetadata({rating,reviews:124}),undefined);
  for(const reviews of [0,-1,1.2,NaN]) assert.equal(details.getRatingMetadata({rating:4.8,reviews}),undefined);
  assert.equal(details.getPropertyReviewRecords('p1',[{propertyId:'p2',id:'x',name:'Example',text:'test fixture',rating:5}]).length,0);
  const result=screen({params:{property:{...property,rating:0,reviews:0}}}); tab(result,'Reviews'); assert.match(text(result.render()),/No rating supplied/);
});
test('historical unsupported studio labels stay attributes without a fabricated current room identity',()=>{
  assert.equal(rooms.getHistoricalRoomLabel('Private Room'),'Single Room'); assert.equal(rooms.getHistoricalRoomLabel('Shared Room'),'Shared Room');
  assert.match(rooms.getHistoricalRoomLabel('Studio Room'),/Room type unavailable.*Studio Room.*historical label/);
  const result=harness('src/screens/BookingsScreen.tsx',{params:{section:'Upcoming'}}); const list=result.render().find((node)=>node.type==='FlatList');
  const row=elements(list.props.renderItem({item:list.props.data[0]}).type(list.props.renderItem({item:list.props.data[0]}).props));
  row.find((node)=>node.type==='Btn').props.onPress(); assert.match(result.calls.at(-1).args[1].sampleRoom,/Room type unavailable/); assert.equal(result.calls.at(-1).args[1].sampleReference,'#CS-20522');
});
test('Single and Shared discovery include studio/apartment offerings without matching names',()=>{
  assert.ok(discovery.quickFilters.includes('Single Room')); assert.equal(discovery.quickFilters.includes('Private Room'),false);
  assert.equal(discovery.propertyMatchesQuickFilter(data.properties[4],'Single Room'),true);
  assert.equal(discovery.propertyMatchesQuickFilter(data.properties[1],'Shared Room'),true);
  assert.equal(discovery.propertyMatchesQuickFilter({...property,name:'Single Room House',rooms:[{...fixture('p1','r2')}]},'Single Room'),false);
});
test('manager creation allows only canonical types with explicitly valid occupancy',()=>{
  for(const [type,capacity] of [['Single','1'],['Shared','3']]) { const item=manager.createManagerProperty({...fields(),roomType:type,roomCapacity:capacity},2); assert.equal(item.rooms[0].type,type);assert.equal(item.rooms[0].capacity,Number(capacity)); }
  for(const overrides of [{roomType:'Private'},{roomType:'Studio'},{roomType:'Single',roomCapacity:'2'},{roomType:'Shared',roomCapacity:'1'},{roomCapacity:''}]) assert.throws(()=>manager.createManagerProperty({...fields(),...overrides},2));
});
test('manager room editing preserves original IDs, category and variant',()=>{
  const item=manager.updateManagerRoom(data.properties[1],'r2',{price:'7900',available:'1'}); const room=item.rooms.find((room)=>room.id==='r2');
  assert.equal(room.type,'Shared');assert.equal(room.variant,'Apartment');assert.equal(room.capacity,2);assert.equal(room.price,7900);
  assert.equal(manager.createManagerState().properties[0].rooms.length,2);
});
test('no new service, persistence, upload, authentication or review-submission boundary is introduced',()=>{
  for(const file of ['src/rooms.ts','src/propertyDetails.ts','src/screens/PropertyScreen.tsx']) assert.doesNotMatch(fs.readFileSync(file,'utf8'),/fetch\(|axios|AsyncStorage|supabase|firebase|Write Review|submitReview|bookingConfirmed/);
});
for(const width of [320,411,480,800]) for(const fontScale of [1,1.3,2]) test(`Property layout contract ${width}dp / ${fontScale} text`,()=>{
  const result=screen({width,fontScale,insets:{top:24,left:8,right:12,bottom:34}});
  const nodes=result.render(); assert.equal(style(nodes[0].props.style).paddingLeft,8);
  assert.equal(gallery(result).props.renderItem({item:property.images[0],index:0}).props.style.width,width-20);
  for(const node of nodes.filter((node)=>node.props.accessibilityRole==='tab')) {assert.ok(style(node.props.style).minHeight>=44);assert.equal(elements(node).find((item)=>item.type==='Text').props.numberOfLines,undefined);}
  const tabStrip=nodes.find((node)=>node.type==='ScrollView' && node.props.horizontal);
  assert.equal(style(tabStrip.props.contentContainerStyle).minWidth,width-20);
  if(width-20<400 && fontScale>=1.7) for(const node of nodes.filter((node)=>node.props.accessibilityRole==='tab')) {assert.equal(style(node.props.style).flex,0);assert.equal(style(node.props.style).flexShrink,0);}
  const footer=nodes.find((node)=>node.type==='View' && style(node.props.style).borderTopWidth===1);
  assert.equal(style(footer.props.style).position,undefined);assert.equal(style(footer.props.style).paddingBottom,34);
  assert.equal(style(nodes.find((node)=>node.type==='ScrollView').props.style).flex,1);
  tab(result,'Rooms'); for(const node of expandedNodes(result).filter((node)=>node.props.accessibilityRole==='radio')) {assert.ok(style(node.props.style).minHeight>=44);assert.equal(style(node.props.style).height,undefined);}
});

// The Studio offering is retired inventory, not another selectable Single Room.
const retiredStudio = () => data.retiredRoomOfferings.find((item) => item.propertyId === 'p1' && item.room.id === 'r3').room;
const staleProperty = () => ({ ...property, price:3500, available:12, rooms:[...property.rooms,{...retiredStudio()}] });
test('Campus View current inventory is exactly r1/r2, ten listed rooms, and R2200 starting rent',()=>{
  assert.deepEqual(Array.from(property.rooms,(room)=>[room.id,room.type,room.capacity,room.price,room.available]),[['r1','Single',1,3500,4],['r2','Shared',2,2200,6]]);
  assert.equal(property.available,10); assert.equal(property.price,2200);
  assert.equal(rooms.getListedRoomCount(property.rooms),10); assert.equal(details.getStartingRoomPrice(property),2200);
  assert.equal(retiredStudio().price,4800); assert.equal(retiredStudio().available,2);
  assert.equal(data.properties[4].rooms[0].variant,'Studio'); assert.equal(data.properties[4].rooms[0].price,3900);
});
test('a stale property snapshot cannot make retired r3 selectable in draft, resolver, validation or submission',()=>{
  const stale=staleProperty(); const draft={...application.createApplicationDraft(stale,'r1'),selectedRoomId:'r3'};
  assert.equal(application.createApplicationDraft(stale,'r3').selectedRoomId,null);
  assert.equal(discovery.resolveSelectedRoom(stale,'r3'),undefined);
  assert.equal(application.getAvailableSelectedRoom(stale,draft),undefined);
  assert.equal(application.buildApplicationReview(draft,stale),undefined);
  assert.ok(application.validateApplicationStep(0,draft,stale).selectedRoomId);
  assert.throws(()=>application.createSubmittedApplication(draft,'2026-10-14T12:00:00Z',1),/no longer listed/);
  assert.equal(discovery.propertyMatchesQuickFilter({...stale,rooms:[retiredStudio()]},'Single Room'),false);
});
test('stale Property UI excludes all retired controls and counts; stale Apply r3 never preselects another room',()=>{
  const result=screen({params:{property:staleProperty()}}); tab(result,'Rooms'); const nodes=expandedNodes(result);
  assert.equal(nodes.filter((node)=>node.props.accessibilityRole==='radio').length,2);
  assert.doesNotMatch(text(nodes),/Studio|4[\s,]?800/);
  assert.ok(nodes.some((node)=>node.type==='Badge' && node.props.label==='10 rooms listed'));
  const apply=harness('src/screens/ApplyScreen.tsx',{params:{property:staleProperty(),selectedRoomId:'r3'}});
  const options=apply.render().filter((node)=>node.props.accessibilityRole==='radio');
  assert.equal(options.length,2); assert.ok(options.every((node)=>!node.props.accessibilityState.selected));
  assert.doesNotMatch(text(apply.render()),/Studio|4[\s,]?800/);
  assert.match(text(apply.render()),/requested room is invalid or unavailable/);
  find(apply.render(),'Continue →').props.onPress(); assert.equal(apply.calls.length,0);
  assert.match(text(apply.render()),/Select an available room/);
});
test('historical r3 application remains readable at its original price without becoming a new booking',()=>{
  const saved={...application.createSubmittedApplication(application.createApplicationDraft(property,'r1'),'2026-10-14T12:00:00Z',1),selectedRoomId:'r3'};
  const summary=application.getSubmittedApplicationSummary(saved,property);
  assert.equal(summary.roomPrice,4800); assert.match(summary.roomType,/Studio layout.*No longer listed/); assert.equal(summary.isBooking,false);
  const result=harness('src/screens/AppStatusScreen.tsx',{params:{property,applicationId:saved.id},applications:[saved]});
  assert.match(text(result.render()),/Studio layout.*No longer listed/); assert.match(text(result.render()),/4[\s,]?800/);
  assert.match(text(result.render()),/not a booking/);
  assert.equal(application.getSubmittedApplicationSummary({...saved,selectedRoomId:'unknown'},property),undefined);
});
test('manager current inventory excludes retired room edits and retains historical portfolio records',()=>{
  const state=manager.createManagerState([staleProperty(),data.properties[1]]); const current=state.properties[0];
  assert.deepEqual(Array.from(current.rooms,(room)=>room.id),['r1','r2']); assert.equal(current.available,10); assert.equal(current.price,2200);
  assert.equal(manager.getPropertyAvailableRooms(current),10); assert.equal(manager.getManagerMetrics(state).availableRooms,18);
  const before=JSON.stringify(retiredStudio());
  assert.equal(manager.managerReducer(state,{type:'update-room',propertyId:'p1',room:{...retiredStudio(),available:99}}),state);
  assert.equal(manager.updateManagerRoom(current,'r3',{price:'1000',available:'99'}).rooms.length,2);
  assert.equal(JSON.stringify(retiredStudio()),before); assert.equal(state.applications.length,3); assert.equal(state.tenants.length,3);
});
test('Compare shows the updated current count/price and directs multi-offering property to room choice',()=>{
  const result=harness('src/screens/CompareScreen.tsx',{params:{ids:['p1','p2']},favoriteIds:['p1','p2']}); const nodes=result.render();
  assert.match(text(nodes),/10 rooms/); assert.doesNotMatch(text(nodes),/12 rooms|Studio|4[\s,]?800/);
  assert.match(text(nodes),/R2[\s,]?200/); assert.equal(find(nodes,'Apply'),undefined); find(nodes,'View Property').props.onPress();
  assert.equal(result.calls.at(-1).args[0],'Property'); assert.equal(result.calls.at(-1).args[1].property.id,'p1');
});
test('shared Home/Explore/Favorites property cards expose only current starting price and room total',()=>{
  for(const variant of ['featured','list','saved']) {
    const nodes=harness('src/components/PropertyCard.tsx',{exportName:'PropertyCard',props:{property,variant,favorite:false,onToggleFavorite:()=>{},onOpen:()=>{},comparisonSelected:false,onToggleComparison:()=>{}}}).render();
    assert.match(text(nodes),/2[\s,]?200/); assert.doesNotMatch(text(nodes),/Studio|4[\s,]?800|12 rooms/);
    const labels=nodes.filter((node)=>node.type==='Badge').map((node)=>node.props.label).join(' ');
    assert.match(text(nodes)+' '+labels,/10 rooms listed/);
  }
});
