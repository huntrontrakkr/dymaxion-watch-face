// NOAA reference stations provide the hourly series used by the tide chart.
// Distance ranking stays on the phone; no user coordinates go to NOAA.
export const NOAA_METADATA='https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi';
export const NEARBY_TIDE_KM=150;
const WEEK=7*86400000;
const positionOk=p=>Number.isFinite(p?.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p?.lon)&&Math.abs(p.lon)<=180;
export function referenceStations(payload){
  const seen=new Set();
  return (Array.isArray(payload?.stations)?payload.stations:[]).flatMap(s=>{
    const p={lat:s?.lat,lon:s?.lng};
    if(s?.type!=='R'||typeof s.id!=='string'||!/^[A-Z0-9]{7}$/.test(s.id)||typeof s.name!=='string'||!s.name.trim()||!positionOk(p)||seen.has(s.id))return [];
    seen.add(s.id);
    return [{id:s.id,name:s.name.trim().slice(0,120),state:typeof s.state==='string'?s.state.slice(0,8):'',...p}];
  });
}
export function tideDistance(a,b){
  const r=Math.PI/180,lat=(b.lat-a.lat)*r,lon=(b.lon-a.lon)*r;
  const h=Math.sin(lat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(lon/2)**2;
  return 12742*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
export function nearbyTideStations(stations,position){
  if(!positionOk(position))throw new Error('Your current location is unavailable.');
  return stations.map(s=>({...s,distanceKm:tideDistance(position,s)}))
    .filter(s=>s.distanceKm<=NEARBY_TIDE_KM)
    .sort((a,b)=>a.distanceKm-b.distanceKm||a.id.localeCompare(b.id)).slice(0,5);
}
export function tideStationZone(s){
  const offset=s?.timezonecorr;
  if(!Number.isInteger(offset)||offset< -12||offset>14||typeof s.observedst!=='boolean')throw new Error('NOAA did not provide a usable station time zone. Choose it manually.');
  if(s.observedst){
    // NOAA's U.S. reference stations use these local standard offsets. IANA
    // handles the spring/fall changes; the phone's own zone is never substituted.
    const zone={'-4':'America/Halifax','-5':'America/New_York','-6':'America/Chicago','-7':'America/Denver','-8':'America/Los_Angeles','-9':'America/Anchorage','-10':'America/Adak'}[offset];
    if(!zone)throw new Error('Choose this station’s daylight-saving time zone manually.');
    return zone;
  }
  const local={HI:[-10,'Pacific/Honolulu'],PR:[-4,'America/Puerto_Rico'],VI:[-4,'America/St_Thomas'],GU:[10,'Pacific/Guam'],AS:[-11,'Pacific/Pago_Pago']}[s.state];
  return local&&local[0]===offset?local[1]:offset===0?'Etc/UTC':'Etc/GMT'+(offset>0?'-':'+')+Math.abs(offset);
}
export function tideStationDetails(payload,id){
  const s=payload?.stations?.find(s=>s.id===id);
  if(!s||s.tidal!==true||s.greatlakes||typeof s.name!=='string'||!s.name.trim())throw new Error('NOAA station details are unavailable. Choose another station.');
  const label=s.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 -]/g,' ').replace(/\s+/g,' ').trim().slice(0,7).trim()||'TIDE';
  return {station:id,name:s.name.trim().slice(0,120),label,tz:tideStationZone(s)};
}
async function loadJSON(url){
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),15000):null;
  try{
    const response=await fetch(url,{signal:controller?.signal});
    if(!response.ok)throw new Error('NOAA station lookup is unavailable.');
    return await response.json();
  }catch{
    throw new Error('NOAA station lookup is unavailable. Try again or choose a station manually.');
  }finally{if(timer!==null)clearTimeout(timer);}
}
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
export function tideStationLookup({getJSON=loadJSON,storage=browserStorage(),now=Date.now}={}){
  const memory=new Map(),pending=new Map();
  function cached(key){
    try{
      const entry=memory.get(key)||JSON.parse(storage?.getItem(key)||'null');
      if(entry&&Number.isFinite(entry.fetched)&&now()>=entry.fetched&&now()-entry.fetched<WEEK)return entry.data;
    }catch{}return null;
  }
  function remember(key,data){const entry={fetched:now(),data};memory.set(key,entry);try{storage?.setItem(key,JSON.stringify(entry));}catch{}return data;}
  function request(key,fetchData){
    if(pending.has(key))return pending.get(key);
    const job=Promise.resolve().then(fetchData).then(data=>remember(key,data)).finally(()=>pending.delete(key));
    pending.set(key,job);return job;
  }
  async function catalog(){
    const key='dymaxion-noaa-reference-stations-v1',saved=cached(key),old=referenceStations(saved);
    if(old.length)return old;
    const data=await request(key,async()=>{
      const stations=referenceStations(await getJSON(NOAA_METADATA+'/stations.json?type=tidepredictions'));
      if(!stations.length)throw new Error('NOAA returned no hourly tide stations.');
      // Cache only useful fields, rather than the roughly 2 MB full response.
      return {stations:stations.map(s=>({...s,type:'R',lng:s.lon}))};
    });
    return referenceStations(data);
  }
  return {
    async nearby(position){
      if(!positionOk(position))throw new Error('Your current location is unavailable.');
      return nearbyTideStations(await catalog(),position);
    },
    async resolve(station){
      if(!/^[A-Z0-9]{7}$/.test(station?.id||''))throw new Error('Invalid NOAA station.');
      const key='dymaxion-noaa-station-v1-'+station.id,saved=cached(key);
      if(saved){try{return tideStationDetails(saved,station.id);}catch{}}
      const data=await request(key,async()=>{
        const raw=await getJSON(NOAA_METADATA+'/stations/'+station.id+'.json');
        tideStationDetails(raw,station.id);return raw;
      });
      return tideStationDetails(data,station.id);
    }
  };
}
