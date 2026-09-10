import {DAYS,ZONES,WORKOUTS,calculateHR,totalMinutes,generatePlan,sessionGuidance} from './training.mjs';
const $=id=>document.getElementById(id);
let hr=null,maxReference=null,plan=null,dialogWorkout=null;
function guidanceCell(step){const g=sessionGuidance(step.zones,maxReference);return `${g.title}<small>${g.detail}</small><small>${g.effort}</small>`;}
function chart(workout){return `<div class="session-chart" aria-hidden="true">${workout.steps.map(s=>`<span style="flex:${s.minutes};height:${15+Math.max(...s.zones)*16}%;--zone:${ZONES[Math.max(...s.zones)-1].color}"></span>`).join('')}</div>`;}
function showView(){
  const key=['zones','workouts','planner'].includes(location.hash.slice(1))?location.hash.slice(1):'zones';
  for(const v of ['zones','workouts','planner'])$(`${v}-view`).hidden=v!==key;
  document.querySelectorAll('[data-view]').forEach(link=>{const active=link.dataset.view===key;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
}
addEventListener('hashchange',showView);showView();
function renderHR(){
  const method=$('hr-method').value, age=Number($('age').value), manual=Number($('manual-max').value);
  const basis=$('zone-basis').value, resting=$('resting-hr').value===''?null:Number($('resting-hr').value);
  const reserveMode=basis==='hrr',basisLabel=reserveMode?'%HRR':'%HRmaks';
  $('manual-field').hidden=method!=='manual';$('manual-max').required=method==='manual';$('manual-max').disabled=method!=='manual';
  $('resting-field').hidden=!reserveMode;$('resting-hr').required=reserveMode;$('resting-hr').disabled=!reserveMode;
  $('zone-basis-badge').textContent=reserveMode?'HRR / KARVONEN':'% HR MAKSIMUM';
  $('formula').textContent=reserveMode?'Resting HR + (% × HR reserve)':'% × HR maksimum';
  $('formula-detail').textContent=reserveMode?'HR reserve = HR maksimum − resting HR.':'Contoh Z2: 60–70% daripada HR maksimum.';
  $('hr-error').hidden=true;hr=null;maxReference=null;
  try{
    maxReference=calculateHR(age,method,manual);
    $('max-formula-detail').textContent=method==='tanaka'?`HR maksimum: 208 − (0.7 × ${age}) ≈ ${maxReference.max} bpm.`:method==='fox'?`HR maksimum: 220 − ${age} = ${maxReference.max} bpm.`:`HR maksimum input anda: ${maxReference.max} bpm.`;
    if(!reserveMode||resting!==null)hr=calculateHR(age,method,manual,basis,resting);
    if(hr?.basis==='hrr')$('formula-detail').textContent=`HR reserve: ${hr.max} − ${hr.resting} = ${hr.reserve} bpm. Contoh Z2: ${hr.resting} + (60–70% × ${hr.reserve}).`;
  }catch(e){$('hr-error').hidden=false;$('hr-error').textContent=e.message;if(!maxReference)$('max-formula-detail').textContent='Lengkapkan umur dan HR maksimum yang sah.';}
  const maxCard=`<div class="max-card"><div><span class="kicker">${method==='manual'?'HR MAKSIMUM ANDA':'ANGGARAN HR MAKSIMUM'}</span><strong class="max-number">${maxReference?.max??'—'}<small>bpm</small></strong><p>${method==='manual'?'Berdasarkan input anda.':'Titik mula, bukan had mutlak.'}</p></div><div class="easy-target"><span class="kicker">PANDUAN UTAMA EASY RUN</span><strong>3–4 <small>/ 10 usaha</small></strong><span class="easy-label">Boleh cakap ayat penuh.</span><p>Nafas terkawal, tanpa tercungap. Bukan wajib masuk Zone 2.</p></div></div>`;
  const talkCard='<div class="card effort-card"><strong>Tak tahu resting HR? Masih boleh mula.</strong><p>Guna talk test + rasa usaha untuk sesi ringan. Jika hanya mampu sebut beberapa perkataan, perlahan. Jika HR luar biasa tinggi atau badan tidak selesa, kurangkan usaha dan semak keadaan—jangan abaikan bacaan.</p><p class="fineprint">RPE 0 = rehat; 10 = usaha maksimum. Talk test ialah panduan, bukan pengesahan ambang aerobik. <a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html" target="_blank" rel="noopener noreferrer">Rujukan CDC</a></p></div>';
  let zoneCard;
  if(hr){
    zoneCard=`<div class="card zones-card"><div class="zones-top"><h3>Lima julat rujukan</h3><span>${basisLabel}</span></div>${hr.zones.map(z=>`<div class="zone-row" style="--zone:${z.color}"><span class="zone-pill">Z${z.id}</span><div class="zone-name"><strong>${z.low}–${z.high}%</strong><small>${reserveMode?'HR reserve':'HR maksimum'} · julat rujukan</small></div><div class="zone-meter" aria-hidden="true"><span style="width:${z.id*20}%"></span></div><div class="zone-range">${z.min}–${z.max} <small>bpm</small></div></div>`).join('')}<p class="fineprint">Z2 di sini ialah nama julat, bukan jaminan usaha easy. ${reserveMode?'60–70% HRR boleh terlalu kuat untuk sesetengah pelari.':'Berjalan boleh masuk Z2; itu tetap latihan.'}</p></div>`;
    if(reserveMode){const old=maxReference.zones[1],current=hr.zones[1];zoneCard+=`<div class="card comparison-card"><h3>Nombor lain, kaedah lain.</h3><p>HR maks. ${hr.max} · resting HR ${hr.resting} bpm</p><table><thead><tr><th scope="col">Julat berlabel Z2</th><th scope="col">Bpm</th></tr></thead><tbody><tr><th scope="row">60–70% HR maksimum</th><td>${old.min}–${old.max}</td></tr><tr><th scope="row">60–70% HRR / Karvonen</th><td>${current.min}–${current.max}</td></tr></tbody></table><p class="fineprint">Label sama tidak bermaksud intensiti sama. Nombor lebih tinggi bukan sasaran yang wajib dicapai.</p></div>`;}
  }else{
    zoneCard=`<div class="card zones-pending"><span class="tag">${basisLabel}</span><h3>${maxReference&&resting===null&&reserveMode?'Isi resting HR untuk kira HRR.':'Semak input untuk melihat zone.'}</h3><p>${maxReference&&resting===null&&reserveMode?'Rentas tidak meneka bacaan rehat anda. Lima julat HRR hanya muncul selepas input yang sah.':'Julat lama tidak digunakan sementara input tidak sah.'}</p></div>`;
  }
  $('hr-results').innerHTML=maxCard+talkCard+zoneCard;
  $('menu-hr-badge').textContent='5KM: Z4→Z5 · 10KM: Z4';
  if(plan)renderPlan();if(dialogWorkout&&$('workout-dialog').open)fillDialog(dialogWorkout);
}
$('hr-form').addEventListener('submit',e=>{e.preventDefault();renderHR();});
$('hr-form').addEventListener('input',renderHR);$('hr-form').addEventListener('change',renderHR);
function renderMenu(){
  $('workout-grid').innerHTML=WORKOUTS.map((w,i)=>`<article class="card workout-card"><div class="workout-top"><span class="num">SESSION / 0${i+1}</span><span class="tag ${w.category==='Hard'?'hard':'light'}">${w.category}</span></div><h3>${w.name}</h3><p class="workout-sub">${w.subtitle}</p>${chart(w)}<div class="workout-metrics"><div><strong>${totalMinutes(w)}</strong><span>minit · jumlah</span></div><div><strong>${w.zoneLabel}</strong><span>rujukan %HRmaks</span></div><div><strong>${w.effort.split(' / ')[0]}</strong><span>usaha / 10</span></div></div><button class="outline-button" data-workout="${w.id}">Lihat sesi <span aria-hidden="true">↗</span></button></article>`).join('');
}
function fillDialog(w){
  $('dialog-content').innerHTML=`<p class="dialog-eyebrow">MENU LATIHAN / ${w.category.toUpperCase()}</p><h2 id="dialog-title">${w.name}</h2><p class="description">${w.subtitle}</p><div class="dialog-stats"><div><strong>${totalMinutes(w)} minit</strong><span>Jumlah masa</span></div><div><strong>${w.zoneLabel}</strong><span>Rujukan %HRmaks</span></div><div><strong>${w.effort}</strong><span>Rasa usaha (RPE)</span></div></div>${chart(w)}<p class="fineprint">Profil usaha ilustrasi, bukan bacaan HR. RPE: 0 = rehat, 10 = usaha maksimum.</p><div class="table-wrap"><table><thead><tr><th scope="col">Instruction</th><th scope="col">Masa</th><th scope="col">HR Zone</th></tr></thead><tbody>${w.steps.map(s=>`<tr><td>${s.instruction}</td><td>${s.minutes} minit</td><td>${guidanceCell(s)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Jumlah</td><td>${totalMinutes(w)} minit</td><td>Termasuk rehat</td></tr></tfoot></table></div><p class="dialog-tip">${w.tip}</p><p class="fineprint">${w.note}</p>${w.id==='four'?'<p class="fineprint">Bacaan lanjut: <a href="https://www.ntnu.edu/cerg/regimen" target="_blank" rel="noopener noreferrer">Protokol asal CERG / NTNU</a>.</p>':''}<p class="fineprint">Zone dalam menu sesi menggunakan %HRmaks supaya arahan tidak berubah apabila kaedah kalkulator ditukar. ${maxReference?`Bpm rujukan menggunakan HR maks. ${maxReference.max}.`:'Isi HR maksimum yang sah untuk bpm rujukan.'} Talk test dan RPE menjadi semakan kedua. Jangan paksa badan untuk mencapai nombor HR.</p>`;
}
function openWorkout(w){dialogWorkout=w;fillDialog(w);$('workout-dialog').showModal();}
$('workout-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-workout]');if(btn)openWorkout(WORKOUTS.find(w=>w.id===btn.dataset.workout));});
$('close-dialog').addEventListener('click',()=>$('workout-dialog').close());
$('workout-dialog').addEventListener('click',e=>{if(e.target===$('workout-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('workout-dialog').addEventListener('close',()=>{dialogWorkout=null;});
$('day-picker').innerHTML=DAYS.map((d,i)=>`<label><input type="checkbox" name="day" value="${i}" aria-label="${d}" ${[1,3,6].includes(i)?'checked':''}><span>${['Is','Se','Ra','Kh','Ju','Sa','Ah'][i]}</span></label>`).join('');
$('plan-result').innerHTML='<div class="card empty-plan"><span class="empty-number" aria-hidden="true">7</span><h3>Satu minggu. Ikut kemampuan anda.</h3><p>Isi rutin semasa dan hari yang sesuai. Pelan anda akan muncul di sini.</p><ul><li>Masa termasuk warm-up & cooldown</li><li>Majoriti latihan ringan</li><li>Hari rehat tetap sebahagian latihan</li></ul></div>';
function renderPlan(){
  if(!plan)return;
  const goalLabel={habit:'Bina rutin & stamina','5k':'Fokus 5KM','10k':'Fokus 10KM'}[plan.goal];
  const stale=$('plan-result').dataset.stale==='true';
  $('plan-result').innerHTML=`${stale?'<div class="plan-stale" role="status">Input telah berubah. Tekan “Bina pelan saya” untuk kemas kini.</div>':''}<div class="plan-summary"><div><h3>${goalLabel}</h3><p>${plan.days} hari larian · ${7-plan.days} hari rehat · ${plan.hard?'1 sesi hard':'Semua sesi ringan'}</p></div><div class="plan-total">${plan.total}<small>minit</small></div></div><div class="card week-list">${plan.entries.map(e=>`<div class="week-row ${e.workout?'':'rest'}"><span class="week-day">${e.day}</span><div class="week-description"><strong>${e.workout?e.workout.name:'Rehat'}</strong><small>${e.workout?`${e.workout.zoneLabel} · ${e.workout.focus}`:'Pulih untuk sesi seterusnya'}</small></div><div class="week-time">${e.minutes||'—'}${e.minutes?'<small> min</small>':''}</div>${e.workout?`<button class="view-day" data-day="${e.index}" aria-label="Lihat sesi ${e.day}">↗</button>`:'<span></span>'}</div>`).join('')}</div><div class="plan-message"><strong>Cara guna pelan ini</strong><p>Tekan anak panah untuk jadual minit dan HR zone. Zone sesi menggunakan %HRmaks: warm-up Z1–2, easy Z3, latihan 10KM di Z4, dan 4×4 untuk 5KM bergerak dari Z4 ke Z5.</p>${plan.notes.map(n=>`<p>${n}</p>`).join('')}<p>Pelan hanya berada dalam sesi ini. Muat semula halaman akan reset input dan pelan.</p></div>`;
}
$('plan-form').addEventListener('submit',e=>{
  e.preventDefault();
  try{
    const values={level:$('level').value,goal:$('goal').value,weekly:Number($('weekly-min').value),longest:Number($('longest-min').value),days:[...document.querySelectorAll('input[name=day]:checked')].map(n=>Number(n.value)),quality:$('quality').checked};
    plan=generatePlan(values);$('plan-error').hidden=true;$('plan-result').dataset.stale='false';renderPlan();
    if(matchMedia('(max-width:760px)').matches)$('plan-result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  }catch(err){$('plan-error').textContent=err.message;$('plan-error').hidden=false;}
});
$('plan-form').addEventListener('input',()=>{if(plan){$('plan-result').dataset.stale='true';renderPlan();}});
$('plan-result').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(b&&plan)openWorkout(plan.entries[Number(b.dataset.day)].workout);});
renderHR();renderMenu();
