import {CITY_REFRESH,cityIsUsable,cityText,reverseCity} from '../shared/city.js';
import {requestJSON} from './environment-service.js';
import {devicePosition} from './device-position.js';
export {devicePosition} from './device-position.js';
export function locationService({getSettings,send,storage,getPosition=devicePosition,getJSON=requestJSON,now=Date.now}){
  const key='dymaxion-current-city-v1';let cached=null,pending=null,retryAfter=0,generation=0,mode='';
  try{const saved=JSON.parse(storage.getItem(key)||'null');if(cityIsUsable(saved,now())&&!saved.manual&&saved.name===cityText(saved.name))cached=saved;}catch{}
  function emit(stale=false){
    const city=cityIsUsable(cached,now())?{...cached,stale:stale||now()/1000-cached.fetched>7200}:{name:'',fetched:0};
    send(city);return city;
  }
  function refresh(){
    const config=getSettings().location;
    if(config.mode!==mode){mode=config.mode;generation++;retryAfter=0;pending=null;}
    if(mode==='manual'){const city={name:config.name,manual:true,fetched:0};send(city);return Promise.resolve(city);}
    if(pending)return pending;
    if(cached&&cityIsUsable(cached,now())&&now()-cached.fetched*1000<CITY_REFRESH)return Promise.resolve(emit());
    if(now()<retryAfter)return Promise.resolve(emit(true));
    emit(true);const token=generation;
    const job=Promise.resolve().then(async()=>{
      try{
        const position=await getPosition(),c=position?.coords;
        if(token!==generation||getSettings().location.mode!=='auto')return;
        if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180)throw new Error('Location coordinates are unavailable.');
        // Round to roughly 100 m; a city label does not need exact coordinates.
        const url='https://photon.komoot.io/reverse?lat='+c.latitude.toFixed(3)+'&lon='+c.longitude.toFixed(3)+'&lang=en&limit=1&radius=5';
        const name=reverseCity(await getJSON(url));
        if(token!==generation||getSettings().location.mode!=='auto')return;
        // Coordinates to 0.1 degree (about 11 km) are ample for sunrise and
        // sunset (well under a minute) and go only to the watch.
        cached={name,fetched:Math.floor(now()/1000),lat:Math.round(c.latitude*10)/10,lon:Math.round(c.longitude*10)/10};retryAfter=0;
        try{storage.setItem(key,JSON.stringify(cached));}catch{}
        return emit();
      }catch{
        if(token!==generation||getSettings().location.mode!=='auto')return;
        retryAfter=now()+15*60000;return emit(true);
      }finally{if(token===generation)pending=null;}
    });
    pending=job;return job;
  }
  return {refresh};
}
