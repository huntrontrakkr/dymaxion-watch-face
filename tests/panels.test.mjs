import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {encodeFooter,encodeEnvironment} from '../shared/panel-protocol.js';
import {normalizeForecast,normalizeTide,dataWindow,tideUrls,environmentIsValid} from '../shared/panel-data.js';
import {calendarCells,usHoliday,isHoliday,HOLIDAY_REGIONS} from '../shared/calendar.js';
import {environmentService} from '../tools/environment-service.js';
const read=name=>JSON.parse(readFileSync('tests/fixtures/'+name+'.json','utf8'));
const meta=read('environment-meta'),rawWeather=read('weather'),hourly=read('tide-hourly'),extrema=read('tide-extrema');
const weather=normalizeForecast(rawWeather,meta.place,meta.capturedAt),tide=normalizeTide(hourly,extrema,meta.station,meta.capturedAt);
const clone=x=>JSON.parse(JSON.stringify(x));
test('footer settings migrate, constrain panel order, preserve ranges and station choices',()=>{
  const old=defaults();delete old.footer;const migrated=validateSettings(old,zoneExists);assert.equal(migrated.footer.home,'zones');
  for(const patch of [{pages:[]},{pages:['zones','zones']},{rotationMinutes:3},{horizon:0},{shake:'yes'},{flicks:4},{flicks:'2'},{tide:{station:'evil/url'}}])assert.throws(()=>validateSettings({...defaults(),footer:{...defaults().footer,...patch}},zoneExists));
  const s=defaults();s.footer.pages=['calendar','tide'];s.footer.home='calendar';s.footer.tide={...s.footer.tide,...meta.station};s.footer.colors.tide='#997744';
  const valid=validateSettings(s,zoneExists);assert.deepEqual(valid.footer.pages,['calendar','tide']);assert.equal(valid.footer.colors.tide,'#AA5555');assert.equal(valid.footer.tide.station,'8518750');
});
test('provider data keeps real units, timestamps and gaps instead of drawing false zeroes',()=>{
  assert.equal(weather.samples.length,49);assert.equal(tide.samples.length,49);assert(environmentIsValid(weather,'weather'));assert(environmentIsValid(tide,'tide'));
  const i=rawWeather.hourly.time.indexOf(weather.start);assert.equal(weather.samples[0].temperature,Math.round(rawWeather.hourly.temperature_2m[i]*10));
  assert.match(tideUrls(meta.station,meta.capturedAt)[0],/datum=MLLW/);assert.match(tideUrls(meta.station,meta.capturedAt)[0],/time_zone=gmt/);
  const missing=clone(rawWeather);missing.hourly.temperature_2m[i]=null;assert.throws(()=>normalizeForecast(missing,meta.place,meta.capturedAt),/missing/);
  const gap=clone(rawWeather);gap.hourly.time.splice(i+1,1);assert.throws(()=>normalizeForecast(gap,meta.place,meta.capturedAt),/incomplete/);
  const fractional=clone(rawWeather);fractional.hourly.time=fractional.hourly.time.map(t=>t+900);
  const kathmandu=normalizeForecast(fractional,{...meta.place,tz:'Asia/Kathmandu'},meta.capturedAt);
  assert.equal(kathmandu.start%3600,900);assert(kathmandu.start<=meta.capturedAt/1000);
  assert.equal(kathmandu.samples.length,49,'fractional-hour locations retain a full forecast');
  assert.throws(()=>normalizeTide({error:{message:'Only high/low available'}},extrema,meta.station,meta.capturedAt),/high\/low/);
  assert.equal(dataWindow(weather,(weather.start+49*3600)*1000,24),null);assert.equal(dataWindow(weather,(weather.start+47*3600)*1000,24).short,true);
  const bad=clone(weather);bad.samples[0].humidity=512;assert.throws(()=>encodeEnvironment(bad,'weather'));
});
test('environment refresh caches, rate limits failures and discards responses for a previous location',async()=>{
  let s=defaults(),now=meta.capturedAt,calls=0,fail=false;const messages=[],store=new Map();
  s.footer.weather.place=0;
  s.footer.tide={...s.footer.tide,...meta.station};
  const service=environmentService({getSettings:()=>s,now:()=>now,storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},send:(kind,data)=>messages.push({kind,data}),getJSON:async url=>{calls++;if(fail)throw new Error('Offline');return url.includes('open-meteo')?rawWeather:url.includes('interval=hilo')?extrema:hourly;}});
  // The tide panel is optional; with it in the rotation, NOAA predictions are fetched.
  s.footer.pages=[...s.footer.pages,'tide'];
  await service.refresh();assert.equal(calls,3);assert(messages.some(m=>m.kind==='tide'&&m.data.samples.length===49));
  await service.refresh();assert.equal(calls,3,'fresh data must not cause more requests');
  s.footer.tide.unit='ft';s.footer.tide.scale='fixed';s.footer.horizon=12;
  await service.refresh();assert.equal(calls,3,'display changes reuse the NOAA cache');
  now+=61*60000;fail=true;await service.refresh();assert.equal(calls,4);assert(messages.some(m=>m.kind==='weather'&&m.data.error&&m.data.samples.length===49));
  await service.refresh();assert.equal(calls,4,'network failures have a five-minute backoff');
  let resolve;const pending=[],race=environmentService({getSettings:()=>s,now:()=>meta.capturedAt,storage:{getItem:()=>null,setItem:()=>{}},send:(kind,data)=>pending.push({kind,data}),getJSON:()=>new Promise(r=>{resolve=r;})});
  s.footer.pages=['weather'];s.footer.home='weather';const work=race.refresh();s.places[0]={...s.places[1]};resolve(rawWeather);await work;
  assert(!pending.some(m=>m.data.samples?.length),'an old location must never overwrite the new one');
});
test('native panels validate actual provider packets and guard wrist flicks',()=>{
  mkdirSync('test-results',{recursive:true});const s=defaults();s.footer.tide={...s.footer.tide,...meta.station};
  writeFileSync('test-results/footer.bin',encodeFooter(s));writeFileSync('test-results/weather.bin',encodeEnvironment(weather,'weather'));writeFileSync('test-results/tide.bin',encodeEnvironment(tide,'tide'));
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/panels-test.c','watchface/src/c/panel_data.c','watchface/src/c/settings.c','-o','test-results/panels-test']);
  execFileSync('test-results/panels-test',['test-results/footer.bin','test-results/weather.bin','test-results/tide.bin']);
  for(const iso of ['2026-12-30','2027-01-01','2028-02-29','2026-03-08','2026-11-01','2027-06-19','2021-12-31'])for(const weekStart of [0,1,6])for(const weeks of ['current-next','previous-current']){
    const d=new Date(iso+'T12:00:00Z'),cfg={...s.footer.calendar,weekStart,weeks,holidays:'us'};
    const expected=calendarCells(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),cfg).map(c=>[c.year,c.month+1,c.day,c.weekday,+c.today,+c.holiday].join(','));
    const native=execFileSync('test-results/panels-test',['calendar',String(d.getUTCFullYear()),String(d.getUTCMonth()+1),String(d.getUTCDate()),String(d.getUTCDay()),String(weekStart),weeks==='previous-current'?'1':'0','1'],{encoding:'utf8'}).trim().split('\n');assert.deepEqual(native,expected,iso);
  }
  assert.equal(usHoliday(2021,11,31),true);assert.equal(usHoliday(2027,5,18),true);assert.equal(usHoliday(2027,5,19),false);
  // Every region's holidays agree between browser and watch across leap years and Easter extremes.
  HOLIDAY_REGIONS.forEach(([region],index)=>{
    const expected=[];for(let t=Date.UTC(2024,0,1);t<Date.UTC(2031,0,1);t+=86400000){const x=new Date(t);if(isHoliday(region,x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate()))expected.push(x.toISOString().slice(0,10));}
    const native=execFileSync('test-results/panels-test',['holidays',String(index),'2024','2030'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
    assert.deepEqual(native,expected,region);
  });
  // Spot checks against published 2026 calendars.
  for(const [region,iso] of [['ca','2026-05-18'],['ca','2026-04-03'],['mx','2026-03-16'],['uk','2026-08-31'],['uk','2026-04-06'],['de','2026-05-14'],['de','2026-10-03'],['fr','2026-05-25'],['fr','2026-07-14'],['au','2026-06-08'],['au','2026-01-26']])
    assert.equal(isHoliday(region,+iso.slice(0,4),+iso.slice(5,7)-1,+iso.slice(8)),true,region+' '+iso);
  assert.equal(isHoliday('uk',2026,5,4),false);assert.equal(isHoliday('none',2026,11,25),false);
});
