import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserStore, uniformIndex } from '../public/browser-store.js';

const seed=[{id:'milk',title:'一杯奶茶',note:'少冰',emoji:'🧋',category:'food',selected:true},{id:'gift',title:'小礼物',note:'一起挑',emoji:'🎁',category:'food',selected:true}];
function testLocks() {
  let queue=Promise.resolve();
  return {request(_key,action) {const next=queue.then(action);queue=next.catch(()=>{});return next;}};
}
function createStore(options) {return new BrowserStore({locks:testLocks(),...options});}
function memory() {const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
test('a static first visit keeps the configured wishes, but starts with no selection or history',async()=>{
  const storage=memory();const store=createStore({storage,key:'test'});
  const state=await store.initialize(seed);
  assert.deepEqual(state.items,seed.map(item=>({...item,selected:false})));
  assert.deepEqual(state.history,[]);
  assert.deepEqual(createStore({storage,key:'test'}).get(),state);
});
test('static CRUD and independent draws persist across reloads without a server',async()=>{
  const storage=memory();const store=createStore({storage,key:'test'});
  let state=await store.initialize(seed);
  state=await store.mutate(state.revision,{type:'add',item:{title:'麦当劳',note:'鸡翅薯条汉堡',emoji:'mcd',category:'food',selected:true}});
  const added=state.items.at(-1);
  state=await store.mutate(state.revision,{type:'select',ids:[added.id]});
  const drawn=await store.spin(state.revision,'static-draw-1');
  assert.equal(drawn.result.item.title,'麦当劳');assert.equal(drawn.result.count,1);
  assert.equal((await store.spin(state.revision,'static-draw-1')).result.id,drawn.result.id);
  state=await store.mutate(drawn.state.revision,{type:'edit',id:added.id,item:{...added,title:'快乐套餐'}});
  assert.equal(state.history[0].item.title,'麦当劳');
  state=await store.mutate(state.revision,{type:'redeem',id:drawn.result.id});
  assert.equal(state.history[0].redeemed,true);
  state=await store.mutate(state.revision,{type:'delete',id:added.id});
  assert.equal(state.items.length,2);assert.equal(state.history[0].item.title,'麦当劳');
  assert.deepEqual(createStore({storage,key:'test'}).get(),state);
  await assert.rejects(store.mutate(0,{type:'select',ids:[]}),error=>error.status===409);
  await assert.rejects(store.spin(state.revision,'empty-draw'),/请先选择/);
});
test('browser random selection discards the biased tail before mapping a sample to an equal sector',()=>{
  const samples=[0xffffffff,4];let calls=0;
  const crypto={getRandomValues:array=>{array[0]=samples[calls++];return array;}};
  assert.equal(uniformIndex(3,crypto),1);assert.equal(calls,2);
  assert.throws(()=>uniformIndex(0),/请先选择/);
});
test('a failed local storage write never changes the saved state',async()=>{
  const storage=memory();const store=createStore({storage,key:'test'});
  const state=await store.initialize(seed);
  storage.setItem=()=>{throw new Error('QuotaExceededError');};
  await assert.rejects(store.mutate(state.revision,{type:'select',ids:['milk']}),/无法保存/);
  assert.deepEqual(store.get(),state);
});
test('existing browser data is kept when the published default wish list changes',async()=>{
  const store=createStore({storage:memory(),key:'test'});
  let state=await store.initialize(seed);
  state=await store.mutate(state.revision,{type:'delete',id:'gift'});
  assert.deepEqual(await store.initialize(seed),state);
  state=await store.mutate(state.revision,{type:'reset'});
  assert.ok(state.items.every(item=>!item.selected));assert.deepEqual(state.history,[]);
});

test('unsupported browsers never silently overwrite data without a cross-tab lock',async()=>{
  const storage=memory();
  const store=createStore({storage,key:'test',locks:null});
  await assert.rejects(store.initialize(seed),/浏览器版本/);
  assert.equal(store.get(),null);
});
test('two tabs editing the same revision preserve the first edit and reject the stale write',async()=>{
  const storage=memory(),locks=testLocks();
  const first=createStore({storage,key:'test',locks}),second=createStore({storage,key:'test',locks});
  const state=await first.initialize(seed);
  const results=await Promise.allSettled([
    first.mutate(state.revision,{type:'select',ids:['milk']}),
    second.mutate(state.revision,{type:'delete',id:'milk'})
  ]);
  assert.equal(results[0].status,'fulfilled');
  assert.equal(results[1].status,'rejected');
  assert.equal(results[1].reason.status,409);
  assert.equal(first.get().items.find(item=>item.id==='milk').selected,true);
});
