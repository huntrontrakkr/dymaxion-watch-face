import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {cityText,reverseCity,encodeCity,clockCaption} from '../shared/city.js';
import {textWidth} from '../shared/type.js';
import {locationService} from '../tools/location-service.js';
const fixture=JSON.parse(readFileSync('tests/fixtures/city-norfolk.json'));
const epoch=Date.UTC(2026,8,23,12),position={coords:{latitude:36.8508,longitude:-76.2859}};
test('current city uses the locality instead of a street or time zone, and fits both clock layouts',()=>{
  assert.equal(reverseCity(fixture),'Norfolk');
  assert.throws(()=>reverseCity({features:[{properties:{name:'A shop',type:'house',street:'High Street'}}]}));
  assert.equal(cityText('São José / Łódź'),'Sao Jose Lodz');
  assert.equal(validateSettings(defaults(),zoneExists).location.mode,'auto');
  const old=defaults();delete old.location;assert.equal(validateSettings(old,zoneExists).location.mode,'auto');
  const font=JSON.parse(readFileSync('designer/public/type/proofs.json')).draft.text.small,measure=t=>textWidth(font,t);
  assert.equal(clockCaption('Wed 23 Sep','Norfolk','',196,measure),'Wed 23 Sep / Norfolk');
  assert.equal(clockCaption('Wed 23 Sep','','AM',196,measure),'Wed 23 Sep / AM');
  for(const width of [68,196])for(const ampm of ['','AM','PM'])for(const city of ['Norfolk','San Francisco','Llanfairpwllgwyngyllgogerychwyrndrobwll','New York']){
    const text=clockCaption(width===68?'':'Wed 23 Sep',city,ampm,width,measure);assert(measure(text)<=width,text);
    if(ampm)assert(text.endsWith(ampm));assert(!text.includes('local'));
  }
});
test('city lookups are cached, back off on denial, expire offline, and ignore a late automatic result',async()=>{
  let s=defaults(),now=epoch,positions=0,requests=0,deny=false;const messages=[],cache=new Map();
  const service=locationService({getSettings:()=>s,now:()=>now,send:c=>messages.push(c),storage:{getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)},getPosition:async()=>{positions++;if(deny)throw new Error('Denied');return position;},getJSON:async url=>{requests++;assert(url.includes('lat=36.851&lon=-76.286'));return fixture;}});
  await Promise.all([service.refresh(),service.refresh()]);assert.equal(positions,1);assert.equal(requests,1);assert.equal(messages.at(-1).name,'Norfolk');
  now+=59*60000;await service.refresh();assert.equal(positions,1);
  now+=2*60000;deny=true;await service.refresh();assert.equal(positions,2);assert(messages.at(-1).stale);assert.equal(messages.at(-1).name,'Norfolk');
  await service.refresh();assert.equal(positions,2);assert(![...cache.values()][0].includes('latitude'));
  now=epoch+7*3600000;await service.refresh();assert.equal(messages.at(-1).name,'');
  s.location={mode:'manual',name:'Norfolk'};await service.refresh();assert(messages.at(-1).manual);assert.equal(positions,3);
  let finish;const sent=[];s=defaults();
  const race=locationService({getSettings:()=>s,storage:{getItem:()=>null,setItem:()=>{}},send:c=>sent.push(c),getPosition:()=>new Promise(r=>{finish=r;}),getJSON:async()=>fixture});
  const pending=race.refresh();await Promise.resolve();s.location={mode:'manual',name:'London'};await race.refresh();finish(position);await pending;
  assert.equal(sent.at(-1).name,'London');
});
test('the watch accepts the city packet and expires automatic names without expiring manual names',()=>{
  mkdirSync('test-results',{recursive:true});
  for(const manual of [false,true])writeFileSync(`test-results/city-${manual?'manual':'auto'}.bin`,encodeCity({name:'Norfolk',manual,fetched:epoch/1000}));
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/city-test.c','watchface/src/c/city.c','watchface/src/c/settings.c','-o','test-results/city-test']);
  execFileSync('test-results/city-test',['test-results/city-auto.bin','test-results/city-manual.bin']);
});
