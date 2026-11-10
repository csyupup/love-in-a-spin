import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot, readSnapshotFile } from '../public/snapshot.js';
import { BrowserStore } from '../public/browser-store.js';

const wish={id:'a',title:'奶茶',note:'',category:'food',emoji:'guming',selected:true};
test('a maximum collection with 100 full draw snapshots can re-import its pretty printed backup',async()=>{
  const items=Array.from({length:64},(_,i)=>({...wish,id:`wish-${i}`,title:'😀'.repeat(24),note:'😀'.repeat(80),emoji:'😀'.repeat(8)}));
  const history=Array.from({length:100},(_,i)=>({id:`draw-${i}`,requestId:`request-${i}`,item:items[0],items,index:0,count:64,at:'2026-11-10T00:00:00.000Z',redeemed:false}));
  const snapshot={items,history};
  const file=new Blob([JSON.stringify({version:1,state:snapshot},null,2)]);
  assert.ok(file.size>4*1024*1024);
  const loaded=await readSnapshotFile(file);
  assert.deepEqual(loaded,snapshot);
  assert.ok(Buffer.byteLength(JSON.stringify({revision:0,snapshot:loaded}))<8*1024*1024);
  await assert.rejects(()=>readSnapshotFile({size:17*1024*1024,text:()=>{throw new Error('must not read');}}));
  await assert.rejects(()=>readSnapshotFile(new Blob(['not json'])));
});
test('backup validation preserves empty notes and history and rejects corruption without writing',async()=>{
  let raw=null;
  const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;}};
  const store=new BrowserStore({storage,key:'qa',locks:{request:async(key,fn)=>fn()},crypto:globalThis.crypto});
  let state=await store.initialize([wish]);
  state=await store.mutate(state.revision,{type:'select',ids:[wish.id]});
  const draw=await store.spin(state.revision,'snapshot-qa-draw');
  const backup={version:1,state:draw.state};
  assert.deepEqual(validateSnapshot(backup).history,draw.state.history);
  const imported=await store.mutate(draw.state.revision,{type:'import',snapshot:backup});
  assert.equal(imported.items[0].note,'');
  assert.equal(imported.history[0].id,draw.result.id);
  for(const bad of [null,{items:[wish,wish],history:[]},{items:Array.from({length:65},(_,i)=>({...wish,id:String(i)})),history:[]},{items:[wish],history:[{id:'bad',item:wish,at:'bad',redeemed:false}]}]){
    await assert.rejects(()=>store.mutate(imported.revision,{type:'import',snapshot:bad}));
    assert.deepEqual(store.get(),imported);
  }
});
