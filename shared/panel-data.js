import moment from 'moment-timezone';
const HOUR=3600;
export const SAMPLE_COUNT=49;
const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export const localMinute=(epoch,tz)=>{const d=moment.unix(epoch).tz(tz);return d.hour()*60+d.minute();};
function times(raw){
  if(!Array.isArray(raw)||raw.length<2||raw.some((t,i)=>!integer(t,1,0xffffffff)||(i&&t!==raw[i-1]+HOUR)))throw new Error('The provider returned an incomplete hourly series.');
  return raw;
}
export function normalizeForecast(raw,place,now=Date.now()){
  const h=raw?.hourly,t=times(h?.time);
  // Provider hours follow the requested zone, including :30/:45 UTC offsets.
  const first=t.findIndex(stamp=>stamp<=now/1000&&stamp+HOUR>now/1000);
  if(first<0||t.length-first<SAMPLE_COUNT)throw new Error('The forecast does not cover the next 48 hours.');
  const start=t[first];
  const fields=[['temperature_2m',-100,65],['relative_humidity_2m',0,100],['precipitation_probability',0,100],['precipitation',0,500],['is_day',0,1]];
  const samples=Array.from({length:SAMPLE_COUNT},(_,i)=>{
    const j=first+i;
    for(const [key,min,max]of fields)if(!number(h[key]?.[j],min,max))throw new Error('The forecast has missing '+key+' values.');
    return {temperature:Math.round(h.temperature_2m[j]*10),humidity:Math.round(h.relative_humidity_2m[j]),probability:Math.round(h.precipitation_probability[j]),rain:Math.round(h.precipitation[j]*10),day:h.is_day[j]?1:0,hour:moment.unix(t[j]).tz(place.tz).hour()};
  });
  const next=key=>(raw.daily?.[key]||[]).find(t=>integer(t,1,0xffffffff)&&t>=now/1000)||0;
  const rise=next('sunrise'),set=next('sunset');
  return {kind:'weather',start,fetched:Math.floor(now/1000),label:place.label,rise,set,riseMinute:rise?localMinute(rise,place.tz):0,setMinute:set?localMinute(set,place.tz):0,samples,demo:false,error:false};
}
const noaaTime=t=>typeof t==='string'&&/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(t)?Date.parse(t.replace(' ','T')+':00Z')/1000:NaN;
export function normalizeTide(hourly,extrema,station,now=Date.now()){
  if(hourly?.error||extrema?.error)throw new Error(String(hourly?.error?.message||extrema?.error?.message||'NOAA could not provide predictions.'));
  if(!Array.isArray(hourly?.predictions)||!Array.isArray(extrema?.predictions))throw new Error('NOAA returned no tide predictions.');
  const list=hourly.predictions.map(p=>({time:noaaTime(p.t),height:typeof p.v==='string'&&p.v.trim()!==''?Number(p.v):NaN}));
  const t=times(list.map(p=>p.time)),start=Math.floor(now/3600000)*HOUR,first=t.indexOf(start);
  if(first<0||list.length-first<SAMPLE_COUNT)throw new Error('This NOAA station does not provide the required hourly predictions. Choose a harmonic station.');
  const samples=list.slice(first,first+SAMPLE_COUNT).map(p=>{
    if(!number(p.height,-30,30))throw new Error('NOAA returned an invalid tide height.');
    return {height:Math.round(p.height*100),hour:moment.unix(p.time).tz(station.tz).hour()};
  });
  const next=type=>extrema.predictions.filter(p=>p.type===type).map(p=>({time:noaaTime(p.t),height:typeof p.v==='string'&&p.v.trim()!==''?Number(p.v):NaN})).find(p=>p.time>=now/1000&&number(p.height,-30,30));
  const high=next('H'),low=next('L');
  if(!high||!low)throw new Error('NOAA returned no upcoming high and low tides.');
  return {kind:'tide',start,fetched:Math.floor(now/1000),label:station.label,station:station.station,high:high.time,low:low.time,highHeight:Math.round(high.height*100),lowHeight:Math.round(low.height*100),highMinute:localMinute(high.time,station.tz),lowMinute:localMinute(low.time,station.tz),samples,demo:false,error:false};
}
export function weatherUrl(place){
  return 'https://api.open-meteo.com/v1/forecast?latitude='+place.lat+'&longitude='+place.lon+'&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,is_day&daily=sunrise,sunset&forecast_days=4&timeformat=unixtime&timezone='+encodeURIComponent(place.tz);
}
export function tideUrls(station,now=Date.now()){
  const start=moment.utc(now).startOf('day').format('YYYYMMDD'),end=moment.utc(now).add(3,'days').format('YYYYMMDD');
  const base='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=DymaxionWatch&format=json&time_zone=gmt&units=metric&datum=MLLW&station='+encodeURIComponent(station.station)+'&begin_date='+start+'&end_date='+end;
  return [base+'&interval=h',base+'&interval=hilo'];
}
// Clearly labelled workshop examples. These are never fetched or sent by the phone.
export function sampleEnvironment(now=Date.now()){
  const start=Math.floor(now/3600000)*HOUR,first=new Date(start*1000).getHours(),next=h=>start+((h-first+24)%24)*HOUR;
  // Keyed to the local clock hour: daylight 07-19, warmest mid-afternoon.
  const weather={kind:'weather',start,fetched:Math.floor(now/1000),label:'TEMP',rise:next(7),set:next(19),riseMinute:6*60+42,setMinute:18*60+48,demo:true,error:false,
    samples:Array.from({length:SAMPLE_COUNT},(_,i)=>{const hour=(first+i)%24,wave=Math.sin((hour-9)/24*Math.PI*2);
      return {temperature:Math.round(210+55*wave),humidity:Math.round(64-18*wave),probability:Math.round(70*Math.exp(-(((i-14)/5)**2))),rain:Math.round(24*Math.exp(-(((i-14)/3)**2))),day:hour>=7&&hour<19?1:0,hour};})};
  const tide={kind:'tide',start,fetched:Math.floor(now/1000),label:'TIDE',station:'',high:start+3*HOUR,low:start+9*HOUR,highHeight:170,lowHeight:12,highMinute:540,lowMinute:915,demo:true,error:false,
    samples:Array.from({length:SAMPLE_COUNT},(_,i)=>({height:Math.round(85+80*Math.cos((i-3)*Math.PI/6.2)),hour:weather.samples[i].hour}))};
  return {weather,tide};
}
export function dataWindow(data,now,horizon){
  if(!data?.samples?.length)return null;
  const start=Math.max(0,Math.floor((now/1000-data.start)/HOUR)),samples=data.samples.slice(start,start+horizon+1);
  if(now/1000<data.start-HOUR||samples.length<2)return null;
  return {samples,start,span:samples.length-1,short:samples.length<horizon+1};
}
export function environmentIsValid(d,kind){
  if(!d||d.kind!==kind||!integer(d.start,1,0xffffffff)||!integer(d.fetched,1,0xffffffff)||typeof d.label!=='string'||!/^[A-Z0-9 +\-]{1,7}$/.test(d.label)||!Array.isArray(d.samples)||d.samples.length!==49)return false;
  if(kind==='weather')return ['rise','set'].every(k=>integer(d[k],0,0xffffffff))&&['riseMinute','setMinute'].every(k=>integer(d[k],0,1439))&&d.samples.every(p=>integer(p.temperature,-1000,650)&&integer(p.humidity,0,100)&&integer(p.probability,0,100)&&integer(p.rain,0,5000)&&integer(p.day,0,1)&&integer(p.hour,0,23));
  return ['high','low'].every(k=>integer(d[k],1,0xffffffff))&&['highMinute','lowMinute'].every(k=>integer(d[k],0,1439))&&['highHeight','lowHeight'].every(k=>integer(d[k],-3000,3000))&&typeof d.station==='string'&&/^([A-Z0-9]{7})?$/.test(d.station)&&d.samples.every(p=>integer(p.height,-3000,3000)&&integer(p.hour,0,23));
}
