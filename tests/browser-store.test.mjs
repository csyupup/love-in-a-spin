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

test('a one-time catalog upgrade adds missing cosmetics and preserves edits, selection and draw history',async()=>{
  const store=createStore({storage:memory(),key:'test'});
  let state=await store.initialize(seed);
  state=await store.mutate(state.revision,{type:'select',ids:['milk']});
  state=(await store.spin(state.revision,'before-upgrade')).state;
  state=await store.mutate(state.revision,{type:'add',item:{title:'粉底',note:'我自己选的色号',emoji:'🧴',category:'food',selected:true}});
  state=await store.mutate(state.revision,{type:'delete',id:'gift'});
  const history=structuredClone(state.history),powder=structuredClone(state.items.at(-1));
  const names=['一套化妆品','粉底','修容','提亮','眼影','眼线笔','睫毛刷'];
  const additions=names.map((title,i)=>({id:`cosmetic-${i}`,title,note:'',emoji:'💄',category:'food',selected:false}));
  const updated=await store.upgradeCatalog(1,additions);
  assert.equal(updated.items.length,8);
  assert.deepEqual(updated.history,history);
  assert.deepEqual(updated.items.find(item=>item.title==='粉底'),powder);
  assert.equal(updated.items.find(item=>item.id==='milk').selected,true);
  assert.ok(updated.items.filter(item=>item.id.startsWith('cosmetic-')).every(item=>!item.selected&&item.category==='food'));
  assert.equal(updated.items.some(item=>item.id==='gift'),false);
  assert.deepEqual(await store.upgradeCatalog(1,additions),updated);
  const removed=await store.mutate(updated.revision,{type:'delete',id:'cosmetic-2'});
  assert.deepEqual(await store.upgradeCatalog(1,additions),removed);
});
test('the larger browser collection persists 64 wishes and includes every selected sector in the draw',async()=>{
  const store=createStore({storage:memory(),key:'test'});
  const items=Array.from({length:64},(_,i)=>({...seed[0],id:`wish-${i}`,title:`心愿${i}`}));
  let state=await store.initialize(items);
  state=await store.mutate(state.revision,{type:'select',ids:items.map(item=>item.id)});
  const drawn=await store.spin(state.revision,'all-64-wishes');
  assert.equal(drawn.result.count,64);assert.equal(drawn.result.items.length,64);
  assert.equal(store.get().items.length,64);
  await assert.rejects(store.mutate(drawn.state.revision,{type:'add',item:seed[0]}),/64/);
  for(let count=1;count<=64;count++)for(let index=0;index<count;index++) {
    assert.equal(uniformIndex(count,{getRandomValues:array=>{array[0]=index;}}),index);
  }
  assert.throws(()=>uniformIndex(65));
});

test('a failed catalog save keeps the old list and version intact so a retry can finish safely',async()=>{
  const storage=memory(),store=createStore({storage,key:'test'});
  const state=await store.initialize(seed),save=storage.setItem;
  const {WISH_CATALOG_VERSION,WISH_ADDITIONS}=await import('../public/wish-updates.js');
  storage.setItem=()=>{throw new Error('QuotaExceededError');};
  await assert.rejects(store.upgradeCatalog(WISH_CATALOG_VERSION,WISH_ADDITIONS),/无法保存/);
  assert.deepEqual(store.get(),state);
  storage.setItem=save;
  const migrated=await store.upgradeCatalog(WISH_CATALOG_VERSION,WISH_ADDITIONS);
  assert.equal(migrated.items.length,seed.length+7);
  assert.equal(migrated.catalogVersion,WISH_CATALOG_VERSION);
});

test('new wishes display first and editing them preserves their recent position after reload',async()=>{
  const store=createStore({storage:memory(),key:'order'});
  let state=await store.initialize(seed);
  state=await store.mutate(state.revision,{type:'add',item:{...seed[0],title:'较早新增',selected:false}});
  const earlier=state.items.at(-1);
  state=await store.mutate(state.revision,{type:'add',item:{...seed[0],title:'最新新增',selected:false}});
  const latest=state.items.at(-1);
  assert.ok(latest.recentOrder>earlier.recentOrder);
  state=await store.mutate(state.revision,{type:'edit',id:latest.id,item:{...latest,note:'只改备注'}});
  assert.equal(state.items.find(item=>item.id===latest.id).recentOrder,latest.recentOrder);
  assert.deepEqual(store.get(),state);
});
test('every participant moves ahead after a draw while selection alone and repeated requests keep the order',async()=>{
  const store=createStore({storage:memory(),key:'order'});
  let state=await store.initialize(seed);
  state=await store.mutate(state.revision,{type:'add',item:{...seed[0],title:'尚未参与的新心愿',selected:false}});
  const newest=state.items.at(-1);
  state=await store.mutate(state.revision,{type:'select',ids:['milk','gift']});
  assert.equal(state.items.find(item=>item.id==='milk').recentOrder,undefined);
  const drawn=await store.spin(state.revision,'participant-order');
  const played=drawn.state.items.filter(item=>item.selected);
  assert.ok(played.every(item=>item.recentOrder>newest.recentOrder));
  assert.equal(played[0].recentOrder,played[1].recentOrder);
  assert.deepEqual(drawn.result.items.map(item=>item.id),['milk','gift']);
  assert.deepEqual((await store.spin(state.revision,'participant-order')).state,drawn.state);
});

test('display sorting supports old data without mutating the wheel array, and repeated shared draws keep relative order',async()=>{
  const {sortWishes}=await import('../public/browser-store.js');
  assert.equal(typeof sortWishes,'function');
  const old=[{id:'oldest'},{id:'newer'},{id:'newest'}];
  assert.deepEqual(sortWishes(old).map(item=>item.id),['newest','newer','oldest']);
  assert.deepEqual(old.map(item=>item.id),['oldest','newer','newest']);
  const store=createStore({storage:memory(),key:'order'});
  let state=await store.initialize(seed);
  state=await store.mutate(state.revision,{type:'select',ids:['milk']});
  state=(await store.spin(state.revision,'first-sort-draw')).state;
  assert.equal(sortWishes(state.items)[0].id,'milk');
  state=await store.mutate(state.revision,{type:'select',ids:['milk','gift']});
  state=(await store.spin(state.revision,'second-sort-draw')).state;
  assert.deepEqual(sortWishes(state.items).map(item=>item.id),['milk','gift']);
  assert.deepEqual(sortWishes(store.get().items),sortWishes(state.items));
});

test('cosmetic refinements fill missing notes and promote the requested batch with the kit first only once',async()=>{
  const {WISH_ADDITIONS}=await import('../public/wish-updates.js');
  const {sortWishes}=await import('../public/browser-store.js');
  const store=createStore({storage:memory(),key:'refinement'});
  let state=await store.initialize([...seed,...WISH_ADDITIONS.map(item=>({...item,note:''}))]);
  state=await store.mutate(state.revision,{type:'edit',id:'wish-foundation',item:{...state.items.find(item=>item.id==='wish-foundation'),note:'保留我自己写的色号'}});
  state=await store.mutate(state.revision,{type:'delete',id:'wish-contour'});
  state=await store.mutate(state.revision,{type:'select',ids:['milk']});
  state=(await store.spin(state.revision,'before-refinement')).state;
  const history=structuredClone(state.history);
  const updates=WISH_ADDITIONS.map(item=>({...item,note:`${item.title}的具体描述`}));
  state=await store.refineCatalog(1,updates,WISH_ADDITIONS.map(item=>item.id));
  assert.deepEqual(sortWishes(state.items).slice(0,6).map(item=>item.title),['一套化妆品','粉底','提亮','眼影','眼线笔','睫毛刷']);
  assert.equal(state.items.find(item=>item.id==='wish-foundation').note,'保留我自己写的色号');
  assert.match(state.items.find(item=>item.id==='wish-cosmetics-kit').note,/具体描述/);
  assert.equal(state.items.some(item=>item.id==='wish-contour'),false);
  assert.deepEqual(state.history,history);assert.equal(state.items.find(item=>item.id==='milk').selected,true);
  state=(await store.spin(state.revision,'after-refinement')).state;
  assert.equal(sortWishes(state.items)[0].id,'milk');
  assert.deepEqual(await store.refineCatalog(1,updates,WISH_ADDITIONS.map(item=>item.id)),state);
});

test('the KFC egg-tart icon from the published list upgrades to the official brand icon',async()=>{
  const {WISH_REFINEMENTS,WISH_REFINEMENT_VERSION}=await import('../public/wish-updates.js');
  const update=WISH_REFINEMENTS.find(item=>item.title==='KFC');
  const store=createStore({storage:memory(),key:'old-kfc'});
  await store.initialize([{id:update.id,title:'KFC',note:'蛋挞。',emoji:'🥧',category:'food',selected:false}]);
  const state=await store.refineCatalog(WISH_REFINEMENT_VERSION,WISH_REFINEMENTS,[]);
  assert.equal(state.items[0].emoji,'kfc');
});
