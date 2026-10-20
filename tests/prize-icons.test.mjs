import test from 'node:test';
import assert from 'node:assert/strict';
import { prizeIconAsset, prizeIconLabel, prizeIconHtml } from '../public/prize-icons.js';
import { Store } from '../src/store.mjs';

test('McDonalds has a local branded asset and readable label; normal emoji remain text',()=>{
  assert.equal(prizeIconAsset('mcd'),'./icons/mcdonalds.svg');
  assert.equal(prizeIconLabel('mcd'),'麦当劳');
  assert.match(prizeIconHtml('mcd'),/src=".\/icons\/mcdonalds.svg"/);
  assert.equal(prizeIconAsset('🍟'),null);
  assert.equal(prizeIconHtml('🍟'),'🍟');
  assert.equal(prizeIconHtml('<img onerror=alert(1)>'),'&lt;img onerror=alert(1)&gt;');
});
test('a branded prize icon is saved in wishes and copied into draw snapshots',()=>{
  const store=new Store(':memory:');
  try {
    const {token,state}=store.createRoom();
    let next=store.mutate(token,state.revision,{type:'add',item:{title:'麦当劳快乐套餐',note:'一起吃薯条',emoji:'mcd',category:'food',selected:true}});
    const item=next.items.at(-1);
    assert.equal(store.get(token).items.at(-1).emoji,'mcd');
    next=store.mutate(token,next.revision,{type:'select',ids:[item.id]});
    const draw=store.spin(token,next.revision,'mcd-icon-test');
    assert.equal(draw.result.item.emoji,'mcd');
  } finally {store.close();}
});
