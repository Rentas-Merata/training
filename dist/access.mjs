const PUBLIC_VIEWS=new Set(['zones','workouts']);

export function resolveView(hash,signedIn){
  const requested=hash.replace(/^#/,'');
  if(requested==='planner'&&!signedIn)return {view:'zones',loginRequired:true,pendingRoute:'planner'};
  if(requested==='planner'||PUBLIC_VIEWS.has(requested))return {view:requested,loginRequired:false,pendingRoute:null};
  return {view:'zones',loginRequired:requested==='login'&&!signedIn,pendingRoute:null};
}
