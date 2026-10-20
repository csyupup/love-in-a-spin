import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createApplication } from '../src/server.mjs';

test('HTTP API supports two clients sharing a room, safe mutations and persistent draws', async () => {
  const {server,store} = createApplication({dbPath:':memory:'});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path,token,body,method=body?'POST':'GET') {
    const response = await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  }
  try {
    assert.equal((await fetch(base)).status,200);
    const brandIcon=await fetch(base+'/icons/mcdonalds.svg');
    assert.equal(brandIcon.status,200);
    assert.match(brandIcon.headers.get('content-type'),/image\/svg\+xml/);
    assert.match(await brandIcon.text(),/<svg/);
    assert.equal((await call('/api/state')).status,401);
    const created=await call('/api/rooms',null,{}); assert.equal(created.status,201);
    const {token} = created.body; let state=created.body.state;
    const changed=await call('/api/actions',token,{revision:state.revision,action:{type:'add',item:{title:'共同的小心愿',category:'food',emoji:'🎁',selected:true}}});
    assert.equal(changed.status,200); state=changed.body;
    const secondClient=await call('/api/state',token);
    assert.equal(secondClient.body.items.at(-1).title,'共同的小心愿');
    assert.equal((await call('/api/actions',token,{revision:0,action:{type:'select',ids:[]}})).status,409);
    const draw=await call('/api/spins',token,{revision:state.revision,requestId:'http-draw-request'});
    assert.equal(draw.status,200);
    assert.ok(draw.body.result.items.some(item=>item.id===draw.body.result.item.id));
    const duplicate=await call('/api/spins',token,{revision:state.revision,requestId:'http-draw-request'});
    assert.equal(duplicate.body.result.id,draw.body.result.id);
    const evil=await fetch(base+'/api/rooms',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'});
    assert.equal(evil.status,403);
    const malformed=await fetch(base+'/api/rooms',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'});
    assert.equal(malformed.status,400);
    const oversized=await fetch(base+'/api/rooms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({x:'a'.repeat(20000)})});
    assert.equal(oversized.status,413);
    assert.equal((await call('/api/state','nonexistent')).status,404);
    assert.equal((await fetch(base+'/src/store.mjs')).status,404);
  } finally { await new Promise(resolve=>server.close(resolve)); store.close(); }
});

test('UTF-8 Chinese text remains intact when a character crosses HTTP chunk boundaries', async () => {
  const {server,store}=createApplication({dbPath:':memory:'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {token,state}=store.createRoom();
  const body=Buffer.from(JSON.stringify({revision:state.revision,action:{type:'add',item:{title:'奶茶',emoji:'🧋',category:'food',selected:true}}}));
  const split=body.indexOf(Buffer.from('奶'))+1;
  try {
    const result=await new Promise((resolve,reject)=>{
      const req=request({hostname:'127.0.0.1',port:server.address().port,path:'/api/actions',method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`}},res=>{
        const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())}));
      });
      req.on('error',reject);req.write(body.subarray(0,split));setTimeout(()=>req.end(body.subarray(split)),20);
    });
    assert.equal(result.status,200);
    assert.equal(result.body.items.at(-1).title,'奶茶');
    assert.equal(result.body.items.at(-1).emoji,'🧋');
  } finally { await new Promise(resolve=>server.close(resolve));store.close(); }
});
