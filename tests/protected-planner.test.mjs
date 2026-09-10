import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveView} from '../dist/access.mjs';

test('logged-out visitors cannot open the weekly planner',()=>{
  assert.deepEqual(resolveView('#planner',false),{view:'zones',loginRequired:true,pendingRoute:'planner'});
});

test('authenticated visitors can open the weekly planner',()=>{
  assert.deepEqual(resolveView('#planner',true),{view:'planner',loginRequired:false,pendingRoute:null});
});

test('HR Zone and workout menu remain public',()=>{
  for(const hash of ['#zones','#workouts'])assert.equal(resolveView(hash,false).loginRequired,false);
});
