import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.mjs';
import { createHash } from 'node:crypto';

test('new rooms combine food and gifts into one of three categories', () => {
  const store=new Store(':memory:');
  try {
    const {token,state}=store.createRoom();
    assert.equal(state.items.length,20);
    for(const category of ['food','dates','care']) {
      assert.equal(state.items.filter(item=>item.category===category).length,category==='food'?10:5);
      assert.ok(state.items.filter(item=>item.category===category).every(item=>item.note&&item.emoji));
    }
    const item=state.items.find(item=>item.category==='dates');
    const next=store.mutate(token,state.revision,{type:'edit',id:item.id,item:{...item,title:'一起去你的家乡'}});
    assert.equal(next.items.find(option=>option.id===item.id).title,'一起去你的家乡');
  } finally {store.close();}
});

test('existing rooms gain examples once while keeping custom content, selections and immutable history', () => {
  const store=new Store(':memory:');
  try {
    const {token}=store.createRoom();
    const custom={id:'custom-wish',title:'晴天一起去看海',note:'我自己写的备注',category:'likes',emoji:'🌊',selected:true};
    const milk={id:'milk',title:'一杯快乐奶茶',note:'我的专属口味',category:'likes',emoji:'🧋',selected:false};
    const date={id:'date',title:'约会你来定',note:'听你的',category:'rewards',emoji:'🎬',selected:true};
    const care={id:'care',title:'专属按摩券',note:'随时有效',category:'rewards',emoji:'💆',selected:false};
    const history=[{id:'old-result',item:{...custom},at:'2026-10-20T00:00:00.000Z',redeemed:true}];
    const old={revision:12,items:[custom,milk,date,care],history};
    store.db.prepare('UPDATE rooms SET state=? WHERE token_hash=?').run(JSON.stringify(old),createHash('sha256').update(token).digest('hex'));
    let migrated=store.get(token);
    assert.equal(migrated.items.find(item=>item.id==='custom-wish').category,'dates');
    assert.equal(migrated.items.find(item=>item.id==='custom-wish').note,custom.note);
    assert.equal(migrated.items.find(item=>item.id==='milk').note,milk.note);
    assert.equal(migrated.items.find(item=>item.id==='milk').selected,false);
    assert.equal(migrated.items.find(item=>item.id==='date').category,'dates');
    assert.equal(migrated.items.find(item=>item.id==='care').category,'care');
    assert.equal(migrated.items.filter(item=>item.title==='一杯快乐奶茶').length,1);
    assert.deepEqual(migrated.history,history);
    assert.ok(migrated.items.every(item=>['food','dates','care'].includes(item.category)));
    const added=migrated.items.find(item=>item.title==='一起看日落');
    assert.ok(added);assert.equal(added.selected,false);
    migrated=store.mutate(token,migrated.revision,{type:'delete',id:added.id});
    assert.equal(store.get(token).items.some(item=>item.id===added.id),false);
    assert.deepEqual(store.get(token),migrated);
  } finally {store.close();}
});

test('rooms are isolated; edits persist across reopening and stale revisions fail', () => {
  const dir = mkdtempSync(join(tmpdir(), 'love-spin-'));
  let store = new Store(join(dir, 'data.db'));
  try {
    const a = store.createRoom(); const b = store.createRoom();
    const original = store.get(a.token);
    const changed = store.mutate(a.token, original.revision, {type:'add',item:{title:'定制小礼物',note:'一起挑',category:'food',emoji:'🎁',selected:true}});
    assert.equal(changed.items.length, original.items.length + 1);
    assert.equal(store.get(b.token).items.length, original.items.length);
    assert.throws(() => store.get('bad-token'), e => e.status === 404);
    assert.throws(() => store.mutate(a.token, original.revision, {type:'select',ids:[]}), e => e.status === 409);
    store.close(); store = new Store(join(dir, 'data.db'));
    let state = store.get(a.token);
    const added = state.items.at(-1);
    state = store.mutate(a.token,state.revision,{type:'edit',id:added.id,item:{...added,title:'新的名字'}});
    assert.equal(state.items.at(-1).title,'新的名字');
    state = store.mutate(a.token,state.revision,{type:'delete',id:added.id});
    assert.equal(state.items.length,original.items.length);
  } finally { store.close(); rmSync(dir,{recursive:true}); }
});

test('merging version-two gift categories preserves all items, selections and history without reseeding', () => {
  const store=new Store(':memory:');
  try {
    const {token}=store.createRoom();
    const items=[
      {id:'food-custom',title:'一杯奶茶',note:'自己修改过的备注',emoji:'🧋',category:'food',selected:true},
      {id:'gift-custom',title:'口红',note:'喜欢的色号',emoji:'💄',category:'gifts',selected:true},
      {id:'cash-custom',title:'现金红包',note:'微信骰子点数 × 10 元',emoji:'🧧',category:'gifts',selected:false},
      {id:'date-custom',title:'看电影',note:'一起去',emoji:'🎬',category:'dates',selected:false},
    ];
    const history=[{id:'draw-old',item:{...items[1]},redeemed:true}];
    const original={catalogVersion:2,revision:7,items,history};
    store.db.prepare('UPDATE rooms SET state=? WHERE token_hash=?').run(JSON.stringify(original),createHash('sha256').update(token).digest('hex'));
    const next=store.get(token);
    assert.equal(next.catalogVersion,3);
    assert.equal(next.revision,8);
    assert.deepEqual(next.items,items.map(item=>({...item,category:item.category==='gifts'?'food':item.category})));
    assert.deepEqual(next.history,history);
    assert.deepEqual(store.get(token),next);
    assert.equal(next.items.length,4);
  } finally {store.close();}
});
test('draws use only selected options, are idempotent, and retain immutable prize snapshots', () => {
  const store = new Store(':memory:');
  try {
    const {token} = store.createRoom(); let state = store.get(token);
    const item = state.items[0];
    state = store.mutate(token,state.revision,{type:'select',ids:[item.id]});
    const draw = store.spin(token,state.revision,'draw-request-12345');
    assert.equal(draw.result.item.title,item.title);
    assert.equal(draw.result.count,1);
    assert.equal(draw.result.index,0);
    assert.equal(store.spin(token,state.revision,'draw-request-12345').result.id,draw.result.id);
    state = store.get(token);
    state = store.mutate(token,state.revision,{type:'delete',id:item.id});
    assert.equal(state.history[0].item.title,item.title);
    state = store.mutate(token,state.revision,{type:'redeem',id:draw.result.id});
    assert.equal(state.history[0].redeemed,true);
    state = store.mutate(token,state.revision,{type:'select',ids:[]});
    assert.throws(() => store.spin(token,state.revision,'draw-request-empty'), e => e.status === 400);
  } finally { store.close(); }
});

test('reset clears every selection and draw record while retaining the complete wish list',()=>{
  const store=new Store(':memory:');
  try {
    const {token,state}=store.createRoom();
    const drawn=store.spin(token,state.revision,'before-publish-reset');
    assert.ok(drawn.state.history.length);
    const reset=store.mutate(token,drawn.state.revision,{type:'reset'});
    assert.deepEqual(reset.items,drawn.state.items.map(item=>({...item,selected:false})));
    assert.deepEqual(reset.history,[]);
    assert.deepEqual(store.get(token),reset);
  } finally {store.close();}
});
