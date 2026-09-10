export const DAYS = ['Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu','Ahad'];
export const ZONES = [
  {id:1,name:'Recovery',feel:'Sangat ringan',low:50,high:60,color:'#8796a7'},
  {id:2,name:'Zone 2',feel:'Rujukan',low:60,high:70,color:'#237acf'},
  {id:3,name:'Aerobic',feel:'Usaha sederhana',low:70,high:80,color:'#299c79'},
  {id:4,name:'Zone 4',feel:'Rujukan',low:80,high:90,color:'#cd8c1f'},
  {id:5,name:'Maximum',feel:'Sangat tinggi',low:90,high:100,color:'#dd555b'}
];
export function calculateHR(age, method='tanaka', manual=190, basis='maxhr', resting=null){
  if(method!=='manual'&&(!Number.isInteger(age)||age<18||age>85))throw new Error('Masukkan umur bulat antara 18 hingga 85 tahun.');
  if(!['tanaka','fox','manual'].includes(method))throw new Error('Pilih kaedah HR maksimum.');
  if(method==='manual'&&(!Number.isInteger(manual)||manual<100||manual>240))throw new Error('Masukkan HR maksimum bulat antara 100 hingga 240 bpm.');
  if(!['maxhr','hrr'].includes(basis))throw new Error('Pilih kaedah zone yang sah.');
  const max=method==='manual'?manual:Math.round(method==='fox'?220-age:208-0.7*age);
  if(basis==='hrr'&&(!Number.isInteger(resting)||resting<30||resting>100||resting>=max))throw new Error('HRR perlukan resting HR antara 30–100 bpm dan lebih rendah daripada HR maksimum. Gunakan bacaan rehat sebenar.');
  const base=basis==='hrr'?resting:0, reserve=max-base;
  const zones=ZONES.map(z=>({...z,min:Math.ceil(base+reserve*z.low/100),max:z.id===5?max:Math.ceil(base+reserve*z.high/100)-1}));
  return {age,method,max,basis,resting:basis==='hrr'?resting:null,reserve,zones};
}
