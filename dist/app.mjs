import {DAYS} from './training.mjs';
import {WORKOUTS,totalMinutes,generatePlan} from './sessions.mjs';
import {profileFields,resolveProfile,workoutRange} from './profile.mjs';
import {currentUser,onAuthChange,requestEmailLink,signOut,saveProgram,getActiveProgram} from './auth.mjs';
const $=id=>document.getElementById(id);
let hr=null,plan=null,dialogWorkout=null,planStarted=false,user=null,linkRequested=false,pendingRoute=null,activeProgram=null;
const duration=s=>`${Math.floor(s/60)} minit${s%60?' '+s%60+' saat':''}`;
const basis=()=>hr?.basis==='hrr'?'Method Karvonen · %HRR':'Method Tanaka · %HRmaks';
function guidance(s){if(s.walk)return 'Jalan / jog selesa<small>Tiada bpm wajib</small>';const g=workoutRange(s.zones,hr,s.protocol);return `${g.title}<small>${g.detail}</small>`;}
function showView(){let key=['zones','workouts','planner'].includes(location.hash.slice(1))?location.hash.slice(1):'zones';if(location.hash==='#login'){history.replaceState(null,'','#zones');openAuth();}for(const v of ['zones','workouts','planner'])$(`${v}-view`).hidden=v!==key;document.querySelectorAll('[data-view]').forEach(a=>{const active=a.dataset.view===key;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
addEventListener('hashchange',showView);

function renderAuth(){const b=$('auth-button');b.textContent=user?`Hi, ${user.user_metadata?.display_name||user.email.split('@')[0]}`:'Log masuk';b.classList.toggle('signed-in',!!user);if(user){b.title='Klik untuk log keluar';}renderMenu();showView();}
function resetAuthForm(){
  linkRequested=false;$('auth-form').reset();$('profile-fields').hidden=false;
  $('auth-error').hidden=true;$('auth-submit').disabled=false;
  $('auth-email').readOnly=false;
  $('auth-submit').textContent='Hantar link';
  $('auth-copy').textContent='Kami hantar link pengesahan ke email anda. Klik link itu untuk masuk — tiada password diperlukan.';
}
function openAuth(reason=''){
  if(user)return;resetAuthForm();pendingRoute=reason||null;
  if(!$('auth-dialog').open)$('auth-dialog').showModal();$('auth-email').focus();
}
$('auth-button').addEventListener('click',async()=>{if(user){await signOut();return;}openAuth();});
for(const id of ['auth-cancel','auth-close'])$(id).addEventListener('click',()=>{resetAuthForm();$('auth-dialog').close();});
$('auth-form').addEventListener('submit',async e=>{
  e.preventDefault();if(linkRequested)return;
  const error=$('auth-error');error.hidden=true;$('auth-submit').disabled=true;
  try{
    const result=await requestEmailLink($('auth-email').value.trim(),{name:$('profile-name').value.trim(),goal:$('profile-goal').value});
    if(result.error)throw result.error;
    linkRequested=true;$('auth-email').readOnly=true;$('profile-fields').hidden=true;
    $('auth-copy').textContent='Semak inbox atau folder spam. Klik link dalam email terbaru untuk masuk ke Rentas.';
    $('auth-submit').textContent='Link sudah dihantar';
  }catch(err){error.textContent=err.message||'Link belum berjaya dihantar. Cuba lagi.';error.hidden=false;$('auth-submit').disabled=false;}
});
let authRevision=0;
onAuthChange(async next=>{
  const revision=++authRevision;user=next;activeProgram=null;renderAuth();
  if(!user)return;
  if($('auth-dialog').open){$('auth-dialog').close();resetAuthForm();}
  if(pendingRoute==='planner'){pendingRoute=null;location.hash='planner';}
  try{
    const loaded=await getActiveProgram(next.id);
    if(revision!==authRevision)return;
    activeProgram=loaded;
    const current=loaded?.program_weeks?.find(w=>w.status==='current');
    if(current?.plan){plan=current.plan;renderPlan();}
  }catch(err){console.error('Program belum dapat dimuatkan.');}
});
const authFragment=new URLSearchParams(location.hash.slice(1));
if(authFragment.has('error')||authFragment.has('error_code')){
  history.replaceState(null,'',location.pathname+location.search);
  openAuth();$('auth-error').hidden=false;
  $('auth-error').textContent='Link tidak sah atau sudah tamat tempoh. Minta link baru untuk masuk.';
}
function renderHR(){
  const type=$('hr-type').value,f=profileFields(type);
  for(const [id,on] of [['age-field',f.age],['manual-field',f.maximum],['resting-field',f.resting]]){$(id).hidden=!on;$(id).disabled=!on;}
  hr=null;$('hr-error').hidden=true;
  try{hr=resolveProfile({type,age:$('age').value,maximum:$('manual-max').value,resting:$('resting-hr').value});}catch(e){$('hr-error').textContent=e.message;$('hr-error').hidden=false;}
  $('zone-basis-badge').textContent=hr?basis():'PILIH KAEDAH';$('formula-card').hidden=!hr;
  if(hr){
    const reserve=hr.basis==='hrr';
    $('formula').textContent=reserve?`${hr.resting} + (% × ${hr.reserve})`:`% × ${hr.max}`;
    $('formula-detail').textContent=reserve?`HR reserve = ${hr.max} − ${hr.resting} = ${hr.reserve}.`:`Z2 = 60–70% × ${hr.max}.`;
    $('max-formula-detail').textContent=type==='tanaka'?`HR maksimum = 208 − (0.7 × ${hr.age}) ≈ ${hr.max} bpm.`:`HR maksimum input = ${hr.max} bpm.`;
    $('hr-results').innerHTML=`<div class="max-card"><div><span class="kicker">${f.age?'ANGGARAN ':''}HR MAKSIMUM</span><strong class="max-number">${hr.max}<small>bpm</small></strong><p>${reserve?'Resting HR '+hr.resting+' bpm':'Berdasarkan '+(f.age?'umur':'input')+' anda'}</p></div><div class="easy-target"><span class="kicker">KAEDAH AKTIF</span><strong style="font-size:1.3rem">${basis()}</strong><p>Kalkulator, menu dan pelan menggunakan pilihan ini.</p></div></div><div class="card zones-card"><div class="zones-top"><h3>HR Zone anda</h3><span>${basis()}</span></div>${hr.zones.map(z=>`<div class="zone-row" style="--zone:${z.color}"><span class="zone-pill">Z${z.id}</span><div class="zone-name"><strong>${z.low}–${z.high}%</strong><small>${reserve?'HR reserve':'HR maksimum'}</small></div><div class="zone-meter"><span style="width:${z.id*20}%"></span></div><div class="zone-range">${z.min}–${z.max} <small>bpm</small></div></div>`).join('')}<p class="fineprint">Kiraan berubah terus apabila input diubah. Batas dibundarkan tanpa pertindihan.</p></div>${reserve?'<div class="card effort-card"><strong>HRR mengubah sasaran bpm.</strong><p>Zone bernombor sama bukan intensiti yang sama dengan %HRmaks. Jangan pilih HRR untuk mendapat nombor lebih tinggi. Protokol 4×4 kekal 85–95% HRmaks dan memaparkan label setara.</p></div>':''}`;
  }else $('hr-results').innerHTML=`<div class="card zones-pending"><h3>${type?'Lengkapkan maklumat anda.':'Mulakan dengan satu pilihan.'}</h3><p>${type==='hrr'?'HRR memerlukan HR maksimum dan resting HR. Kedua-duanya bacaan berbeza.':type?'Hanya input bagi kaedah dipilih digunakan.':'Pilih cara kira HR dahulu. Tiada bacaan contoh digunakan sebagai data anda.'}</p></div>`;
  $('menu-hr-badge').textContent=hr?`${basis()} · HRmaks ${hr.max}`:'Lengkapkan HR Zone untuk bpm';
  renderMenu();if(plan)renderPlan();if(dialogWorkout)fillDialog(dialogWorkout);
}
$('hr-form').addEventListener('submit',e=>{e.preventDefault();renderHR();});
$('hr-form').addEventListener('input',renderHR);$('hr-form').addEventListener('change',renderHR);
function renderMenu(){
  $('workout-grid').innerHTML=WORKOUTS.map((w,i)=>{const open=['recovery','runwalk','easy','lsd'].includes(w.id),signature=w.name.startsWith('Rentas '),category=w.category.toLowerCase();return `<article class="card workout-card category-${category} ${open||user?"is-open":"is-locked"}"><div class="workout-top"><span class="num">${String(i+1).padStart(2,'0')}</span><span class="tag ${w.category==='Hard'?'hard':'light'}">${w.category}</span></div><h3>${signature?'★ ':''}${w.name}</h3><p class="workout-sub">${w.id==='four'?'Protokol 4 × 4 minit':w.id==='runwalk'?'1 minit lari / 1 minit jalan':w.subtitle}</p><div class="workout-metrics"><div><strong>${totalMinutes(w)}</strong><span>minit · jumlah</span></div><div><strong>${w.zoneLabel}</strong><span>${w.id==='four'?'Protokol tetap':hr?basis():'Pilih kaedah HR'}</span></div></div><button class="outline-button" data-workout="${w.id}">${open||user?"Lihat sesi":"🔒 Buka sesi"}</button></article>`}).join('');
}
const row=s=>`<tr><td>${s.instruction}</td><td>${duration(s.seconds)}</td><td>${guidance(s)}</td></tr>`;
function compactSteps(w){
  if(!['blend','four','short','killer','runwalk'].includes(w.id))return w.steps.map(row).join('');
  const main=w.steps.slice(1,-1),hard=main.filter(s=>!s.walk),rest=main.filter(s=>s.walk).reduce((n,s)=>n+s.seconds,0);
  const instruction=w.id==='blend'?`4 × (${duration(hard[0].seconds)} Z4 + ${duration(hard[1].seconds)} Z5)`:`${hard.length} × ${duration(hard[0].seconds)} ${w.id==='runwalk'?'lari selesa':'hard terkawal'}`;
  const unique=hard.filter((s,i)=>hard.findIndex(t=>JSON.stringify(t.zones)===JSON.stringify(s.zones))===i);
  return row(w.steps[0])+`<tr><td>${instruction}</td><td>${duration(hard.reduce((n,s)=>n+s.seconds,0))}</td><td>${unique.map(guidance).join('<br>')}</td></tr>`+(rest?`<tr><td>${w.id==='runwalk'?'Berjalan antara larian':`Recovery · ${w.id==='short'?'2':'3'} minit antara set`}</td><td>${duration(rest)}</td><td>Jalan / jog selesa</td></tr>`:'')+row(w.steps.at(-1));
}
function fillDialog(w){const locked=!user&&!['recovery','runwalk','easy','lsd'].includes(w.id);const rows=locked?row(w.steps[0])+row(w.steps[1]):compactSteps(w);const gate=locked?'<div class="dialog-lock"><strong>🔒 Buka arahan penuh</strong><p>Log masuk untuk lihat langkah lengkap, warm-up dan cooldown.</p><button type="button" class="primary" id="dialog-login">Log masuk</button></div>':'';$('dialog-content').innerHTML='<p class="dialog-eyebrow">'+w.category.toUpperCase()+' · '+(hr?basis():'HR belum dikira')+'</p><h2 id="dialog-title">'+w.name+'</h2><p>'+(w.id==='four'?'85–95% HRmaks, diterjemah ke kaedah aktif.':w.id==='runwalk'?'Selang lari selesa dan berjalan.':w.subtitle+' daripada masa utama.')+'</p><div class="table-wrap"><table><thead><tr><th>Arahan</th><th>Masa</th><th>HR Zone</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Jumlah</td><td>'+duration(totalMinutes(w)*60)+'</td><td>Termasuk rehat</td></tr></tfoot></table></div>'+gate+'<p class="dialog-tip">'+w.tip+'</p><details><summary>Nota latihan</summary><p class="fineprint">'+w.note+'</p><p class="fineprint">Zone bukan ukuran threshold. Untuk sesi ringan, pastikan boleh berbual. Untuk interval pendek, ikut usaha terkawal dan jangan mengejar HR.</p>'+(w.id==='four'?'<p><a href="https://www.ntnu.edu/cerg/advice" target="_blank" rel="noopener noreferrer">Rujukan NTNU</a></p>':'')+'</details>';}
function openWorkout(w){dialogWorkout=w;fillDialog(w);$('workout-dialog').showModal();}
  $('workout-grid').addEventListener('click',e=>{const b=e.target.closest('[data-workout]');if(b){const w=WORKOUTS.find(x=>x.id===b.dataset.workout);if(!user&&!['recovery','runwalk','easy','lsd'].includes(w.id)){openAuth('workouts');return;}openWorkout(w);}});
$('close-dialog').addEventListener('click',()=>$('workout-dialog').close());$('workout-dialog').addEventListener('close',()=>dialogWorkout=null);
$('dialog-content').addEventListener('click',e=>{if(e.target.id==='dialog-login'){$('workout-dialog').close();openAuth('workouts');}});
$('day-picker').innerHTML=DAYS.map((d,i)=>`<label><input type="checkbox" name="day" value="${i}" aria-label="${d}" ${[1,3,6].includes(i)?'checked':''}><span>${['Is','Se','Ra','Kh','Ju','Sa','Ah'][i]}</span></label>`).join('');
function readPlan(){return {level:$('level').value,goal:$('goal').value,weekly:$('weekly-min').value===''?NaN:Number($('weekly-min').value),longest:$('longest-min').value===''?NaN:Number($('longest-min').value),days:[...document.querySelectorAll('input[name=day]:checked')].map(n=>Number(n.value)),quality:$('quality').checked};}
function updatePlan(){try{plan=generatePlan(readPlan());$('plan-error').hidden=true;renderPlan();}catch(e){plan=null;$('plan-error').hidden=false;$('plan-error').textContent=e.message;$('plan-result').innerHTML='<div class="card zones-pending"><h3>Semak input pelan.</h3><p>Pelan lama disembunyikan supaya tidak tersalah guna.</p></div>';if(dialogWorkout)$('workout-dialog').close();}}
function renderPlan(){if(!plan)return;const goals={habit:'Bina rutin & stamina','5k':'Bersedia untuk 5KM','10k':'Bersedia untuk 10KM'},levels={beginner:'Pemula',base:'Bina asas',consistent:'Konsisten'},duration={beginner:4,base:8,consistent:12}[plan.level],week=activeProgram?.program_weeks?.find(w=>w.status==='current')?.week_number||1;
  $('program-duration-label').textContent=`${duration} MINGGU · MINGGU ${week}`;
  $('plan-result').innerHTML=`<div class="program-progress"><strong>${levels[plan.level]} · ${duration} minggu</strong><span>Minggu ${week} daripada ${duration}</span><div class="progress-track"><i style="width:${Math.round(week/duration*100)}%"></i></div><small>Minggu seterusnya akan dibuka selepas semakan minggu ini.</small></div><div class="plan-summary"><div><h3>${goals[plan.goal]}</h3><p>Minggu ${week} · ${plan.days} hari · ${plan.hard?'1 sesi hard':'Tanpa sesi hard'}</p><p>${hr?basis()+' · HRmaks '+hr.max:'Isi HR Zone untuk bpm sesi'}</p></div><div class="plan-total">${plan.total}<small>minit</small></div></div><div class="card week-list">${plan.entries.map(e=>`<div class="week-row ${e.workout?'':'rest'}"><span class="week-day">${e.day}</span><div class="week-description"><strong>${e.workout?e.workout.name:'Rehat'}</strong><small>${e.workout?e.workout.zoneLabel:'Pulih'}</small></div><div class="week-time">${e.minutes||'—'}${e.minutes?'<small> min</small>':''}</div>${e.workout?`<button class="view-day" data-day="${e.index}" aria-label="Lihat sesi ${e.day}">↗</button>`:'<span></span>'}</div>`).join('')}</div><details class="plan-message" ${plan.requested>plan.total||(readPlan().quality&&!plan.hard)?'open':''}><summary>Kenapa pelan ini?</summary>${plan.notes.map(n=>`<p>${n}</p>`).join('')}<p>Masa tidak melebihi rutin semasa atau had sesi. Input berubah → pelan dikemas kini.</p></details>`;
}
$('plan-form').addEventListener('submit',e=>{e.preventDefault();planStarted=true;updatePlan();if(plan){$('save-program').hidden=!user;$('save-status').textContent=user?'Semak cadangan ini, kemudian tekan Mula program.':'Log masuk diperlukan untuk simpan program.';}});
$('save-program').addEventListener('click',async()=>{if(!user){openAuth('planner');return;}if(!plan)return;$('save-program').disabled=true;$('save-status').textContent='Menyimpan program…';try{const p=readPlan(),duration={beginner:4,base:8,consistent:12}[p.level];activeProgram=await saveProgram(user.id,{...p,training_days:p.days,hr_method:hr?.basis==='hrr'?'hrr':'tanaka',age:hr?.age,max_hr:hr?.max,resting_hr:hr?.resting,name:user.user_metadata?.display_name},plan,duration);$('save-program').hidden=true;$('save-status').textContent='Program aktif. Minggu pertama sedia untuk anda.';renderPlan();}catch(err){$('save-status').textContent='Belum berjaya disimpan. Cuba lagi.';console.error(err);}finally{$('save-program').disabled=false;}});
for(const event of ['input','change'])$('plan-form').addEventListener(event,()=>{if(planStarted)updatePlan();});
$('plan-result').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(b&&plan)openWorkout(plan.entries[Number(b.dataset.day)].workout);});
$('plan-result').innerHTML='<div class="card zones-pending"><h3>Bina pelan pertama anda.</h3><p>Isi tahap, fokus, masa dan hari. Selepas dibina, perubahan input terus mengemas kini pelan.</p></div>';
const initialLevel=new URLSearchParams(location.search).get('level');
if(['beginner','base','consistent'].includes(initialLevel))$('level').value=initialLevel;
renderHR();
