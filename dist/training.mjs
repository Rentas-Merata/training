export const DAYS = ['Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu','Ahad'];
export const ZONES = [
  {id:1,name:'Recovery',feel:'Sangat ringan',low:50,high:60,color:'#8796a7'},
  {id:2,name:'Easy',feel:'Boleh berbual',low:60,high:70,color:'#237acf'},
  {id:3,name:'Aerobic',feel:'Usaha sederhana',low:70,high:80,color:'#299c79'},
  {id:4,name:'Threshold',feel:'Hard, terkawal',low:80,high:90,color:'#cd8c1f'},
  {id:5,name:'Maximum',feel:'Sangat tinggi',low:90,high:100,color:'#dd555b'}
];
export function calculateHR(age, method='tanaka', manual=190, basis='maxhr', resting=null){
  if(!Number.isInteger(age)||age<18||age>85)throw new Error('Masukkan umur bulat antara 18 hingga 85 tahun.');
  if(!['tanaka','fox','manual'].includes(method))throw new Error('Pilih kaedah HR maksimum.');
  if(method==='manual'&&(!Number.isInteger(manual)||manual<100||manual>240))throw new Error('Masukkan HR maksimum bulat antara 100 hingga 240 bpm.');
  if(!['maxhr','hrr'].includes(basis))throw new Error('Pilih kaedah zone yang sah.');
  const max=method==='manual'?manual:Math.round(method==='fox'?220-age:208-0.7*age);
  if(basis==='hrr'&&(!Number.isInteger(resting)||resting<30||resting>100||resting>=max))throw new Error('HRR perlukan resting HR antara 30–100 bpm dan lebih rendah daripada HR maksimum. Gunakan bacaan rehat sebenar.');
  const base=basis==='hrr'?resting:0, reserve=max-base;
  const zones=ZONES.map(z=>({...z,min:Math.ceil(base+reserve*z.low/100),max:z.id===5?max:Math.ceil(base+reserve*z.high/100)-1}));
  return {age,method,max,basis,resting:basis==='hrr'?resting:null,reserve,zones};
}
// Keep workout effort independent of calculator labels. Choosing HRR must not
// increase the hard-workout target by reusing the same numbered zone.
export function sessionGuidance(zones, maxReference=null){
  const reference=maxReference?calculateHR(maxReference.age,maxReference.method,maxReference.max):null;
  const first=Math.min(...zones),last=Math.max(...zones);
  const bpm=reference?`${reference.zones[first-1].min}–${reference.zones[last-1].max} bpm`:'Kira HR maksimum untuk lihat bpm';
  if(first===5)return {title:'Zone 5 · %HRmaks',detail:`${bpm} · bahagian akhir`,effort:'RPE 8–9 / 10 · sangat hard'};
  if(first===4)return {title:'Zone 4 · %HRmaks',detail:`${bpm} · rujukan`,effort:'RPE 7–8 / 10 · hard terkawal'};
  if(first===3)return {title:'Zone 3 · %HRmaks',detail:`${bpm} · lari easy`,effort:'RPE 3–4 / 10 · masih boleh berbual'};
  if(last===3)return {title:'Zone 2–3 · %HRmaks',detail:`${bpm} · larian panjang`,effort:'RPE 3–4 / 10 · kekal selesa'};
  return {title:first===1&&last===1?'Zone 1 · %HRmaks':'Zone 1–2 · %HRmaks',detail:`${bpm} · jalan / jog ringan`,effort:'RPE 2–3 / 10 · pulih dan terkawal'};
}
const step=(instruction,minutes,zones)=>({instruction,minutes,zones});
export const WORKOUTS=[
  {id:'easy',name:'Easy Run',subtitle:'Bina asas. Tidak perlu kejar pace.',category:'Ringan',focus:'Aerobic base',effort:'3–4 / 10',zoneLabel:'Z3',steps:[step('Warm-up · berjalan',5,[1,2]),step('Lari easy · masih boleh berbual',30,[3]),step('Cooldown · berjalan',5,[1,2])],tip:'Zone 2 mungkin masih berjalan laju. Bila mula berlari, masuk Zone 3 secara terkawal dan pastikan masih boleh bercakap dalam ayat penuh. Jika nafas semakin berat, selang-selikan berjalan.',note:'40 minit ialah contoh sesi penuh. Dalam cuaca panas, kurangkan pace atau masa jika usaha meningkat.'},
  {id:'recovery',name:'Recovery Run',subtitle:'Gerak ringan. Beri ruang untuk pulih.',category:'Ringan',focus:'Pemulihan aktif',effort:'2–3 / 10',zoneLabel:'Z1–2',steps:[step('Warm-up · berjalan',5,[1]),step('Jalan laju / jog sangat ringan',20,[1,2]),step('Cooldown · berjalan',5,[1])],tip:'Recovery boleh jadi berjalan sahaja. Jika jog terus membawa anda ke Zone 3 atau kaki masih sakit, kembali berjalan atau rehat penuh.',note:'Sesi ini untuk pulih. Tidak perlu paksa diri berlari.'},
  {id:'lsd',name:'LSD',subtitle:'Long Slow Distance. Lama, bukan laju.',category:'Endurance',focus:'Daya tahan',effort:'3–4 / 10',zoneLabel:'Z2–3',steps:[step('Warm-up · berjalan',5,[1,2]),step('Lari easy · kekalkan usaha selesa',60,[2,3]),step('Cooldown · berjalan',5,[1,2])],tip:'Mulakan perlahan di Zone 2 dan biarkan larian masuk Zone 3 secara terkawal. Anda masih boleh berbual. HR boleh meningkat apabila badan makin panas; jangan paksa turun ke Zone 2 dengan gaya larian yang tidak natural.',note:'Contoh 70 minit untuk yang sudah biasa dengan tempoh ini. Pelan akan hadkan sesi kepada tempoh terpanjang yang anda isi.'},
  {id:'killer',name:'Killer · 2 × 10',subtitle:'Threshold terkawal. Bukan all-out.',category:'Hard',focus:'Daya tahan laju',effort:'7–8 / 10',zoneLabel:'Z4',steps:[step('Warm-up · jog perlahan',10,[1,2]),step('Threshold · set 1',10,[4]),step('Recovery · jog / jalan',3,[1,2]),step('Threshold · set 2',10,[4]),step('Cooldown · jalan / jog perlahan',10,[1])],tip:'Habiskan set kedua dengan kawalan yang sama seperti set pertama. Jika tidak mampu, pendekkan sesi atau berhenti.',note:'Sasaran Z4 ialah panduan umum, bukan ukuran ambang laktat individu. Sesi ini bukan untuk pelari yang baru bermula.'},
  {id:'four',name:'4 × 4',subtitle:'Empat set untuk kelajuan 5KM.',category:'Hard',focus:'VO₂ max / 5KM',effort:'8–9 / 10',zoneLabel:'Z4→Z5',steps:[step('Warm-up · berjalan kemudian jog',10,[1,2]),step('Set 1 · naikkan usaha',2,[4]),step('Set 1 · kekalkan hard',2,[5]),step('Recovery · jog / jalan',3,[1,2]),step('Set 2 · naikkan usaha',2,[4]),step('Set 2 · kekalkan hard',2,[5]),step('Recovery · jog / jalan',3,[1,2]),step('Set 3 · naikkan usaha',2,[4]),step('Set 3 · kekalkan hard',2,[5]),step('Recovery · jog / jalan',3,[1,2]),step('Set 4 · naikkan usaha',2,[4]),step('Set 4 · kekalkan hard',2,[5]),step('Cooldown · berjalan / jog perlahan',10,[1,2])],tip:'Setiap interval tetap 4 minit: kira-kira 2 minit untuk naik ke sasaran, kemudian 2 minit di Z5. Hanya tiga recovery antara empat set. Jangan sprint pada awal set untuk mengejar HR.',note:'Sasaran asal 4×4 ialah 85–95% HR maksimum. Dengan pembahagian Rentas, mula di Z4 dan capai Z5 pada bahagian akhir. HR lambat naik, jadi rasa usaha dan kawalan masih penting.'},
  {id:'runwalk',name:'Run–Walk',subtitle:'Lari sekejap. Jalan. Ulang dengan selesa.',category:'Mula di sini',focus:'Bina keyakinan',effort:'2–4 / 10',zoneLabel:'Lari Z3',steps:[step('Warm-up · berjalan',5,[1,2]),...Array.from({length:10},(_,i)=>[step(`Lari ringan · pusingan ${i+1}`,1,[3]),step(`Berjalan · pusingan ${i+1}`,1,[1,2])]).flat(),step('Cooldown · berjalan',5,[1,2])],tip:'Bahagian lari boleh masuk Zone 3. Bahagian berjalan beri ruang HR turun ke Zone 1–2. Jika belum selesa, panjangkan masa berjalan.',note:'HR mengambil masa untuk berubah pada selang satu minit. Ikut arahan lari dan berjalan; jangan pecut untuk mengejar nombor.'}
];
export function totalMinutes(workout){return workout.steps.reduce((n,s)=>n+s.minutes,0)}
export function tailoredWorkout(id,total){
  const original=WORKOUTS.find(w=>w.id===id);
  if(!original)throw new Error('Sesi tidak dikenali.');
  if(['killer','four'].includes(id))return {...original,steps:original.steps.map(s=>({...s}))};
  if(!Number.isInteger(total)||total<10)throw new Error('Tempoh sesi mesti sekurang-kurangnya 10 minit.');
  const warm=total<20?3:5;
  const mid=total-2*warm;
  let steps;
  if(id==='runwalk'){
    steps=[step('Warm-up · jalan perlahan',warm,[1])];
    for(let i=0;i<mid;i++)steps.push(step(i%2===0?'Lari ringan (atau jalan jika belum selesa)':'Berjalan · pulih dengan selesa',1,i%2===0?[3]:[1,2]));
    steps.push(step('Cooldown · berjalan',warm,[1,2]));
  }else steps=[step('Warm-up · berjalan',warm,[1,2]),step(id==='recovery'?'Jalan laju / jog sangat ringan':'Lari easy · masih boleh berbual',mid,id==='recovery'?[1,2]:id==='lsd'?[2,3]:[3]),step('Cooldown · berjalan',warm,[1,2])];
  return {...original,name:id==='lsd'&&total<45?'Easy lebih panjang':original.name,steps,note:'Tempoh ini disesuaikan untuk pelan mingguan anda. Semua minit termasuk warm-up dan cooldown.'};
}
export function generatePlan({level,goal,weekly,longest,days,quality}){
  if(!['beginner','base','consistent'].includes(level)||!['habit','5k','10k'].includes(goal))throw new Error('Pilih tahap dan sasaran latihan.');
  if(!Number.isInteger(weekly)||weekly<0||weekly>600)throw new Error('Isi jumlah mingguan antara 0 hingga 600 minit.');
  if(!Number.isInteger(longest)||longest<10||longest>180)throw new Error('Isi sesi terpanjang antara 10 hingga 180 minit.');
  if(!Array.isArray(days)||days.length<2||days.length>5||new Set(days).size!==days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Pilih 2 hingga 5 hari latihan.');
  if(weekly>0&&longest>weekly)throw new Error('Sesi terpanjang tidak boleh melebihi jumlah minit seminggu.');
  const sorted=[...days].sort((a,b)=>a-b);
  const isBeginner=level==='beginner'||weekly===0;
  const cap=isBeginner?Math.min(longest,15):longest;
  const budget=weekly===0?sorted.length*10:Math.min(weekly,sorted.length*cap);
  if(budget<sorted.length*10)throw new Error('Minit semasa terlalu sedikit untuk jumlah hari ini. Pilih lebih sedikit hari; jangan naikkan jumlah semata-mata untuk memenuhi pelan.');
  const notes=[];
  if(isBeginner)notes.push('Mula dengan Run–Walk atau berjalan sahaja, 10–15 minit setiap sesi. Pelan ini tidak memasukkan latihan hard.');
  if(budget<weekly)notes.push('Jumlah dikurangkan supaya setiap sesi tidak melebihi tempoh selesa anda. Baki minit tidak perlu diganti.');
  let hardDay=null,hardId=goal==='5k'?'four':'killer';
  const longDay=sorted[sorted.length-1];
  const cycleDistance=(a,b)=>Math.min(Math.abs(a-b),7-Math.abs(a-b));
  const candidates=sorted.filter(d=>d!==longDay&&cycleDistance(d,longDay)>=2);
  const eligible=!isBeginner&&level==='consistent'&&weekly>=120&&longest>=45&&budget>=45+(sorted.length-1)*15&&candidates.length>0;
  if(quality&&eligible)hardDay=candidates[0];
  if(quality&&!eligible)notes.push('Sesi hard belum dimasukkan: perlu asas konsisten, ≥120 minit/minggu, sesi selesa ≥45 minit, bajet masa mencukupi dan jarak sekurang-kurangnya satu hari daripada larian terpanjang.');
  if(hardDay!==null)notes.push('Satu sesi hard sahaja. Jika belum biasa latihan intensiti, tukar kepada easy dengan membuang tanda sesi hard dan bina semula.');
  const lengths=new Map(sorted.map(d=>[d,d===hardDay?totalMinutes(WORKOUTS.find(w=>w.id===hardId)):10]));
  const longWeight=goal==='10k'?1.35:goal==='5k'?1.2:1.05;
  let remaining=budget-[...lengths.values()].reduce((a,b)=>a+b,0);
  while(remaining>0){
    const available=sorted.filter(d=>d!==hardDay&&lengths.get(d)<cap);
    if(!available.length)break;
    available.sort((a,b)=>lengths.get(a)/(a===longDay?longWeight:1)-lengths.get(b)/(b===longDay?longWeight:1));
    lengths.set(available[0],lengths.get(available[0])+1);remaining--;
  }
  const entries=DAYS.map((day,index)=>{
    if(!lengths.has(index))return {day,index,workout:null,minutes:0};
    let id=isBeginner?'runwalk':index===hardDay?hardId:index===longDay?'lsd':hardDay!==null&&index===(hardDay+1)%7?'recovery':'easy';
    const workout=tailoredWorkout(id,lengths.get(index));
    return {day,index,workout,minutes:totalMinutes(workout)};
  });
  if(sorted.some(d=>sorted.includes((d+1)%7)))notes.push('Ada hari larian berturut-turut, termasuk hujung minggu. Kekalkan sesi ringan dan pilih hari rehat jika pemulihan belum cukup.');
  if(goal==='5k')notes.push('Fokus 5KM memilih 4×4 sebagai sesi hard: setiap set bergerak dari Z4 ke Z5. Pelan satu minggu ini belum menilai tarikh perlumbaan atau sasaran masa.');
  if(goal==='10k')notes.push('Fokus 10KM memilih Killer 2×10 di Z4 untuk membina keupayaan menahan usaha. Pelan satu minggu ini belum menilai tarikh perlumbaan atau sasaran masa.');
  return {entries,total:entries.reduce((n,e)=>n+e.minutes,0),hard:hardDay!==null,days:days.length,notes,goal,level};
}
