import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {moonDirection,moonFrame,mapMoonVector,moonPixelDistance} from '../shared/moon.js';
import {defaults,validateSettings} from '../shared/settings.js';
import {encodeSettings,zoneExists} from '../shared/protocol.js';
import {mapPoint,direction} from '../shared/map.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b)/Math.hypot(...a)/Math.hypot(...b))))*180/Math.PI;
test('the Moon’s subpoint follows independent JPL Horizons ephemerides through a year',()=>{
  const fixture=JSON.parse(readFileSync('tests/fixtures/moon-subpoint.json'));
  // A deliberately small spherical model, not navigation-grade ephemerides.
  // 0.5° covers omitted terms, UTC/TT, oblateness and light-time differences;
  // the map itself has coarser (roughly 2°) pixels.
  for(const [iso,lon,lat] of fixture.samples){
    const moon=moonDirection(new Date(iso));assert(Math.abs(Math.hypot(...moon)-1)<1e-10);
    assert(angle(moon,direction(lat,lon))<.5,iso);
  }
});
test('watch single-precision lunar coordinates match the browser across seasons and years',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/moon-test.c','watchface/src/c/solar.c','-o','test-results/moon-test']);
  const times=[];for(const year of [2026,2027,2030,2035])for(let day=0;day<366;day+=3)for(const hour of [0,7,13,21])times.push(Date.UTC(year,0,1+day,hour,17)/1000);
  const native=execFileSync('test-results/moon-test',{input:times.join('\n'),encoding:'utf8'}).trim().split('\n').map(r=>r.split(' ').map(Number));
  times.forEach((t,i)=>{assert(Math.abs(Math.hypot(...native[i])-1)<.00001);assert(angle(native[i],moonDirection(new Date(t*1000)))<.06,new Date(t*1000).toISOString());});
});
test('the nearest baked map pixel follows the Moon, and rotation preserves its geographic direction',()=>{
  const bytes=new Int8Array(readFileSync('watchface/resources/maps/map-0.bin'));
  for(let day=0;day<30;day++)for(const hour of [0,5,11,17,23]){
    const date=new Date(Date.UTC(2026,8,1+day,hour)),d=moonDirection(date),v=mapMoonVector(date);let best=Infinity,index=-1;
    for(let i=0;i<bytes.length;i+=4)if(bytes[i+3]&3){const dist=moonPixelDistance(bytes,i,v);if(dist<best){best=dist;index=i;}}
    assert(angle(d,[...bytes.slice(index,index+3)])<2.5,date.toISOString());
    const p=[(index/4)%200,Math.floor(index/800)],rot=mapPoint(p,180);
    assert.deepEqual(mapPoint(rot,180),p);assert.deepEqual(rot,[199-p[0],103-p[1]]);
  }
});
test('map Moon and 180° rotation are independent settings, preserving the top-bar phase',()=>{
  const old=defaults();delete old.mapMoon;delete old.mapRotation;
  const migrated=validateSettings(old,zoneExists);assert.equal(migrated.mapMoon,false);assert.equal(migrated.mapRotation,0);
  for(const moonIndicator of [true,false])for(const mapMoon of [true,false])for(const mapRotation of [0,180]){
    const s=validateSettings({...defaults(),moonIndicator,mapMoon,mapRotation},zoneExists),packet=encodeSettings(s);
    assert.equal(packet[0],8);assert.equal(!!(packet[2]&32),mapMoon);assert.equal(packet[4],mapRotation===180?2:0);assert.equal(!!packet[33],moonIndicator);
  }
  for(const mapRotation of [1,90,360,'180'])assert.throws(()=>validateSettings({...defaults(),mapRotation},zoneExists));
  assert.throws(()=>validateSettings({...defaults(),mapMoon:1},zoneExists));
  for(const [date,phase] of [['2026-09-11T03:27Z',0],['2026-09-18T20:44Z',2],['2026-09-26T16:49Z',4],['2026-10-03T13:25Z',6]])assert.equal(moonFrame(new Date(date)),phase);
});
