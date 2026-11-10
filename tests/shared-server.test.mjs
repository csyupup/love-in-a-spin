import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../src/server.mjs';
import { Store } from '../src/store.mjs';
import { sortWishes } from '../public/browser-store.js';
import { SharedStore } from '../public/shared-store.js';

test('two Pages clients share writes through CORS and reject untrusted origins and stale edits',async()=>{
  const origin='https://csyupup.github.io';
  const {server,store}=createApplication({dbPath:':memory:',allowedOrigins:[origin],allowRoomCreation:false});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}/`;
  const {token}=store.createRoom();
  const browserFetch=function(url,options){assert.equal(this,globalThis,'native browser fetch requires its global receiver');return fetch(url,{...options,headers:{...options.headers,Origin:origin}});};
  const a=new SharedStore({base,token,fetch:browserFetch}),b=new SharedStore({base,token,fetch:browserFetch});
  try{
    const preflight=await fetch(base+'api/actions',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
    assert.equal((await fetch(base+'api/state',{headers:{Origin:'https://evil.example',Authorization:`Bearer ${token}`}})).status,403);
    const initial=await a.get();
    const changed=await a.mutate(initial.revision,{type:'select',ids:[initial.items[0].id]});
    assert.deepEqual(await b.get(),changed);
    await assert.rejects(()=>b.mutate(initial.revision,{type:'select',ids:[]}),e=>e.status===409);
    const draw=await a.spin(changed.revision,'two-clients-draw');
    assert.equal((await b.get()).history[0].id,draw.result.id);
    const payload=structuredClone(draw.state);payload.items[0].note='';
    const imported=await b.mutate(draw.state.revision,{type:'import',snapshot:payload});
    assert.equal(imported.history[0].id,draw.result.id);
    assert.equal(imported.items[0].note,'');
  }finally{await new Promise(r=>server.close(r));store.close();}
});

test('shared default catalog and all 64 participants retain recent ordering and snapshots',()=>{
  const store=new Store(':memory:');
  try {
    const {token,state:initial}=store.createRoom();
    assert.equal(initial.items.length,35);
    assert.ok(initial.items.every(i=>!i.selected));
    assert.equal(sortWishes(initial.items)[0].title,'一套化妆品');
    let state=initial;
    while(state.items.length<64)state=store.mutate(token,state.revision,{type:'add',item:{title:`心愿 ${state.items.length}`,note:'',emoji:'sbux',category:'food',selected:true}});
    const latest=state.items.at(-1);
    assert.equal(sortWishes(state.items)[0].id,latest.id);
    const participants=[state.items[0],state.items[1],latest];
    state=store.mutate(token,state.revision,{type:'select',ids:participants.map(i=>i.id)});
    const draw=store.spin(token,state.revision,'shared-order-test');
    assert.deepEqual(new Set(sortWishes(draw.state.items).slice(0,3).map(i=>i.id)),new Set(participants.map(i=>i.id)));
    const selected=store.mutate(token,draw.state.revision,{type:'select',ids:draw.state.items.map(i=>i.id)});
    const all=store.spin(token,selected.revision,'shared-all-64');
    assert.equal(all.result.count,64);
    const edited=store.mutate(token,all.state.revision,{type:'edit',id:latest.id,item:{...latest,title:'改名'}});
    assert.equal(edited.items.find(i=>i.id===latest.id).recentOrder,all.state.items.find(i=>i.id===latest.id).recentOrder);
    assert.notEqual(all.result.items.find(i=>i.id===latest.id).title,'改名');
  }finally{store.close();}
});

test('production serves full public assets, selects shared storage and forbids public room creation',async()=>{
  const {server,store}=createApplication({dbPath:':memory:',allowRoomCreation:false});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(base+'/api/rooms',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,403);
    assert.match(await(await fetch(base+'/runtime-config.js')).text(),/shared/);
    for(const path of ['/browser-store.js','/validation.js','/shared-store.js','/snapshot.js','/wish-updates.js','/icons/kfc.png','/icons/guming.png','/icons/starbucks.svg','/initial-wishes.json'])assert.equal((await fetch(base+path)).status,200,path);
    for(const path of ['/.env','/src/store.mjs','/data/love.db','/../package.json'])assert.equal((await fetch(base+path)).status,404,path);
    assert.equal((await fetch(base+'/api/state')).status,401);
  }finally{await new Promise(r=>server.close(r));store.close();}
});

test('snapshot replacement validates before writing and rejects stale imports',()=>{
  const store=new Store(':memory:');
  try{
    const {token,state}=store.createRoom();
    const snapshot={items:[{...state.items[0],note:'',selected:true}],history:[]};
    const imported=store.mutate(token,state.revision,{type:'import',snapshot});
    assert.equal(imported.items.length,1);
    assert.equal(imported.items[0].note,'');
    assert.throws(()=>store.mutate(token,state.revision,{type:'import',snapshot}),e=>e.status===409);
    const bad={items:[snapshot.items[0],snapshot.items[0]],history:[]};
    assert.throws(()=>store.mutate(token,imported.revision,{type:'import',snapshot:bad}));
    assert.deepEqual(store.get(token),imported);
  }finally{store.close();}
});
