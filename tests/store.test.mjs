import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.mjs';

test('rooms are isolated; edits persist across reopening and stale revisions fail', () => {
  const dir = mkdtempSync(join(tmpdir(), 'love-spin-'));
  let store = new Store(join(dir, 'data.db'));
  try {
    const a = store.createRoom(); const b = store.createRoom();
    const original = store.get(a.token);
    const changed = store.mutate(a.token, original.revision, {type:'add',item:{title:'定制小礼物',note:'一起挑',category:'gifts',emoji:'🎁',selected:true}});
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
