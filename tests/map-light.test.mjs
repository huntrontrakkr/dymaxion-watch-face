import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {sunDirection} from '../shared/solar.js';

// Relighting only the tiles that can change (map_light.c) must leave every map
// pixel exactly as the full per-pixel rule paints it, after every relight.
const sun=t=>sunDirection(new Date(t)).map(c=>Math.trunc(1024*c));
function relight(suns){
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-O2','-Iwatchface/src/c','tests/map-light-test.c','watchface/src/c/map_light.c','-o','test-results/map-light-test']);
  const out=execFileSync('test-results/map-light-test',['watchface/resources/maps/map-0.bin','watchface/resources/maps/map-light.bin'],{input:suns.map(s=>s.join(' ')).join('\n'),encoding:'utf8'}).trim().split('\n').map(l=>l.split(' ').map(Number));
  assert.equal(out.length,suns.length);
  out.forEach(([bad,,,,,flags],i)=>{assert.equal(bad,0,`relight ${i} (${suns[i]}): ${bad} pixels differ`);assert.equal(flags,0);});
  // Averages over the relights (the first line is the full paint).
  const rest=out.slice(1),mean=k=>rest.reduce((s,r)=>s+r[k],0)/rest.length;
  return {reads:mean(1),bytes:mean(2),dots:mean(3),painted:mean(4)};
}
test('five-minute relights across the seasons match the full paint, reading a fraction of the map',()=>{
  const suns=[];
  for(const day of [Date.UTC(2026,2,20),Date.UTC(2026,5,21),Date.UTC(2026,11,21)])for(let t=day;t<day+3*864e5;t+=3e5)suns.push(sun(t));
  const m=relight(suns);
  // A full rebuild reads 83,200 bytes and lights 20,800 pixels.
  assert.ok(m.bytes<20000,`${m.bytes} bytes`);assert.ok(m.dots<3000,`${m.dots} dot products`);
});
test('two-hourly relights over a year match the full paint',()=>{
  const suns=[];for(let t=Date.UTC(2026,0,1);t<Date.UTC(2027,0,1);t+=2*3600e3)suns.push(sun(t));
  relight(suns);
});
test('arbitrary jumps of the Sun match the full paint',()=>{
  let seed=7;const rand=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const suns=[];
  for(let i=0;i<2000;i++){const z=2*rand()-1,a=2*Math.PI*rand(),r=Math.sqrt(1-z*z);suns.push([r*Math.cos(a),r*Math.sin(a),z].map(c=>Math.trunc(1024*c)));}
  relight(suns);
});
