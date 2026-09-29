import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {makeMap,direction,dot} from '../shared/map.js';
import {projectToMap} from '../shared/map-net.js';
import {sunDirection} from '../shared/solar.js';

// The pixel's own direction, and how far it lies from D in degrees.
// At the net's outer edge the pixel holding a point can have its centre just
// outside every triangle; then its nearest map pixel stands in.
const m=makeMap(),away=(p,D)=>{let best=180;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const r=m.inverse(p[0]+dx+.5,p[1]+dy+.5);if(r)best=Math.min(best,Math.acos(Math.min(1,dot(r[0],D)))*180/Math.PI);}return best;};
test('a projected direction lands on the pixel that holds it (at most a pixel from the nearest map pixel at the net\'s edge)',()=>{
  let worst=0;
  for(let la=-89;la<=89;la+=1.7)for(let lo=-180;lo<180;lo+=2.3){const D=direction(la,lo);worst=Math.max(worst,away(projectToMap(D),D));}
  assert.ok(worst<2.1,`worst ${worst.toFixed(2)} degrees`);
});
test('watch and previews project the Sun and the Moon to the same pixel',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/map-net-test.c','watchface/src/c/map_net.c','-o','test-results/map-net-test']);
  const dirs=[];
  for(let la=-89;la<=89;la+=3.1)for(let lo=-180;lo<180;lo+=4.7)dirs.push(direction(la,lo));
  for(let t=Date.UTC(2026,0,1);t<Date.UTC(2027,0,1);t+=37*3600e3)dirs.push(sunDirection(new Date(t)));
  const out=execFileSync('test-results/map-net-test',{input:dirs.map(d=>d.join(' ')).join('\n'),encoding:'utf8'}).trim().split('\n');
  let same=0;
  dirs.forEach((D,i)=>{
    const c=out[i].split(' ').map(Number),j=projectToMap(D);
    if(c[0]===j[0]&&c[1]===j[1]){same++;return;}
    // Single precision can only tip a point on a seam or a pixel edge: both answers stay true.
    assert.ok(away(c,D)<2.1&&away(j,D)<2.1,`${D}: watch ${c}, preview ${j}`);
  });
  assert.ok(same/dirs.length>0.995,`${same} of ${dirs.length} identical`);
});
