import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollLock } from '../public/scroll-lock.js';

function page() {
  const body={style:{position:'relative',top:'2px',left:'',right:'',width:'',overflow:'visible',paddingRight:'6px',overscrollBehavior:''}};
  const root={clientWidth:1188,style:{overflow:'auto',overscrollBehavior:'',scrollBehavior:'smooth'}};
  const scrolls=[];
  const window={scrollX:4,scrollY:640,innerWidth:1200,getComputedStyle:()=>({paddingRight:'6px'}),scrollTo:(x,y)=>scrolls.push([x,y])};
  return {document:{body,documentElement:root},window,scrolls};
}
test('opening a modal fixes the background and compensates its scrollbar; closing restores styles and position',()=>{
  const p=page();const before=structuredClone({body:p.document.body.style,root:p.document.documentElement.style});
  const lock=createScrollLock(p.window,p.document);
  lock.lock();
  assert.equal(p.document.body.style.position,'fixed');
  assert.equal(p.document.body.style.top,'-640px');
  assert.equal(p.document.body.style.left,'-4px');
  assert.equal(p.document.body.style.paddingRight,'18px');
  assert.equal(p.document.documentElement.style.overflow,'hidden');
  lock.unlock();
  assert.deepEqual(p.document.body.style,before.body);
  assert.deepEqual(p.document.documentElement.style,before.root);
  assert.deepEqual(p.scrolls,[[4,640]]);
});
test('repeated modal opens do not lose the original page position, and repeated closes are harmless',()=>{
  const p=page();const lock=createScrollLock(p.window,p.document);
  lock.lock();p.window.scrollY=0;lock.lock();lock.unlock();lock.unlock();
  assert.deepEqual(p.scrolls,[[4,640]]);
  assert.equal(p.document.body.style.position,'relative');
});
