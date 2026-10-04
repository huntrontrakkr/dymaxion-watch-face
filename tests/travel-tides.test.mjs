import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {encodeFooter} from '../shared/panel-protocol.js';
import {travelTides} from '../tools/travel-tides.js';
import {environmentService} from '../tools/environment-service.js';
import {positionProvider} from '../tools/device-position.js';
const read=name=>JSON.parse(readFileSync('tests/fixtures/'+name+'.json'));
const meta=read('nearby-tide-meta'),hourly=read('nearby-tide-hourly'),extrema=read('nearby-tide-extrema');
const east={station:'8638660',label:'PORTSMO',tz:'America/New_York'},west={station:'9414290',label:'SFO BAY',tz:'America/Los_Angeles'};
const fix=(latitude,longitude)=>({coords:{latitude,longitude}});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
function setup(){
  const s=defaults();s.footer.pages=['tide'];s.footer.home='tide';
  let time=meta.capturedAt,position=fix(36.85,-76.29),fixes=0,lookups=0,fail=false,blocked=false;
  const storage=memory(),sent=[],requests=[];
  const getPosition=async()=>{fixes++;if(blocked)throw Error('Location denied');return position;};
  const lookup={nearby:async p=>{lookups++;if(fail)throw Error('Offline');return p.lat>50?[]:[p.lon< -100?west:east];},resolve:async s=>s};
  const options={getSettings:()=>s,storage,now:()=>time,getPosition,stationLookup:lookup,
    send:(kind,data)=>{if(kind==='tide')sent.push(data);},getJSON:async url=>{requests.push(url);return url.includes('marine-api')?model(url):url.includes('interval=hilo')?extrema:hourly;}};
  // Open-Meteo's modelled sea level: a semidiurnal tide around the requested point.
  const model=url=>{const q=new URL(url).searchParams,first=Math.floor(time/3600000)*3600-24*3600;
    return {latitude:+q.get('latitude')+.04,longitude:+q.get('longitude'),hourly:{time:Array.from({length:120},(_,i)=>first+i*3600),sea_level_height_msl:Array.from({length:120},(_,i)=>+(1.2*Math.cos(2*Math.PI*(i-4)/12.42)).toFixed(3))}};};
  return {s,options,sent,requests,lookup,storage,latest:()=>sent.at(-1),advance:ms=>time+=ms,move:p=>position=p,
    fail:v=>fail=v,block:v=>blocked=v,counts:()=>({fixes,lookups}),create:()=>environmentService(options)};
}
test('automatic tides are the default, migrate old settings, and retain the fixed option',()=>{
  const s=defaults();assert.equal(s.footer.tide.mode,'auto');assert.equal(encodeFooter(s)[53],1);
  delete s.footer.tide.mode;assert.equal(validateSettings(s,zoneExists).footer.tide.mode,'auto');
  s.footer.tide.mode='fixed';assert.equal(encodeFooter(validateSettings(s,zoneExists))[53],0);
  s.footer.tide.mode='gps';assert.throws(()=>validateSettings(s,zoneExists),/mode/);
});
test('a flight selects a new station and refetches its tides inside the six-hour prediction cache',async()=>{
  const h=setup(),service=h.create();await service.refresh();
  assert.equal(h.latest().label,'PORTSMO');assert.equal(h.requests.length,2);
  assert(h.requests.every(url=>url.includes('station=8638660')));
  const eastHour=h.latest().samples[0].hour;
  await service.refresh();assert.deepEqual(h.counts(),{fixes:1,lookups:1});assert.equal(h.requests.length,2);
  h.move(fix(37.8,-122.4));h.advance(61*60000);await service.refresh();
  assert.equal(h.latest().label,'SFO BAY');assert(h.requests.slice(2).every(url=>url.includes('station=9414290')));
  assert.equal(h.requests.length,4);assert.equal(h.latest().samples[0].hour,(eastHour+1-3+24)%24,'hours use the new station’s zone');
  h.advance(61*60000);await service.refresh();assert.deepEqual(h.counts(),{fixes:3,lookups:3});
  assert.equal(h.requests.length,4,'hourly location checks reuse six-hour predictions');
  assert.equal(h.s.footer.tide.station,'','runtime selection never overwrites a pinned station in settings');
  await h.create().refresh();assert.deepEqual(h.counts(),{fixes:3,lookups:3});assert.equal(h.requests.length,4,'restart reuses fresh station and tide caches');
});
test('outside NOAA coverage the tides are modelled at the new position, never the previous coast',async()=>{
  const h=setup(),service=h.create();await service.refresh();h.move(fix(51.5123,0.0456));h.advance(61*60000);await service.refresh();
  assert.equal(h.requests.length,3);assert.match(h.requests[2],/marine-api\.open-meteo\.com.*latitude=51\.51&longitude=0\.05/);
  const d=h.latest();assert.equal(d.label,'TIDE');assert.equal(d.model,true);assert.equal(d.samples.length,49);assert(!d.error);
  assert(d.events.length>=6&&d.events.some(e=>e.high)&&d.events.some(e=>!e.high));
});
test('modelled tides refuse a sea cell far from the requested place',async()=>{
  const h=setup(),first=Math.floor(meta.capturedAt/3600000)*3600-3600,errors=[],log=console.log;
  h.options.getJSON=async url=>{h.requests.push(url);return {latitude:50.9,longitude:0,hourly:{time:Array.from({length:96},(_,i)=>first+i*3600),sea_level_height_msl:Array.from({length:96},(_,i)=>Math.cos(i/2))}};};
  console.log=m=>errors.push(m);
  Object.assign(h.s.footer.tide,{mode:'fixed',point:{lat:51.5,lon:0},label:'LONDON',tz:'Europe/London'});
  try{await h.create().refresh();}finally{console.log=log;}
  assert.equal(h.latest().error,true);assert.equal(h.latest().samples.length,0);assert.match(errors.join(),/over 50 km/);
});
test('denied location marks cached tides old; a failed lookup after a known move clears them',async()=>{
  const h=setup(),service=h.create();await service.refresh();h.advance(61*60000);h.block(true);await service.refresh();
  assert.equal(h.latest().label,'PORTSMO');assert.equal(h.latest().error,true);assert.equal(h.latest().samples.length,49);
  await service.refresh();assert.equal(h.counts().fixes,2,'failing fixes back off for 15 minutes');
  h.advance(16*60000);h.block(false);h.move(fix(37.8,-122.4));h.fail(true);await service.refresh();
  assert.deepEqual(h.latest(),{label:'TIDE',samples:[],error:true});assert.equal(h.requests.length,2);
  h.advance(16*60000);h.fail(false);await service.refresh();assert.equal(h.latest().label,'SFO BAY');assert(!h.latest().error);
});
test('fixed stations and disabled tide pages never request automatic location or NOAA metadata',async()=>{
  const h=setup(),service=h.create();Object.assign(h.s.footer.tide,east,{mode:'fixed'});await service.refresh();
  assert.equal(h.latest().label,'PORTSMO');assert.deepEqual(h.counts(),{fixes:0,lookups:0});
  h.move(fix(37.8,-122.4));h.advance(61*60000);await service.refresh();assert.equal(h.requests.length,2);
  h.s.footer.tide.mode='auto';h.s.footer.pages=['zones'];h.s.footer.home='zones';await service.refresh();
  h.s.footer.pages=['tide'];h.s.footer.enabled=false;await service.refresh();assert.deepEqual(h.counts(),{fixes:0,lookups:0});
});
test('late automatic station or forecast responses cannot replace a subsequently pinned station',async()=>{
  const h=setup();let resolve;
  h.options.stationLookup={nearby:()=>new Promise(r=>resolve=r),resolve:async s=>s};
  const service=h.create(),old=service.refresh();while(!resolve)await new Promise(r=>setImmediate(r));
  Object.assign(h.s.footer.tide,west,{mode:'fixed'});await service.refresh();resolve([east]);await old;
  assert.equal(h.latest().label,'SFO BAY');assert(h.requests.every(url=>url.includes('station=9414290')));
  // A pending NOAA request also has to lose ownership when the mode changes.
  const q=setup(),pending=[];q.options.getJSON=url=>url.includes('station=8638660')?new Promise(r=>pending.push(()=>r(url.includes('interval=hilo')?extrema:hourly))):Promise.resolve(url.includes('interval=hilo')?extrema:hourly);
  const svc=q.create(),first=svc.refresh();while(pending.length<2)await new Promise(r=>setImmediate(r));
  Object.assign(q.s.footer.tide,west,{mode:'fixed'});await svc.refresh();pending.forEach(r=>r());await first;
  assert.equal(q.latest().label,'SFO BAY');assert(!q.sent.some(d=>d.label==='PORTSMO'&&d.samples.length));
});
test('travel tides share the phone’s coarse position request and reject corrupt cached selections',async()=>{
  const h=setup();let fixes=0;
  const getPosition=positionProvider({getPosition:async()=>{fixes++;return fix(36.85,-76.29);},now:h.options.now});
  h.storage.setItem('dymaxion-travel-tide-v2',JSON.stringify({checked:meta.capturedAt,position:{lat:91,lon:0},station:west}));
  const travel=travelTides({...h.options,getPosition,lookup:h.lookup});
  await Promise.all([getPosition(),travel.refresh(),travel.refresh()]);assert.equal(fixes,1);assert.equal(travel.current().station.station,east.station);
});
