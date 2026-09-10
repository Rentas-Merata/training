import {calculateHR} from './training.mjs';

// One profile is shared by the calculator, menu and weekly plan.
export function profileFields(type){
  return {age:type==='tanaka',maximum:type==='hrr',resting:type==='hrr'};
}
export function resolveProfile({type,age,maximum,resting}){
  if(!['tanaka','hrr'].includes(type))return null;
  const fields=profileFields(type);
  if((fields.age&&age==='')||(fields.maximum&&maximum==='')||(fields.resting&&resting===''))return null;
  return calculateHR(fields.age?Number(age):null,fields.age?type:'manual',Number(maximum),type==='hrr'?'hrr':'maxhr',fields.resting?Number(resting):null);
}

// Zone recipes follow the selected scheme; research protocols retain their
// original %HRmax bounds and translate the zone label into that scheme.
export function workoutRange(zones,profile,protocol=null){
  if(!profile)return {title:'HR belum dikira',detail:'Lengkapkan HR Zone'};
  const min=protocol?Math.ceil(profile.max*protocol[0]/100):profile.zones[Math.min(...zones)-1].min;
  const max=protocol?Math.floor(profile.max*protocol[1]/100):profile.zones[Math.max(...zones)-1].max;
  const matching=profile.zones.filter(z=>z.min<=max&&z.max>=min).map(z=>z.id);
  const below=min<profile.zones[0].min;
  const label=matching.length?`Z${matching[0]}${matching.length>1?'–Z'+matching.at(-1):''}`:'Bawah Z1';
  return {title:(below&&matching.length?'Bawah Z1 / ':'')+label,detail:`${min}–${max} bpm`,min,max};
}
