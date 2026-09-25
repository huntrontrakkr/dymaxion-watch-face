const MAX_AGE=15*60000;
function locate(){return new Promise((resolve,reject)=>{
  if(typeof navigator==='undefined'||!navigator.geolocation){reject(new Error('Location access is unavailable.'));return;}
  navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:MAX_AGE,timeout:10000});
});}
// City naming and weather share one coarse, on-demand fix. No location watch
// or high-accuracy GPS runs in the background.
export function positionProvider({getPosition=locate,now=Date.now}={}){
  let cached=null,fetched=0,pending=null;
  return ()=>{
    if(cached&&now()>=fetched&&now()-fetched<MAX_AGE)return Promise.resolve(cached);
    if(pending)return pending;
    pending=Promise.resolve().then(getPosition).then(position=>{
      const c=position?.coords;
      if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180)throw new Error('Location coordinates are unavailable.');
      cached={coords:{latitude:c.latitude,longitude:c.longitude}};fetched=now();return cached;
    }).then(value=>{pending=null;return value;},error=>{pending=null;throw error;});
    return pending;
  };
}
export const devicePosition=positionProvider();
