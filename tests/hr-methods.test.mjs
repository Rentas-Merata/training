import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateHR,sessionGuidance,WORKOUTS,totalMinutes,generatePlan} from '../dist/training.mjs';

test('original max-HR calculations remain available',()=>{
  assert.equal(calculateHR(30).max,187);
  assert.equal(calculateHR(30,'fox').max,190);
  assert.equal(calculateHR(30,'manual',188).max,188);
  assert.deepEqual(calculateHR(30,'manual',188).zones[1],{
    id:2,name:'Easy',feel:'Boleh berbual',low:60,high:70,color:'#237acf',min:113,max:131
  });
});
test('Karvonen adds resting HR to the percentage of reserve',()=>{
  const result=calculateHR(30,'manual',188,'hrr',60);
  assert.equal(result.reserve,128);
  assert.equal(result.zones[1].min,137);
  assert.equal(result.zones[1].max,149);
  assert.equal(result.resting,60);
  const ageBased=calculateHR(30,'tanaka',190,'hrr',60);
  assert.equal(ageBased.zones[1].min,137);
  assert.equal(ageBased.zones[1].max,148);
});
test('HRR requires a real, valid resting value; no guessed fallback',()=>{
  for(const rest of [null,undefined,0,29,101,60.5,NaN,Infinity]){
    assert.throws(()=>calculateHR(30,'tanaka',190,'hrr',rest));
  }
  assert.throws(()=>calculateHR(30,'manual',100,'hrr',100));
  assert.throws(()=>calculateHR(30,'tanaka',190,'unknown',60));
  assert.doesNotThrow(()=>calculateHR(30,'tanaka',190,'maxhr',NaN));
  assert.equal(calculateHR(30,'tanaka',190,'maxhr',60).resting,null);
});
test('zone boundaries have no gaps or overlap in either method',()=>{
  for(const age of [18,30,38,85])for(const basis of ['maxhr','hrr'])for(const rest of [30,60,100]){
    const result=calculateHR(age,'tanaka',190,basis,rest);
    for(let i=1;i<5;i++)assert.equal(result.zones[i].min,result.zones[i-1].max+1);
    assert.equal(result.zones[4].max,result.max);
  }
  for(const age of [0,17,86,30.5,NaN])assert.throws(()=>calculateHR(age));
});
test('session zones match the agreed effort ladder',()=>{
  const profile=calculateHR(30,'manual',188,'hrr',60);
  const warm=sessionGuidance([1,2],profile);
  const easy=sessionGuidance([3],profile);
  const long=sessionGuidance([2,3],profile);
  assert.match(warm.title,/Zone 1–2/);
  assert.match(warm.detail,/94–131 bpm/);
  assert.match(easy.title,/Zone 3/);
  assert.match(easy.detail,/132–150 bpm/);
  assert.match(easy.effort,/boleh berbual/);
  assert.match(long.title,/Zone 2–3/);
});
test('changing calculator basis never raises existing hard-session bpm',()=>{
  const original=calculateHR(30,'manual',188);
  const reserve=calculateHR(30,'manual',188,'hrr',60);
  assert.deepEqual(sessionGuidance([4],reserve),sessionGuidance([4],original));
  assert.match(sessionGuidance([4],reserve).detail,/151–169 bpm/);
  assert.match(sessionGuidance([4],reserve).title,/%HRmaks/);
  assert.doesNotMatch(sessionGuidance([4]).detail,/151/);
  assert.match(sessionGuidance([5],reserve).detail,/170–188 bpm/);
  assert.match(sessionGuidance([5],reserve).title,/Zone 5/);
});
test('workout minutes and planner safety limits are preserved',()=>{
  assert.deepEqual(WORKOUTS.map(totalMinutes),[40,30,70,43,45,30]);
  for(const level of ['beginner','base','consistent'])for(const goal of ['habit','5k','10k']){
    const plan=generatePlan({level,goal,weekly:150,longest:60,days:[1,3,6],quality:true});
    assert.ok(plan.total<=150);
    assert.equal(plan.total,plan.entries.reduce((sum,e)=>sum+e.minutes,0));
    assert.ok(plan.entries.every(e=>e.minutes<=60));
    if(level!=='consistent')assert.equal(plan.hard,false);
    for(const entry of plan.entries)if(entry.workout){
      assert.equal(entry.minutes,totalMinutes(entry.workout));
      assert.match(entry.workout.zoneLabel,/Z|Lari/);
    }
  }
});

test('beginner and easy recipes run in Z3 after walking warm-up',()=>{
  const easy=WORKOUTS.find(w=>w.id==='easy');
  const runwalk=WORKOUTS.find(w=>w.id==='runwalk');
  assert.deepEqual(easy.steps.map(s=>s.zones),[[1,2],[3],[1,2]]);
  assert.deepEqual(runwalk.steps[0].zones,[1,2]);
  assert.deepEqual(runwalk.steps[1].zones,[3]);
  assert.deepEqual(runwalk.steps[2].zones,[1,2]);
});

test('5K uses 4x4 Z4 to Z5 while 10K uses threshold Z4',()=>{
  const four=WORKOUTS.find(w=>w.id==='four');
  assert.equal(totalMinutes(four),45);
  assert.deepEqual(four.steps.filter(s=>s.instruction.startsWith('Set')).map(s=>s.zones),[[4],[5],[4],[5],[4],[5],[4],[5]]);
  const input={level:'consistent',weekly:150,longest:60,days:[1,3,6],quality:true};
  const five=generatePlan({...input,goal:'5k'});
  const ten=generatePlan({...input,goal:'10k'});
  assert.equal(five.entries.find(e=>e.workout?.category==='Hard').workout.id,'four');
  assert.equal(ten.entries.find(e=>e.workout?.category==='Hard').workout.id,'killer');
});
