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

test('the icon picker offers seven rich categories while preserving every original choice',async()=>{
  const icons=await import('../public/prize-icons.js');
  assert.deepEqual(icons.iconGroups?.map(group=>group.label),['笑脸','动物','食物','活动','旅行','物体','符号']);
  const all=icons.iconGroups.flatMap(group=>group.icons);
  assert.ok(all.length>=180);assert.equal(new Set(all).size,all.length);
  const {validateItem}=await import('../public/validation.js');
  for(const emoji of all)assert.equal(validateItem({title:'图标',category:'food',selected:false,emoji}).emoji,emoji);
  for(const emoji of ['mcd','🧋','💆🏻‍♀️','🫂','💌','🧹','🛌','🎡','🌷','💄'])assert.ok(all.includes(emoji));
  assert.equal(icons.iconCategory('mcd'),'food');
  assert.equal(icons.iconCategory('🎁'),'objects');
  assert.ok(icons.categoryIcons('objects','🦄‍✨').includes('🦄‍✨'));
});

test('the published starting list includes the seven requested cosmetics, unchecked in food',async()=>{
  const {readFile}=await import('node:fs/promises');
  const initial=JSON.parse(await readFile(new URL('../public/initial-wishes.json',import.meta.url),'utf8'));
  assert.equal(initial.items.length,35);
  for(const title of ['一套化妆品','粉底','修容','提亮','眼影','眼线笔','睫毛刷']) {
    const matching=initial.items.filter(item=>item.title===title);
    assert.equal(matching.length,1);assert.equal(matching[0].category,'food');assert.equal(matching[0].selected,false);
  }
});

test('popular food brands have local icons in the food category',async()=>{
  const icons=await import('../public/prize-icons.js');
  const {readFile}=await import('node:fs/promises');
  const expected={kfc:'肯德基',dominos:'达美乐',pizzahut:'必胜客',luckin:'瑞幸咖啡',sbux:'星巴克',guming:'古茗',mixue:'蜜雪冰城'};
  for(const [value,label] of Object.entries(expected)) {
    assert.equal(icons.prizeIconLabel(value),label);
    assert.equal(icons.iconCategory(value),'food');
    const path=icons.prizeIconAsset(value);
    assert.ok(path?.startsWith('./icons/'));
    assert.ok((await readFile(new URL(`../public/${path.slice(2)}`,import.meta.url))).byteLength>128);
  }
});
test('all seven cosmetic defaults have specific descriptions matching the upgrade data',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {WISH_ADDITIONS}=await import('../public/wish-updates.js');
  const initial=JSON.parse(await readFile(new URL('../public/initial-wishes.json',import.meta.url),'utf8'));
  for(const update of WISH_ADDITIONS) {
    assert.ok(update.note.length>8);
    assert.notEqual(update.note,'吃喝玩乐');
    assert.equal(initial.items.find(item=>item.id===update.id).note,update.note);
  }
});

test('official brand assets match the original downloaded bytes and retain their source URLs',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {createHash}=await import('node:crypto');
  const sources=JSON.parse(await readFile(new URL('../public/icons/sources.json',import.meta.url),'utf8'));
  assert.equal(sources.length,7);
  for(const entry of sources) {
    assert.ok(entry.page.startsWith('https://'));assert.ok(entry.url.startsWith('https://'));
    const data=await readFile(new URL('../public/icons/'+entry.file,import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
    assert.equal(prizeIconAsset(entry.key),'./icons/'+entry.file);
  }
});
