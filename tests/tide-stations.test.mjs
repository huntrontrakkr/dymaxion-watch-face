import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import moment from 'moment-timezone';
import {referenceStations,nearbyTideStations,tideDistance,tideStationDetails,tideStationZone,tideStationLookup} from '../shared/tide-stations.js';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {encodeFooter,encodeEnvironment} from '../shared/panel-protocol.js';
import {environmentService} from '../tools/environment-service.js';
const read=name=>JSON.parse(readFileSync('tests/fixtures/'+name+'.json'));
const catalog=read('noaa-stations'),details=read('noaa-station-details'),norfolk={lat:36.85,lon:-76.29};
test('nearest suggestions require hourly reference predictions and usable coordinates',()=>{
  const first=catalog.stations.find(s=>s.id==='8638660');
  const stations=referenceStations({stations:[...catalog.stations,first,{...first,id:'0000000',type:'S',lat:norfolk.lat,lng:norfolk.lon},null,{...first,id:'bad/id?'},{...first,id:'0000001',lat:'36'},{...first,id:'0000002',lng:181},{...first,id:'0000003',name:''}]});
  assert.equal(stations.filter(s=>s.id===first.id).length,1);
  assert(!stations.some(s=>s.id.startsWith('000000')));
  const near=nearbyTideStations(stations,norfolk);
  assert.deepEqual(near.map(s=>s.id),['8638660','8638671','8639348','8638339','8638610']);
  assert(near[0].distanceKm>3&&near[0].distanceKm<3.3);
  assert.deepEqual(nearbyTideStations(stations,{lat:39.74,lon:-104.99}),[],'inland users are not assigned a remote coast');
  assert.deepEqual(nearbyTideStations(stations,{lat:51.5,lon:0}),[],'no NOAA coverage stays unset');
  assert.throws(()=>nearbyTideStations(stations,{lat:NaN,lon:0}),/location/);
  assert(tideDistance({lat:0,lon:179.9},{lat:0,lon:-179.9})<23,'antimeridian distances take the short route');
  assert.equal(nearbyTideStations([{id:'far',lat:0,lon:1.4},{id:'near',lat:0,lon:1.3}],{lat:0,lon:0}).length,1,'150 km cutoff');
});
test('station metadata supplies its local clock and a watch-safe label',()=>{
  const station=tideStationDetails(details,'8638660');
  assert.equal(station.tz,'America/New_York');assert.equal(station.label,'PORTSMO');
  assert.equal(tideStationDetails(details,'1611347').tz,'Pacific/Honolulu');
  assert.equal(tideStationDetails(details,'9459881').tz,'America/Anchorage');
  assert.equal(tideStationZone({state:'PR',timezonecorr:-4,observedst:false}),'America/Puerto_Rico');
  assert.equal(tideStationZone({state:'',timezonecorr:10,observedst:false}),'Etc/GMT-10');
  assert.equal(tideStationZone({state:'',timezonecorr:-7,observedst:false}),'Etc/GMT+7');
  assert.equal(moment.tz('2026-07-01',station.tz).utcOffset(),-240);
  assert.equal(moment.tz('2026-01-01',station.tz).utcOffset(),-300);
  for(const s of [{timezonecorr:-5},{timezonecorr:1,observedst:true},{timezonecorr:'-5',observedst:true}])assert.throws(()=>tideStationZone(s),/time zone/);
  assert.throws(()=>tideStationDetails({stations:[{...details.stations[0],tidal:false}]},'8638660'),/details/);
  const settings=defaults();Object.assign(settings.footer.tide,station);
  const saved=validateSettings(settings,zoneExists);
  assert.equal(saved.footer.tide.station,station.station);assert.equal(encodeFooter(saved)[41],1);
});
test('catalog and details coalesce requests, cache a week, recover from corruption and support offline reuse',async()=>{
  const cache=new Map(),storage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
  let now=1e12,calls=0;
  const getJSON=async url=>{calls++;return url.includes('?type=')?catalog:details;};
  const options={storage,now:()=>now,getJSON},lookup=tideStationLookup(options);
  await assert.rejects(lookup.nearby({lat:null,lon:0}),/location/);assert.equal(calls,0);
  const [a,b]=await Promise.all([lookup.nearby(norfolk),lookup.nearby(norfolk)]);assert.deepEqual(a,b);assert.equal(calls,1);
  await Promise.all([lookup.resolve(a[0]),lookup.resolve(a[0])]);assert.equal(calls,2);
  const offline=tideStationLookup({...options,getJSON:()=>assert.fail('fresh cache needs no network')});
  assert.deepEqual(await offline.nearby(norfolk),a);assert.equal((await offline.resolve(a[0])).station,a[0].id);
  now+=7*86400000;await lookup.nearby(norfolk);await lookup.resolve(a[0]);assert.equal(calls,4);
  cache.set('dymaxion-noaa-reference-stations-v1','bad JSON');
  assert.equal((await tideStationLookup(options).nearby(norfolk))[0].id,a[0].id);assert.equal(calls,5);
  const broken=tideStationLookup({storage:null,getJSON:async()=>({stations:[]})});
  await assert.rejects(broken.nearby(norfolk),/no hourly/);
  await assert.rejects(broken.resolve({id:'../bad'}),/Invalid/);
  let attempt=0;const retry=tideStationLookup({storage:null,getJSON:async()=>{if(!attempt++)throw Error('offline');return catalog;}});
  await assert.rejects(retry.nearby(norfolk),/offline/);assert.equal((await retry.nearby(norfolk))[0].id,a[0].id);
});
test('a resolved nearby station delivers actual NOAA hourly and high/low data through the phone packet',async()=>{
  const meta=read('nearby-tide-meta'),settings=defaults(),messages=[],urls=[];
  settings.footer.pages=['tide'];settings.footer.home='tide';Object.assign(settings.footer.tide,tideStationDetails(details,'8638660'));
  const service=environmentService({getSettings:()=>settings,now:()=>meta.capturedAt,storage:null,getPosition:()=>assert.fail('a saved tide station needs no location tracking'),send:(kind,data)=>messages.push({kind,data}),getJSON:async url=>{urls.push(new URL(url));return read(url.includes('interval=hilo')?'nearby-tide-extrema':'nearby-tide-hourly');}});
  await service.refresh();const tide=messages.findLast(m=>m.kind==='tide').data;
  assert.equal(urls.length,2);assert(urls.every(u=>u.searchParams.get('station')==='8638660'));
  assert.equal(tide.samples.length,49);assert.equal(tide.error,false);assert.equal(tide.label,'PORTSMO');
  const packet=encodeEnvironment(tide,'tide');assert.equal(packet.length,284);
  // Every high and low in the two days the samples cover rides along, in order.
  const hilo=read('nearby-tide-extrema').predictions.filter(p=>{const t=Date.parse(p.t.replace(' ','T')+':00Z')/1000;return t>=tide.start&&t<=tide.start+48*3600;});
  assert(hilo.length>=7&&tide.events.length===Math.min(10,hilo.length));
  assert.deepEqual(tide.events.map(e=>e.high),hilo.slice(0,10).map(p=>p.type==='H'));
  assert.equal(packet[44],tide.events.length);
  const view=new DataView(packet.buffer);
  tide.events.forEach((e,i)=>{const at=view.getUint16(244+i*4,true);assert.equal(at&0x7fff,Math.round((e.time-tide.start)/60));assert.equal(!!(at&0x8000),e.high);assert.equal(view.getInt16(246+i*4,true),e.height);});
  assert.equal(Buffer.from(packet.subarray(36,43)).toString(),'8638660');
  await service.refresh();assert.equal(urls.length,2,'six-hour tide cache is preserved');
});
test('the tide header lists the next high and low, soonest first, from the events once the saved ones pass',async()=>{
  const {nextTides}=await import('../shared/panel-data.js');
  const H=3600,start=1_800_000_000,samples=Array.from({length:49},(_,i)=>({height:0,hour:(5+i)%24}));
  const d={start,high:start+2*H,low:start+8*H+30*60,highMinute:7*60,lowMinute:13*60+30,samples,
    events:[{time:start+2*H,height:150,high:true},{time:start+8*H+30*60,height:10,high:false},{time:start+14*H+45*60,height:160,high:true},{time:start+21*H,height:5,high:false}]};
  assert.deepEqual(nextTides(d,start).map(t=>[t.high,t.minute]),[[true,420],[false,810]]);
  // The saved high has passed: the next one comes from the events, at its local time.
  assert.deepEqual(nextTides(d,start+3*H).map(t=>[t.high,t.minute]),[[false,810],[true,19*60+45]]);
  assert.deepEqual(nextTides(d,start+15*H).map(t=>[t.high,t.minute]),[[false,2*60]],'no high left in the data: only the low');
  assert.deepEqual(nextTides({...d,events:undefined},start+9*H),[]);
});
test('tides saved before highs and lows rode along are refetched at once, not kept for six hours',async()=>{
  const meta=read('nearby-tide-meta'),settings=defaults(),messages=[],urls=[],store=new Map();
  settings.footer.pages=['tide'];settings.footer.home='tide';Object.assign(settings.footer.tide,tideStationDetails(details,'8638660'));
  const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  const make=()=>environmentService({getSettings:()=>settings,now:()=>meta.capturedAt,storage,getPosition:()=>null,send:(kind,data)=>messages.push({kind,data}),getJSON:async url=>{urls.push(url);return read(url.includes('interval=hilo')?'nearby-tide-extrema':'nearby-tide-hourly');}});
  await make().refresh();assert.equal(urls.length,2);
  // What an older phone app saved: the same data without its events.
  const saved=JSON.parse(store.get('dymaxion-environment-tide'));delete saved.data.events;store.set('dymaxion-environment-tide',JSON.stringify(saved));
  messages.length=0;await make().refresh();
  assert.equal(urls.length,4,'the old data is fetched again');
  assert(messages.filter(m=>m.kind==='tide').at(-1).data.events.length>0,'and the watch gets the highs and lows');
  await make().refresh();assert.equal(urls.length,4,'complete data keeps its six-hour cache');
});
