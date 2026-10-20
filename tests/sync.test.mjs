import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldApplyRemoteState } from '../public/sync.js';

test('slow polling never rolls back a newer saved state or redraws an active spin', () => {
  assert.equal(shouldApplyRemoteState(2,1),false);
  assert.equal(shouldApplyRemoteState(2,2),false);
  assert.equal(shouldApplyRemoteState(2,3,{locked:true}),false);
  assert.equal(shouldApplyRemoteState(2,3,{locked:false}),true);
  assert.equal(shouldApplyRemoteState(-1,0),true);
  assert.equal(shouldApplyRemoteState(2,3,{locked:true,force:true}),true);
  assert.equal(shouldApplyRemoteState(2,1,{locked:true,force:true}),false);
});
