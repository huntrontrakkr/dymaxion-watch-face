// Simulate a warm day using the shipped companion and recorded providers.
// Usage: TZ=America/New_York node tools/profile-companion.mjs [bundle.js]
// REQUEST=2 is routine on the spike; the baseline ignores its value.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {defaults} from '../shared/settings.js';
const read=n=>JSON.parse(readFileSync('tests/fixtures/'+n+'.json'));
const meta=read('environment-meta'),code=readFileSync(process.argv[2]||'watchface/src/pkjs/index.js','utf8');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function profile(name,change,ackDelay=5){
 let now=meta.capturedAt,net=0,fixes=0,records=[],logs=[];const seen=new Map(),handlers={},store=new Map();
 const settings=defaults();change(settings);store.set('dymaxion-settings-v1',JSON.stringify(settings));
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 class XHR{
  open(method,url){this.url=url;}
  send(){net++;setTimeout(()=>{this.status=200;this.responseText=JSON.stringify(this.url.includes('photon.')?read('city-norfolk'):this.url.includes('open-meteo')?read('weather'):read(this.url.includes('interval=hilo')?'tide-extrema':'tide-hourly'));this.onload();},25);}
 }
 const context={console:{log:x=>logs.push(x)},Date:Clock,Math,Uint8Array,DataView,Array,Object,JSON,Number,String,RegExp,parseInt,parseFloat,isNaN,isFinite,decodeURIComponent,encodeURIComponent,setTimeout,clearTimeout,Intl,XMLHttpRequest:XHR,
  navigator:{geolocation:{getCurrentPosition:success=>{fixes++;setTimeout(()=>success({coords:{latitude:36.85,longitude:-76.29}}),1);}}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  Pebble:{addEventListener:(n,fn)=>handlers[n]=fn,openURL:()=>{},sendAppMessage:(message,success)=>{
   const key=Object.keys(message).join('+'),payload=JSON.stringify(message),bytes=Object.values(message).reduce((n,a)=>n+a.length,0);
   records.push({key,bytes,duplicate:seen.get(key)===payload});seen.set(key,payload);setTimeout(success,ackDelay);
  }}};
 vm.runInNewContext(code,context);handlers.ready();await pause(200);records=[];net=fixes=0;
 for(let hour=1;hour<=24;hour++){now=meta.capturedAt+hour*3600000;handlers.appmessage({payload:{REQUEST:2}});await pause(150);}
 const counts={};for(const r of records){const c=counts[r.key]??={messages:0,duplicate:0,bytes:0};c.messages++;c.duplicate+=+r.duplicate;c.bytes+=r.bytes;}
 return {name,hours:24,ackDelayMs:ackDelay,networkRequests:net,locationFixes:fixes,messages:records.length,duplicateMessages:records.filter(r=>r.duplicate).length,payloadBytes:records.reduce((n,r)=>n+r.bytes,0),counts,logs};
}
const results=[];
results.push(await profile('default hourly weather, automatic city',()=>{}));
results.push(await profile('hourly weather and six-hour tides, automatic city',s=>{s.footer.pages.push('tide');Object.assign(s.footer.tide,meta.station);}));
results.push(await profile('two-hour weather, automatic city (watch still asks hourly)',s=>s.footer.weather.refreshMinutes=120));
console.log(JSON.stringify(results,null,2));
