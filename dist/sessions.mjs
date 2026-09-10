import {DAYS} from './training.mjs';
const step=(instruction,seconds,zones,extra={})=>({instruction,seconds,zones,...extra});
const walk=(instruction,seconds)=>step(instruction,seconds,[1],{walk:true});
const base=(id,name,zoneLabel,category,split,main,tip)=>({id,name,zoneLabel,category,split,main,tip,focus:name,subtitle:split.map(([z,p])=>`Z${z} · ${p}%`).join(' / ')});
const recipes=[
  base('recovery','Reset Walk','Z1','Recovery',[[1,100]],20,'Jalan untuk pulih. Bukan sasaran larian pemula.'),
  base('runwalk','Run–Walk Rhythm','Z2 + jalan','Beginner',[[2,100]],20,'Lari selesa dan selang berjalan. Jangan pecut untuk mengejar HR.'),
  base('easy','Easy Run','Z2','Easy',[[2,100]],30,'Mesti masih boleh berbual. Jika tidak, perlahan atau berjalan.'),
  base('lsd','Long Run','Z2','Easy',[[2,100]],60,'Lama, bukan laju. Hadkan kepada tempoh yang sudah selesa.'),
  base('mixed','Rentas Build','Z2 → Z3','Sederhana',[[2,50],[3,50]],30,'Separuh masa utama di setiap zone.'),
  base('steady','Steady Run','Z3','Sederhana',[[3,100]],30,'Usaha stabil. Bukan sesi pemulihan.'),
  base('progressive','Rentas Step Up','Z3 → Z4','Hard',[[3,50],[4,50]],20,'Naikkan usaha secara terkawal.'),
  base('tempo','Rentas Lock In','Z4','Hard',[[4,100]],15,'Kekalkan usaha hard terkawal.'),
  base('killer','Rentas 2×10','Z4','Hard',[[4,100]],20,'Dua set hard terkawal. Pendekkan jika set kedua tidak lagi terkawal.'),
  base('blend','Rentas Fast Finish','Z4 → Z5','Hard',[[4,70],[5,30]],20,'Setiap interval bergerak Z4 ke Z5, dengan pecahan masa 70/30.'),
  base('four','Norwegian 4×4','85–95% HRmaks','Hard',[[4,100]],16,'4 × 4 minit hard; 3 minit pulih antara set. Sasaran 85–95% HRmaks.'),
  base('short','Rentas Fast Six','Z5 · pendek','Hard',[[5,100]],6,'6 × 1 minit hard terkawal, 2 minit pulih. Jangan kejar Z5 pada jam.')
];
export function totalMinutes(w){return w.steps.reduce((n,s)=>n+s.seconds,0)/60;}
export function tailoredWorkout(id,total=null){
  const r=recipes.find(w=>w.id===id);if(!r)throw new Error('Sesi tidak dikenali.');
  const hard=r.category==='Hard';
  const warm=hard?600:total!==null&&total<20?180:300;
  const cool=warm;
  const recover=id==='blend'||id==='four'?540:id==='short'?600:id==='killer'?180:0;
  const duration=total===null?warm+cool+recover+r.main*60:Math.round(total*60);
  const main=duration-warm-cool-recover;
  if(main<=0)throw new Error('Masa sesi terlalu pendek untuk warm-up dan cooldown.');
  const steps=[walk('Warm-up · jalan'+(hard?' → jog selesa':''),warm)];
  if(id==='runwalk'){
    let remaining=main;while(remaining>0){const run=Math.min(60,remaining);steps.push(step('Lari selesa',run,[2]));remaining-=run;if(remaining){const rest=Math.min(60,remaining);steps.push(walk('Berjalan',rest));remaining-=rest;}}
  }else if(['blend','four','short','killer'].includes(id)){
    const n=id==='short'?6:id==='killer'?2:4;
    for(let i=0;i<n;i++){
      const chunk=Math.floor(main/n)+(i<main%n?1:0);
      if(id==='blend'){const first=Math.round(chunk*.7);steps.push(step('Z4',first,[4]),step('Z5',chunk-first,[5]));}
      else steps.push(step(id==='short'?'Hard terkawal':'Hard',chunk,id==='short'?[5]:[4],id==='four'?{protocol:[85,95]}:{}));
      if(i<n-1)steps.push(walk('Pulih · jalan / jog selesa',id==='short'?120:180));
    }
  }else{
    let used=0;r.split.forEach(([z,p],i)=>{const seconds=i===r.split.length-1?main-used:Math.round(main*p/100);used+=seconds;steps.push(step(z===1?'Berjalan':`Larian Z${z}`,seconds,[z],z===1?{walk:true}:{}));});
  }
  steps.push(walk('Cooldown · berjalan',cool));
  return {...r,steps,mainSeconds:main,effort:hard?'Hard terkawal':r.category==='Sederhana'?'Sederhana':'Boleh berbual',note:'Pecahan zone ialah masa utama yang dirancang, bukan jaminan masa HR sebenar. Warm-up, recovery dan cooldown tidak termasuk dalam pecahan.'};
}
export const WORKOUTS=recipes.map(r=>tailoredWorkout(r.id));
// Ordered by intended intensity, with endurance and protocol variants adjacent.
const order=['recovery','runwalk','easy','lsd','mixed','steady','progressive','tempo','killer','blend','four','short'];
WORKOUTS.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));

export function generatePlan({level,goal,weekly,longest,days,quality}){
  if(!['beginner','base','consistent'].includes(level)||!['habit','5k','10k'].includes(goal))throw new Error('Pilih tahap dan fokus.');
  if(!Number.isInteger(weekly)||weekly<0||weekly>600)throw new Error('Minit seminggu: 0–600.');
  if(!Number.isInteger(longest)||longest<10||longest>180)throw new Error('Sesi terpanjang: 10–180 minit.');
  if(!Array.isArray(days)||days.length<2||days.length>5||new Set(days).size!==days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Pilih 2–5 hari berbeza.');
  if(weekly>0&&longest>weekly)throw new Error('Sesi terpanjang melebihi jumlah seminggu.');
  const sorted=[...days].sort((a,b)=>a-b),beginner=level==='beginner'||weekly===0;
  const cap=beginner?Math.min(longest,20):longest;
  const budget=weekly===0?days.length*10:Math.min(weekly,days.length*cap);
  if(budget<days.length*10)throw new Error('Minit terlalu sedikit untuk hari dipilih. Kurangkan hari.');
  const longDay=sorted.at(-1),distance=(a,b)=>Math.min(Math.abs(a-b),7-Math.abs(a-b));
  const hardId=goal==='5k'?'four':goal==='10k'?'killer':'progressive';
  const hardRecipe=WORKOUTS.find(w=>w.id===hardId),hardMinutes=totalMinutes(hardRecipe);
  const candidates=sorted.filter(d=>distance(d,longDay)>=2);
  const reasons=[];
  if(beginner||level!=='consistent')reasons.push('Perlu tahap konsisten sekurang-kurangnya 8 minggu.');
  if(weekly<120)reasons.push('Asas semasa kurang daripada 120 minit seminggu.');
  if(longest<45)reasons.push('Sesi selesa belum mencapai 45 minit.');
  if(budget<hardMinutes+(days.length-1)*15)reasons.push('Bajet masa belum cukup untuk satu sesi hard dan sesi ringan.');
  if(!candidates.length)reasons.push('Perlu satu hari jarak antara hard dan larian terpanjang.');
  const hardDay=quality&&!reasons.length?candidates[0]:null;
  const lengths=new Map(sorted.map(d=>[d,d===hardDay?hardMinutes:10]));
  const weight=d=>d===longDay?(goal==='10k'?1.6:goal==='5k'?1.3:1.1):1;
  let remaining=budget-[...lengths.values()].reduce((a,b)=>a+b,0);
  while(remaining>0){const options=sorted.filter(d=>d!==hardDay&&lengths.get(d)<cap).sort((a,b)=>lengths.get(a)/weight(a)-lengths.get(b)/weight(b));if(!options.length)break;lengths.set(options[0],lengths.get(options[0])+1);remaining--;}
  const entries=DAYS.map((day,index)=>{
    if(!lengths.has(index))return {day,index,minutes:0,workout:null};
    // Variety must serve training purpose, not force intensity on beginners.
    let id=beginner?'runwalk':index===hardDay?hardId:index===longDay?'lsd':hardDay!==null&&distance(index,hardDay)===1?'recovery':level==='base'&&index===sorted[0]?'runwalk':'easy';
    const workout=tailoredWorkout(id,lengths.get(index));
    return {day,index,minutes:totalMinutes(workout),workout};
  });
  const total=entries.reduce((n,e)=>n+e.minutes,0),notes=[];
  if(beginner)notes.push('Pemula: Run–Walk, tanpa hard. Tukar fokus tidak terus menaikkan intensiti.');
  if(level==='base'&&!beginner)notes.push('Bina asas: Run–Walk, Z2 dan larian panjang selesa. Tambah intensiti selepas asas konsisten.');
  if(total<weekly)notes.push(`${weekly} minit rutin semasa; ${total} minit digunakan kerana had ${cap} minit setiap sesi${hardDay!==null?' dan tempoh tetap sesi hard':''}. Baki tidak perlu diganti.`);
  if(!quality)notes.push('Sesi hard dimatikan. Hidupkan pilihan itu jika sudah bersedia.');
  if(quality&&reasons.length)notes.push(...reasons);
  if(hardDay!==null)notes.push(`${hardRecipe.name} dipilih untuk ${goal==='habit'?'stamina':goal.toUpperCase()}. Satu sesi hard sahaja.`);
  if(goal==='10k')notes.push('Fokus 10KM memberi bahagian masa lebih besar kepada larian panjang, dalam had anda.');
  if(goal==='5k')notes.push('Fokus 5KM mengekalkan larian panjang lebih sederhana; 4×4 hanya jika layak dan dipilih.');
  return {entries,total,requested:weekly,hard:hardDay!==null,days:days.length,notes,goal,level,eligible:!reasons.length,reasons};
}
