const assert = require('node:assert/strict');
const test = require('node:test');
const {load, elements, harness, data} = require('./profile-harness.cjs');
const {focusedFormOffset, clampFormOffset} = load('src/formScroll.ts');

// Real component/hooks, with native layout and keyboard events controlled here.
// Native runtime remains a separate check; these are not device screenshots.
function form(platform = 'ios') {
  let index = 0, slots = [], effects = [], nodes, input = null, visible = false, sequence = 0;
  const frames = new Map(), listeners = new Map(), commands = [], handle = {current:null};
  const props = {header:'Progress', footer:'Continue', children:'Fields', resetKey:1};
  let viewport = {y:150, height:600}, content = 1400, nativeOffset = 0;
  const same = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const memo = (fn,deps) => { const i=index++; if(!slots[i] || !same(slots[i].deps,deps)) slots[i]={deps,value:fn()}; return slots[i].value; };
  const react = {
    forwardRef:fn=>fn,
    useRef(value){const i=index++;return slots[i]??(slots[i]={current:value});},
    useState(value){const i=index++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    useCallback:(fn,deps)=>memo(()=>fn,deps),
    useImperativeHandle(ref,fn,deps){ref.current=memo(fn,deps);},
    useEffect(fn,deps){const i=index++;if(!slots[i] || !same(slots[i].deps,deps)){effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
  };
  const native = {
    getNativeScrollRef:()=>({measureInWindow:cb=>cb(0,viewport.y,320,viewport.height)}),
    scrollTo(command){commands.push(command);nativeOffset=command.y;},
  };
  const jsx=(type,props)=>({type,props});
  const Component=load('src/components/KeyboardForm.tsx',{
    react, 'react/jsx-runtime':{jsx,jsxs:jsx}, '../formScroll':{focusedFormOffset,clampFormOffset},
    'react-native':{Platform:{OS:platform},StyleSheet:{create:v=>v},KeyboardAvoidingView:'KeyboardAvoidingView',ScrollView:'ScrollView',
      TextInput:{State:{currentlyFocusedInput:()=>input}},Keyboard:{isVisible:()=>visible,dismiss(){visible=false;},addListener(name,callback){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback);return {remove(){listeners.get(name).delete(callback);}};}}},
  },{requestAnimationFrame:cb=>{const id=++sequence;frames.set(id,cb);return id;},cancelAnimationFrame:id=>frames.delete(id)}).KeyboardForm;
  function render(){index=0;nodes=elements(Component(props,handle));scroll().props.ref.current=native;const pending=effects;effects=[];pending.forEach(fn=>fn());return nodes;}
  const scroll=()=>nodes.find(n=>n.type==='ScrollView');
  function layout(height,y=150){viewport={height,y};scroll().props.onLayout({nativeEvent:{layout:{height}}});}
  function flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());render();}
  function emit(name){if(name==='keyboardDidShow')visible=true;if(name==='keyboardDidHide')visible=false;for(const fn of listeners.get(name)??[])fn();render();}
  function focus(y,height=52,delayed=false){const callbacks=[];input={blur(){input=null;},measureInWindow(cb){const run=()=>cb(0,viewport.y+y-nativeOffset,200,height);if(delayed)callbacks.push(run);else run();}};scroll().props.onFocus();return ()=>callbacks.splice(0).forEach(fn=>fn());}
  render();scroll().props.onContentSizeChange(320,content);layout(600);flush();
  return {render,props,commands,handle,scroll,layout,flush,emit,focus,frames,listeners,
    get input(){return input;},setContent(height){content=height;scroll().props.onContentSizeChange(320,height);},
    offset(y){nativeOffset=y;scroll().props.onScroll({nativeEvent:{contentOffset:{y}}});},
    unmount(){slots.forEach(slot=>slot?.cleanup?.());},
  };
}

test('visibility geometry leaves an already visible input still and reveals either obscured edge minimally',()=>{
  assert.equal(focusedFormOffset(100,1200,{y:100,height:300},{y:150,height:52}),100);
  assert.equal(focusedFormOffset(100,1200,{y:100,height:300},{y:370,height:52}),134);
  assert.equal(focusedFormOffset(100,1200,{y:100,height:300},{y:90,height:52}),78);
});
test('offsets clamp to actual content, including empty, short and tiny viewports',()=>{
  assert.equal(clampFormOffset(-100,1000,300),0);assert.equal(clampFormOffset(5000,1000,300),700);
  assert.equal(clampFormOffset(200,100,300),0);assert.equal(clampFormOffset(NaN,0,0),0);
  assert.equal(focusedFormOffset(0,500,{y:50,height:20},{y:70,height:80}),15);
  assert.equal(focusedFormOffset(500,600,{y:0,height:0}),500);
});
test('oversized multiline input aligns its beginning without alternating scroll commands',()=>{
  assert.equal(focusedFormOffset(0,1200,{y:150,height:120},{y:300,height:200}),138);
  assert.equal(focusedFormOffset(138,1200,{y:150,height:120},{y:162,height:200}),138);
});
for(const platform of ['ios','android'])test(`${platform} uses a single layout owner, no automatic keyboard insets or keyboard padding`,()=>{
  const s=form(platform),root=s.render().find(n=>n.type==='KeyboardAvoidingView'),scroll=s.scroll();
  assert.equal(root.props.enabled,true);assert.equal(root.props.behavior,platform==='ios'?'padding':'height');
  assert.equal(root.props.keyboardVerticalOffset,0);assert.equal(scroll.props.automaticallyAdjustKeyboardInsets,false);
  assert.equal(scroll.props.contentInsetAdjustmentBehavior,'never');assert.equal(scroll.props.keyboardDismissMode,platform==='ios'?'interactive':'on-drag');
  assert.equal(scroll.props.contentInset,undefined);assert.equal(scroll.props.contentContainerStyle,undefined);
});
test('iOS waits for keyboard animation and hides/restores the unchanged footer',()=>{
  const s=form();s.emit('keyboardWillChangeFrame');s.emit('keyboardWillShow');
  assert.equal(s.render()[0].props.children[2],null);s.layout(250);s.focus(700);s.flush();assert.equal(s.commands.length,0);
  s.emit('keyboardDidShow');s.flush();assert.equal(s.commands.length,1);assert.equal(s.commands[0].y,514);
  s.emit('keyboardDidHide');s.layout(600);s.flush();assert.equal(s.render()[0].props.children[2],'Continue');
  assert.ok(s.commands.every(c=>c.y>=0 && c.y<=1150));
});
test('rapid focus/layout/show events coalesce; typing in the same input adds no scroll commands',()=>{
  const s=form('android');s.layout(250);s.focus(500);s.focus(700);s.emit('keyboardDidShow');s.flush();
  assert.equal(s.commands.length,1);s.render();s.render();s.flush();assert.equal(s.commands.length,1);
  s.focus(700);s.flush();assert.equal(s.commands.length,1);
});
test('stale asynchronous measurements cannot move a newly focused field',()=>{
  const s=form();s.layout(250);const finish=s.focus(700,52,true);s.flush();
  s.focus(20);finish();s.flush();assert.equal(s.commands.length,0);
});
test('a drag takes priority over pending focus measurements, including keyboard dismissal during scrolling',()=>{
  const s=form();s.layout(250);const finish=s.focus(700,52,true);s.flush();
  s.scroll().props.onScrollBeginDrag();finish();s.emit('keyboardDidHide');s.layout(600);s.flush();assert.equal(s.commands.length,0);
  s.scroll().props.onScrollEndDrag();s.focus(700);s.flush();assert.equal(s.commands.length,1);
});
test('dismissal clamps a previously deep offset when the viewport expands and short content replaces it',()=>{
  const s=form();s.offset(1000);s.emit('keyboardDidHide');s.layout(600);s.flush();assert.equal(s.commands.at(-1).y,800);
  s.setContent(100);s.flush();assert.equal(s.commands.at(-1).y,0);
});
test('step changes blur/dismiss old focus and reset once; returning accepts fresh focus',()=>{
  const s=form();s.focus(700);s.emit('keyboardWillShow');s.props.resetKey=2;s.render();s.emit('keyboardDidHide');s.flush();
  assert.equal(s.input,null);assert.deepEqual(s.commands.map(c=>c.y),[0]);
  s.props.resetKey=1;s.render();s.flush();s.layout(250);s.focus(600);s.emit('keyboardDidShow');s.flush();assert.equal(s.commands.at(-1).y,414);
});
test('explicit validation reset cancels pending focus scroll and clamps the requested destination',()=>{
  const s=form();s.focus(700);s.handle.current.scrollTo({y:0,animated:true});s.flush();
  assert.equal(s.commands.length,1);assert.equal(s.commands[0].y,0);assert.equal(s.input,null);
});
test('unmount removes listeners and pending frames instead of scrolling an abandoned form',()=>{
  const s=form();s.focus(700);s.unmount();s.flush();assert.equal(s.commands.length,0);
  assert.ok([...s.listeners.values()].every(set=>set.size===0));assert.equal(s.frames.size,0);
});
test('existing application callbacks retain keyboard types, university and Personal values across steps',async()=>{
  const s=harness('src/screens/ApplyScreen.tsx',{params:{property:data.properties[0],selectedRoomId:'r2'}});
  const press=async label=>{const n=s.render().find(n=>(n.props.label??n.props.children)===label);assert.ok(n,label);await n.props.onPress();};
  const field=(name,value)=>s.render().find(n=>n.type==='Input'&&n.props.label===name).props.onChangeText(value);
  await press('Continue →');
  assert.equal(s.render().find(n=>n.type==='KeyboardForm').props.contentContainerStyle.padding,load('src/theme.ts').Spacing.xl);
  for(const [name,type] of [['Full name',undefined],['Student number','number-pad'],['Phone number','phone-pad'],['Email address','email-address']])assert.equal(s.render().find(n=>n.type==='Input'&&n.props.label===name).props.keyboardType,type);
  for(const [name,value] of [['Full name','Synthetic Student'],['Student number','1234'],['Phone number','0712345678'],['Email address','synthetic@example.com']])field(name,value);
  s.render().find(n=>n.type==='SelectField').props.onChange('wits');await press('Continue →');
  await press('Back to Personal');assert.equal(s.render().find(n=>n.type==='SelectField').props.value,'wits');assert.equal(s.render().find(n=>n.type==='Input'&&n.props.label==='Email address').props.value,'synthetic@example.com');
});
test('manager multiline review notes use shared keyboard layout without changing local save semantics',()=>{
  const s=harness('src/screens/ManagerScreen.tsx');
  const nodes=()=>s.render().flatMap(n=>typeof n.type==='function'?elements(n.type(n.props)):[n]);
  const press=label=>{const n=nodes().find(n=>(n.props.accessibilityLabel??n.props.children)===label);assert.ok(n,label);n.props.onPress();};
  press('Applications');const entry=nodes().find(n=>n.type==='TouchableOpacity' && n.props.accessibilityLabel?.includes('Campus View Residence'));assert.ok(entry);entry.props.onPress();
  const input=nodes().find(n=>n.type==='Input'&&n.props.label==='Review note');assert.equal(input.props.multiline,true);input.props.onChangeText('Synthetic keyboard note');
  press('Save Review Note');assert.ok(s.alerts.some(a=>a[0]==='Review note saved'));assert.ok(s.render().some(n=>n.type==='KeyboardForm'));
});
test('Emergency values, relationship, keyboard types and form reset keys survive Review and Back',async()=>{
  const s=harness('src/screens/ApplyScreen.tsx',{params:{property:data.properties[0],selectedRoomId:'r2'}});
  const press=async label=>{const n=s.render().find(n=>(n.props.accessibilityLabel??n.props.label??n.props.children)===label);assert.ok(n,label);await n.props.onPress();};
  const field=(name,value)=>s.render().find(n=>n.type==='Input'&&n.props.label===name).props.onChangeText(value);
  await press('Continue →');for(const [name,value] of [['Full name','Synthetic Student'],['Student number','1234'],['Phone number','0712345678'],['Email address','synthetic@example.com']])field(name,value);
  await press('Continue →');
  for(const label of ['Student ID','Proof of Registration','ID / Passport']){s.pickerQueue.push({canceled:false,assets:[{name:'synthetic.pdf',mimeType:'application/pdf',size:200}]});await press(`Choose file for ${label}`);}
  await press('Continue →');assert.equal(s.render().find(n=>n.type==='KeyboardForm').props.resetKey,3);
  field('Full name','Synthetic Contact');field('Phone number','0711111111');s.render().find(n=>n.type==='SelectField').props.onChange('Guardian');
  assert.equal(s.render().find(n=>n.type==='Input'&&n.props.label==='Phone number').props.keyboardType,'phone-pad');
  await press('Review Application');assert.equal(s.render().find(n=>n.type==='KeyboardForm').props.resetKey,4);
  await press('Back to Emergency');assert.equal(s.render().find(n=>n.type==='Input'&&n.props.label==='Full name').props.value,'Synthetic Contact');assert.equal(s.render().find(n=>n.type==='SelectField').props.value,'Guardian');
});
