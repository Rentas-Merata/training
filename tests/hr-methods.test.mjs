import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateHR} from '../dist/training.mjs';
import {profileFields,resolveProfile,workoutRange} from '../dist/profile.mjs';
import {WORKOUTS,totalMinutes,tailoredWorkout,generatePlan} from '../dist/sessions.mjs';
test('progressive fields only expose selected method',()=>{
  assert.deepEqual(profileFields(''),{age:false,maximum:false,resting:false});
  assert.deepEqual(profileFields('tanaka'),{age:true,maximum:false,resting:false});
  assert.deepEqual(profileFields('manual'),{age:false,maximum:false,resting:false});
  assert.deepEqual(profileFields('hrr'),{age:false,maximum:true,resting:true});
  assert.equal(resolveProfile({type:'hrr',maximum:'190',resting:''}),null);
  assert.equal(resolveProfile({type:'',age:'30'}),null);
  assert.equal(resolveProfile({type:'manual',maximum:'190'}),null);
  assert.equal(resolveProfile({type:'fox',age:'30'}),null);
  assert.throws(()=>resolveProfile({type:'hrr',maximum:'100',resting:'100'}));
});
test('formulas and shared zone targets reflect input',()=>{
  const p=resolveProfile({type:'tanaka',age:'30'});
  assert.equal(p.max,187);assert.equal(p.zones[1].min,113);assert.equal(p.zones[1].max,130);
  const h=resolveProfile({type:'hrr',maximum:'187',resting:'60'});
  assert.deepEqual([h.zones[1].min,h.zones[1].max],[137,148]);
  assert.equal(workoutRange([2],h).detail,'137–148 bpm');
  assert.equal(workoutRange([3,4],h).title,'Z3–Z4');
  assert.equal(workoutRange([4,5],p).title,'Z4–Z5');
  assert.deepEqual(workoutRange([4],h,[85,95]).min,Math.ceil(187*.85));
  assert.equal(workoutRange([4],h,[85,95]).max,Math.floor(187*.95));
  assert.notEqual(workoutRange([2],h).detail,workoutRange([2],resolveProfile({type:'hrr',maximum:'187',resting:'70'})).detail);
  assert.equal(workoutRange([4],null).title,'HR belum dikira');
  for(const basis of ['maxhr','hrr'])for(const age of [18,30,85]){const r=calculateHR(age,'tanaka',190,basis,60);for(let i=1;i<5;i++)assert.equal(r.zones[i].min,r.zones[i-1].max+1);}
});
test('all requested recipes preserve explicit main-set time ratios',()=>{
  for(const [id,split] of [['easy',[[2,1]]],['mixed',[[2,.5],[3,.5]]],['steady',[[3,1]]],['progressive',[[3,.5],[4,.5]]],['tempo',[[4,1]]],['blend',[[4,.7],[5,.3]]],['short',[[5,1]]]]){
    const w=tailoredWorkout(id);const main=w.steps.filter(s=>!s.walk);const sum=main.reduce((n,s)=>n+s.seconds,0);
    for(const [z,p] of split)assert.equal(main.filter(s=>s.zones[0]===z).reduce((n,s)=>n+s.seconds,0),sum*p,id);
    assert.ok(w.steps.every(s=>s.seconds>0));
  }
  assert.equal(totalMinutes(tailoredWorkout('four')),45);
  assert.equal(totalMinutes(tailoredWorkout('killer')),43);
  assert.equal(totalMinutes(tailoredWorkout('blend')),49);
  assert.equal(totalMinutes(tailoredWorkout('short')),36);
  assert.equal(WORKOUTS[0].id,'recovery');assert.equal(WORKOUTS.at(-1).id,'short');
  assert.equal(totalMinutes(tailoredWorkout('mixed',31)),31);
});
test('planner level, goal, weekly minutes, days and caps reflect correctly',()=>{
  const input={level:'consistent',goal:'5k',weekly:150,longest:60,days:[1,3,6],quality:true};
  const five=generatePlan(input),ten=generatePlan({...input,goal:'10k'});
  assert.equal(five.entries.find(e=>e.workout?.category==='Hard').workout.id,'four');
  assert.equal(ten.entries.find(e=>e.workout?.category==='Hard').workout.id,'killer');
  assert.notDeepEqual(five.entries.map(e=>e.minutes),ten.entries.map(e=>e.minutes));
  const begin=generatePlan({...input,level:'beginner'});assert.equal(begin.hard,false);assert.ok(begin.entries.every(e=>e.minutes<=20));
  const base=generatePlan({...input,level:'base'});assert.equal(base.hard,false);assert.equal(base.entries.find(e=>e.workout).workout.id,'runwalk');
  assert.equal(generatePlan({...input,weekly:180,quality:false}).total,180);
  assert.equal(generatePlan({...input,weekly:180}).total,165); // fixed 45-minute hard + two 60-minute caps
  assert.equal(generatePlan({...input,weekly:120}).total,120);
  assert.equal(generatePlan({...input,quality:false}).hard,false);
  assert.equal(generatePlan({...input,days:[0,1]}).hard,false);
  assert.throws(()=>generatePlan({...input,weekly:NaN}));
  for(const level of ['beginner','base','consistent'])for(const goal of ['habit','5k','10k'])for(const weekly of [60,120,150,180]){
    const p=generatePlan({...input,level,goal,weekly});
    assert.ok(p.total<=weekly);assert.equal(p.total,p.entries.reduce((n,e)=>n+e.minutes,0));
    assert.ok(p.entries.every(e=>e.minutes<=60));assert.ok(p.entries.filter(e=>e.workout?.category==='Hard').length<=1);
  }
});
test('HTML IDs match app selectors; independent hidden inputs; no old controllers',()=>{
  const html=readFileSync(new URL('../dist/tools.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),m[1]);
  for(const id of ['age-field','manual-field','resting-field'])assert.ok(html.includes(`id="${id}" hidden disabled`));
  assert.ok(!html.includes('id="zone-basis"'));assert.ok(!html.includes('id="hr-method"'));
});
