import {normalizeForecast,normalizeTide,weatherUrl,tideUrls,environmentIsValid} from '../shared/panel-data.js';
import moment from 'moment-timezone';
import {devicePosition} from './device-position.js';
export function requestJSON(url){return new Promise((resolve,reject)=>{
  if(typeof XMLHttpRequest==='undefined'){reject(new Error('Network unavailable.'));return;}
  const request=new XMLHttpRequest();request.open('GET',url,true);request.timeout=20000;
  request.onload=()=>{if(request.status<200||request.status>=300){reject(new Error('Provider HTTP '+request.status));return;}try{resolve(JSON.parse(request.responseText));}catch{reject(new Error('Provider returned invalid JSON.'));}};
  request.onerror=()=>reject(new Error('Network unavailable.'));request.ontimeout=()=>reject(new Error('Provider timed out.'));request.send();
});}
export function environmentService({getSettings,send,storage,getJSON=requestJSON,getPosition=devicePosition,getTimeZone=()=>moment.tz.guess(true)||'Etc/UTC',now=Date.now}){
  const memory={},inflight={},retryAfter={};
  function descriptor(kind){
    const s=getSettings(),f=s.footer,weather=kind==='weather',current=weather&&f.weather.place==='current',place=s.places[f.weather.place];
    const tz=current?getTimeZone():place?.tz;
    const enabled=f.enabled&&(weather?f.weather.enabled&&f.pages.some(p=>p==='weather'||p==='humidity'):!!f.tide.station&&f.pages.includes('tide'));
    return {enabled,current,tz,key:JSON.stringify(weather?(current?['current',tz]:[place.lat,place.lon,place.tz,place.label]):[f.tide.station,f.tide.label,f.tide.tz]),label:weather?(current?'TEMP':place.label):f.tide.label,place,tide:f.tide,interval:weather?f.weather.refreshMinutes*60000:6*3600000};
  }
  function read(kind,key){
    try{
      const saved=memory[kind]||JSON.parse(storage.getItem('dymaxion-environment-'+kind)||'null');
      if(saved&&saved.key===key&&!saved.data?.demo&&environmentIsValid(saved.data,kind)){memory[kind]=saved;return saved.data;}
    }catch{}return null;
  }
  async function refreshKind(kind){
    const d=descriptor(kind);
    if(!d.enabled||inflight[kind]?.key!==d.key)delete inflight[kind];
    if(!d.enabled){send(kind,{label:d.label,samples:[]});return;}
    const cached=read(kind,d.key);if(cached)send(kind,cached);
    if(cached&&now()-cached.fetched*1000<d.interval&&cached.start*1000+48*3600000>now()+d.interval)return;
    if(inflight[kind]?.key===d.key)return;
    if(retryAfter[kind]?.key===d.key&&retryAfter[kind].until>now()){send(kind,{...(cached||{label:d.label,samples:[]}),error:true});return;}
    if(!cached)send(kind,{label:d.label,samples:[]});
    const request={key:d.key};inflight[kind]=request;
    const active=()=>inflight[kind]===request&&descriptor(kind).key===d.key&&descriptor(kind).enabled;
    try{
      let place=d.place;
      if(d.current){
        // Ask only when the forecast needs refreshing; city naming shares this
        // coarse fix, and never needs to succeed before weather can work.
        const c=(await getPosition())?.coords;
        if(!active())return;
        if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180)throw new Error('Location coordinates are unavailable.');
        place={lat:+c.latitude.toFixed(3),lon:+c.longitude.toFixed(3),tz:d.tz,label:d.label};
      }
      const stamp=now();
      const data=kind==='weather'?{...normalizeForecast(await getJSON(weatherUrl(place)),place,stamp),place}:await Promise.all(tideUrls(d.tide,stamp).map(getJSON)).then(([hourly,extrema])=>normalizeTide(hourly,extrema,d.tide,stamp));
      if(!active())return;
      memory[kind]={key:d.key,data};try{storage.setItem('dymaxion-environment-'+kind,JSON.stringify(memory[kind]));}catch{}
      delete retryAfter[kind];send(kind,data);
    }catch(error){
      if(!active())return;
      retryAfter[kind]={key:d.key,until:now()+5*60000};
      send(kind,{...(cached||{label:d.label,samples:[]}),error:true});console.log(kind+' refresh: '+error.message);
    }finally{if(inflight[kind]===request)delete inflight[kind];}
  }
  return {refresh:()=>Promise.all([refreshKind('weather'),refreshKind('tide')])};
}
