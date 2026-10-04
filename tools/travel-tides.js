import {tideStationLookup,tideDistance} from '../shared/tide-stations.js';
import moment from 'moment-timezone';
// Share the existing hourly phone wake and coarse location fix. Station
// selection changes immediately on relocation; predictions still cache for 6h.
// Without a NOAA station within reach, the tides are Open-Meteo's model at the
// phone's position (to about a kilometre) on the phone's clock.
export function travelTides({getSettings,getPosition,getJSON,storage,now=Date.now,lookup=tideStationLookup({getJSON,storage,now}),getTimeZone=()=>moment.tz.guess(true)||'Etc/UTC'}){
  const key='dymaxion-travel-tide-v2';let saved=null,pending=null,retryAfter=0,generation=0,signature='',error=false;
  const enabled=()=>{const f=getSettings().footer;return f.enabled&&f.pages.includes('tide')&&f.tide.mode==='auto';};
  try{
    const s=JSON.parse(storage?.getItem(key)||'null');
    if(s&&Number.isFinite(s.checked)&&s.checked<=now()&&now()-s.checked<86400000&&Number.isFinite(s.position?.lat)&&Math.abs(s.position.lat)<=90&&Number.isFinite(s.position?.lon)&&Math.abs(s.position.lon)<=180&&(s.station===null||s.station&&(typeof s.station.station==='string'&&/^[A-Z0-9]{7}$/.test(s.station.station)||Number.isFinite(s.station.point?.lat)&&Math.abs(s.station.point.lat)<=90&&Number.isFinite(s.station.point?.lon)&&Math.abs(s.station.point.lon)<=180)&&typeof s.station.label==='string'&&/^[A-Z0-9 -]{1,7}$/.test(s.station.label)&&typeof s.station.tz==='string'&&moment.tz.zone(s.station.tz)))saved=s;
  }catch{}
  function refresh(){
    const f=getSettings().footer,next=JSON.stringify([enabled(),f.tide.mode]);
    if(next!==signature){signature=next;generation++;pending=null;retryAfter=0;error=false;}
    if(!enabled())return Promise.resolve();
    if(pending)return pending;
    if(now()<retryAfter||saved&&now()>=saved.checked&&now()-saved.checked<3600000)return Promise.resolve();
    const token=generation;let position=null;
    const active=()=>token===generation&&enabled();
    const job=Promise.resolve().then(async()=>{
      try{
        const c=(await getPosition())?.coords;
        if(!active())return;
        if(!Number.isFinite(c?.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180)throw new Error('Location unavailable.');
        position={lat:+c.latitude.toFixed(3),lon:+c.longitude.toFixed(3)};
        const nearby=await lookup.nearby(position);if(!active())return;
        const station=nearby.length?await lookup.resolve(nearby[0]):{point:{lat:+position.lat.toFixed(2),lon:+position.lon.toFixed(2)},label:'TIDE',tz:getTimeZone()};if(!active())return;
        saved={position,station,checked:now()};error=false;retryAfter=0;
        try{storage?.setItem(key,JSON.stringify(saved));}catch{}
      }catch{
        if(!active())return;
        // Never label predictions from the previous coast as local after a
        // known move. If the fix itself failed, retain data explicitly OLD.
        if(position&&(!saved||tideDistance(saved.position,position)>20))saved=null;
        error=true;retryAfter=now()+15*60000;
      }finally{if(token===generation)pending=null;}
    });pending=job;return job;
  }
  return {refresh,current:()=>({station:enabled()?saved?.station:null,error})};
}
