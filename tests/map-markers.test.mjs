import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {makeMap} from '../shared/map.js';
import {PLACES} from '../shared/settings.js';
import {layoutMarkers} from '../shared/map-markers.js';
const m=makeMap(),pos=l=>{const p=PLACES.find(q=>q.label===l);return m.project(p.lat,p.lon).map(Math.round);};
const cases=[
  ...[['LON','PAR','BER'],['NYC','CHI','TYO'],['LAX','SFO','HNL'],['NYC','LON','TYO'],['LON','UTC','PAR'],['CPT','NBO','CAI']].map(set=>set.map(l=>{const [x,y]=pos(l);return {x,y,half:2};})),
  [...['NYC','CHI','TYO'].map(l=>{const [x,y]=pos(l);return {x,y,half:2};}),{x:118,y:45,half:3}],
  [{x:1,y:1,half:2},{x:3,y:2,half:2},{x:5,y:0,half:2},{x:2,y:3,half:3}],
  [{x:198,y:102,half:2},{x:196,y:103,half:3}],
  [{x:50,y:50,half:2},{x:56,y:50,half:2},{x:62,y:50,half:2},{x:68,y:50,half:3}]
];
test('the watch lays out markers exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/map-markers-test.c','watchface/src/c/map_markers.c','-o','test-results/map-markers-test']);
  for(const pts of cases)assert.equal(execFileSync('test-results/map-markers-test',pts.flatMap(p=>[p.x,p.y,p.half]).map(String)).toString().trim(),layoutMarkers(pts).map(p=>p.x+','+p.y).join(' '));
});
test('close markers sit side by side, west to east, clearings never covering a glyph',()=>{
  cases.forEach((pts,c)=>{
    const out=layoutMarkers(pts),real=c<7;
    out.forEach((a,i)=>{
      assert(a.x-pts[i].half>=0&&a.x+pts[i].half<200&&a.y-pts[i].half>=0&&a.y+pts[i].half<104,'on the map');
      out.forEach((b,j)=>{if(j<=i)return;
        const gap=Math.max(Math.abs(a.x-b.x)-pts[i].half-pts[j].half,Math.abs(a.y-b.y)-pts[i].half-pts[j].half);
        assert(gap>=2,`glyphs ${i} and ${j} keep a pixel between them (${gap-1})`);});
      // Real places move a few pixels at most; synthetic piles at the map's edge more.
      if(real&&Math.max(Math.abs(a.x-pts[i].x),Math.abs(a.y-pts[i].y))>12)assert.fail(`marker ${i} moved more than 12 pixels`);
    });
  });
  // Markers far apart keep their true positions.
  const far=cases[3];assert.deepEqual(layoutMarkers(far),far.map(({x,y})=>({x,y})));
  // Grouped places run west to east.
  const eu=layoutMarkers(cases[0]);assert(eu[2].x<eu[1].x&&eu[1].x<eu[0].x,'Berlin, Paris, London by true longitude');
});
