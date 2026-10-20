import test from 'node:test';
import assert from 'node:assert/strict';
import { validateItem, chooseIndex, DomainError } from '../src/domain.mjs';
import { spinTarget } from '../public/wheel.js';

test('every equally sized index is reachable and receives the full range', () => {
  for (let n = 1; n <= 32; n++) {
    for (let i = 0; i < n; i++) assert.equal(chooseIndex(n, max => { assert.equal(max, n); return i; }), i);
  }
  assert.throws(() => chooseIndex(0), DomainError);
});
test('the winning sector center lands under the top pointer after multiple turns', () => {
  for (let n = 1; n <= 32; n++) for (let i = 0; i < n; i++) {
    const current = 1371;
    const target = spinTarget(current, i, n);
    assert.ok(target - current >= 1800);
    const final = ((target + i * 360 / n) % 360 + 360) % 360;
    assert.ok(final < 1e-7 || final > 360 - 1e-7);
  }
});
test('validate titles, notes, category, booleans and emoji; preserve safe plain text', () => {
  assert.deepEqual(validateItem({title:'  一杯奶茶  ',note:' 少冰 ',emoji:'🧋',category:'food',selected:true}), {title:'一杯奶茶',note:'少冰',emoji:'🧋',category:'food',selected:true});
  for (const data of [{title:''},{title:'a'.repeat(25)},{title:'a',category:'oops'},{title:'a',selected:'yes'},{title:'a',note:'a'.repeat(81)}]) {
    assert.throws(() => validateItem({emoji:'🎁',category:'food',selected:false,...data}), DomainError);
  }
});
