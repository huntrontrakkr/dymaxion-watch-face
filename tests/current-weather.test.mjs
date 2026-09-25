import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import moment from 'moment-timezone';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {encodeFooter} from '../shared/panel-protocol.js';
import {environmentService} from '../tools/environment-service.js';
import {locationService} from '../tools/location-service.js';
import {positionProvider} from '../tools/device-position.js';
const read=name=>JSON.parse(readFileSync('tests/fixtures/'+name+'.json'));
const meta=read('environment-meta'),weather=read('weather');
const position={coords:{latitude:36.8508,longitude:-76.2859}};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function setup(overrides={}){
  const settings=defaults(),messages=[],cache=new Map();let now=meta.capturedAt;
  settings.footer.pages=['weather'];settings.footer.home='weather';
  const storage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
  const options={getSettings:()=>settings,now:()=>now,storage,send:(kind,data)=>{if(kind==='weather')messages.push(data);},getJSON:async()=>weather,getPosition:async()=>position,getTimeZone:()=> 'America/New_York',...overrides};
  return {settings,messages,cache,options,advance:ms=>now+=ms,service:environmentService(options)};
}
test('current location is the default; saved-city overrides survive validation and packet encoding',()=>{
  const s=defaults();assert.equal(s.footer.weather.place,'current');assert.equal(encodeFooter(s)[50],3);
  delete s.footer.weather.place;assert.equal(validateSettings(s,zoneExists).footer.weather.place,'current');
  for(const place of [0,1,2]){s.footer.weather.place=place;const saved=validateSettings(s,zoneExists);assert.equal(saved.footer.weather.place,place);assert.equal(encodeFooter(saved)[50],place);}
  for(const place of [-1,3,'0','gps']){s.footer.weather.place=place;assert.throws(()=>validateSettings(s,zoneExists));}
});
test('current weather follows phone coordinates and time zone, with no extra fixes for fresh forecasts',async()=>{
  let fixes=0,tz='America/New_York',coords=position;const urls=[];
  const h=setup({getPosition:async()=>{fixes++;return coords;},getTimeZone:()=>tz,getJSON:async url=>{urls.push(new URL(url));return weather;}});
  h.settings.location={mode:'manual',name:'MY CLOCK'};
  await Promise.all([h.service.refresh(),h.service.refresh()]);assert.equal(fixes,1);assert.equal(urls.length,1);
  assert.equal(urls[0].searchParams.get('latitude'),'36.851');assert.equal(urls[0].searchParams.get('longitude'),'-76.286');
  assert.equal(urls[0].searchParams.get('timezone'),tz);assert.equal(h.messages.at(-1).label,'TEMP');
  assert.equal(h.messages.at(-1).samples[0].hour,moment.unix(h.messages.at(-1).start).tz(tz).hour());
  h.settings.footer.weather.temperatureUnit='f';h.settings.places[0].lat=60;
  await h.service.refresh();assert.equal(fixes,1);assert.equal(urls.length,1);
  h.advance(61*60000);coords={coords:{latitude:37.5,longitude:-77.4}};
  await h.service.refresh();assert.equal(fixes,2);assert.equal(urls[1].searchParams.get('latitude'),'37.5');
  tz='Asia/Kathmandu';await h.service.refresh();assert.equal(fixes,3);assert.equal(urls[2].searchParams.get('timezone'),tz);
  assert.equal(h.messages.at(-1).samples[0].hour,moment.unix(h.messages.at(-1).start).tz(tz).hour());
});
test('permission denial never substitutes a saved city; valid current weather remains marked old',async()=>{
  let deny=false,fixes=0,requests=0;
  const h=setup({getPosition:async()=>{fixes++;if(deny)throw new Error('Location denied');return position;},getJSON:async()=>{requests++;return weather;}});
  await h.service.refresh();h.advance(61*60000);deny=true;
  await h.service.refresh();assert.equal(requests,1);assert.equal(h.messages.at(-1).error,true);assert.equal(h.messages.at(-1).samples.length,49);
  await h.service.refresh();assert.equal(fixes,2,'location failures back off for five minutes');
  const empty=setup({getPosition:async()=>{throw new Error('Location denied');},getJSON:async()=>{assert.fail('must not fall back to Place 1');}});
  await empty.service.refresh();assert.equal(empty.messages.at(-1).error,true);assert.deepEqual(empty.messages.at(-1).samples,[]);
  h.settings.footer.weather.place=1;await h.service.refresh();assert.equal(requests,2);assert.equal(fixes,2,'saved-city override needs no geolocation');
  assert.equal(h.messages.at(-1).label,h.settings.places[1].label);
  h.settings.footer.enabled=false;await h.service.refresh();assert.equal(requests,2);assert.equal(fixes,2);
});
test('current-source caches survive restart but cannot reuse saved-city forecasts',async()=>{
  const h=setup();await h.service.refresh();const next=[];
  const restart=environmentService({...h.options,send:(kind,data)=>{if(kind==='weather')next.push(data);},getPosition:async()=>assert.fail('fresh cache needs no fix')});
  await restart.refresh();assert.equal(next.at(-1).samples.length,49);
  const saved=JSON.parse(h.cache.get('dymaxion-environment-weather'));saved.key=JSON.stringify([h.settings.places[0].lat,h.settings.places[0].lon,h.settings.places[0].tz,h.settings.places[0].label]);
  h.cache.set('dymaxion-environment-weather',JSON.stringify(saved));
  const changed=environmentService({...h.options,send:(kind,data)=>{if(kind==='weather')next.push(data);},getPosition:async()=>{throw new Error('Denied');}});
  await changed.refresh();assert.equal(next.at(-1).error,true);assert.equal(next.at(-1).samples.length,0);
});
test('late location and forecast results cannot overwrite a different source or newer request',async()=>{
  const first=deferred(),last=deferred(),fetch=deferred();let fixes=0,requests=0;
  const h=setup({getPosition:()=>++fixes===1?first.promise:last.promise,getJSON:async()=>{requests++;return requests===1?fetch.promise:weather;}});
  const old=h.service.refresh();h.settings.footer.weather.place=0;const remote=h.service.refresh();
  h.settings.footer.weather.place='current';const current=h.service.refresh();
  first.resolve(position);await old;assert.equal(requests,1,'obsolete fix must not even fetch');
  last.resolve(position);await current;const latest=h.messages.at(-1);assert.equal(latest.label,'TEMP');
  fetch.resolve(weather);await remote;assert.equal(h.messages.at(-1),latest,'late remote forecast cannot replace current data');
  const pending=deferred(),disabled=setup({getPosition:()=>pending.promise,getJSON:async()=>assert.fail('disabled weather must not fetch')});
  const work=disabled.service.refresh();disabled.settings.footer.enabled=false;await disabled.service.refresh();pending.resolve(position);await work;
  assert.equal(disabled.messages.at(-1).samples.length,0);
});
test('city and weather share one coarse fix; a failed city lookup does not block weather',async()=>{
  let fixes=0,now=meta.capturedAt;const fix=deferred();
  const getPosition=positionProvider({getPosition:()=>{fixes++;return fix.promise;},now:()=>now});
  const h=setup({getPosition});
  const city=locationService({...h.options,getPosition,send:()=>{},getJSON:async()=>{throw new Error('City lookup offline');}});
  const jobs=Promise.all([h.service.refresh(),city.refresh()]);fix.resolve(position);await jobs;
  assert.equal(fixes,1);assert.equal(h.messages.at(-1).samples.length,49);
  await getPosition();assert.equal(fixes,1);now+=15*60000;await getPosition();assert.equal(fixes,2);
  let attempt=0;const bad=positionProvider({getPosition:async()=>++attempt===1?{coords:{latitude:NaN,longitude:0}}:position});
  await assert.rejects(bad(),/coordinates/);assert.deepEqual(await bad(),position);
});
