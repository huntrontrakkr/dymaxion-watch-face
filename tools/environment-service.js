import {normalizeForecast,normalizeTide,weatherUrl,tideUrls,environmentIsValid} from '../shared/panel-data.js';
export function requestJSON(url){return new Promise((resolve,reject)=>{
  if(typeof XMLHttpRequest==='undefined'){reject(new Error('Network unavailable.'));return;}
  const request=new XMLHttpRequest();request.open('GET',url,true);request.timeout=20000;
  request.onload=()=>{if(request.status<200||request.status>=300){reject(new Error('Provider HTTP '+request.status));return;}try{resolve(JSON.parse(request.responseText));}catch{reject(new Error('Provider returned invalid JSON.'));}};
  request.onerror=()=>reject(new Error('Network unavailable.'));request.ontimeout=()=>reject(new Error('Provider timed out.'));request.send();
});}
export function environmentService({getSettings,send,storage,getJSON=requestJSON,now=Date.now}){
  const memory={},inflight={},retryAfter={};
  function descriptor(kind){
    const s=getSettings(),f=s.footer,weather=kind==='weather',place=s.places[f.weather.place];
    const enabled=f.enabled&&(weather?f.weather.enabled&&f.pages.some(p=>p==='weather'||p==='humidity'):!!f.tide.station&&(f.pages.includes('tide')||f.weather.enabled&&f.weather.tideMarks&&f.pages.includes('weather')));
    return {enabled,key:JSON.stringify(weather?[place.lat,place.lon,place.tz,place.label]:[f.tide.station,f.tide.label,f.tide.tz]),label:weather?place.label:f.tide.label,place,tide:f.tide,interval:weather?f.weather.refreshMinutes*60000:6*3600000};
  }
  function read(kind,key){
    try{
      const saved=memory[kind]||JSON.parse(storage.getItem('dymaxion-environment-'+kind)||'null');
      if(saved&&saved.key===key&&!saved.data?.demo&&environmentIsValid(saved.data,kind)){memory[kind]=saved;return saved.data;}
    }catch{}return null;
  }
  async function refreshKind(kind){
    const d=descriptor(kind);if(!d.enabled){send(kind,{label:d.label,samples:[]});return;}
    const cached=read(kind,d.key);if(cached)send(kind,cached);
    if(cached&&now()-cached.fetched*1000<d.interval&&cached.start*1000+48*3600000>now()+d.interval)return;
    if(inflight[kind]===d.key)return;
    if(retryAfter[kind]?.key===d.key&&retryAfter[kind].until>now()){send(kind,{...(cached||{label:d.label,samples:[]}),error:true});return;}
    if(!cached)send(kind,{label:d.label,samples:[]});
    inflight[kind]=d.key;
    try{
      const stamp=now();
      const data=kind==='weather'?normalizeForecast(await getJSON(weatherUrl(d.place)),d.place,stamp):await Promise.all(tideUrls(d.tide,stamp).map(getJSON)).then(([hourly,extrema])=>normalizeTide(hourly,extrema,d.tide,stamp));
      if(descriptor(kind).key!==d.key||!descriptor(kind).enabled)return;
      memory[kind]={key:d.key,data};try{storage.setItem('dymaxion-environment-'+kind,JSON.stringify(memory[kind]));}catch{}
      delete retryAfter[kind];send(kind,data);
    }catch(error){
      if(descriptor(kind).key!==d.key||!descriptor(kind).enabled)return;
      retryAfter[kind]={key:d.key,until:now()+5*60000};
      send(kind,{...(cached||{label:d.label,samples:[]}),error:true});console.log(kind+' refresh: '+error.message);
    }finally{if(inflight[kind]===d.key)delete inflight[kind];}
  }
  return {refresh:()=>Promise.all([refreshKind('weather'),refreshKind('tide')])};
}
