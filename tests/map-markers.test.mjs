import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {makeMap} from '../shared/map.js';
import {PLACES} from '../shared/settings.js';
import {layoutMarkers,markerHulls,hullPixels,markerClearance} from '../shared/map-markers.js';
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
  for(const pts of cases){
    const l=layoutMarkers(pts),hulls=markerHulls(pts,l);
    assert.equal(execFileSync('test-results/map-markers-test',pts.flatMap(p=>[p.x,p.y,p.half]).map(String)).toString().trim(),
      (l.map(p=>p.x+','+p.y+','+p.group).join(' ')+' |'+hulls.map(h=>`${h.members.length}:${h.glyphs.x0},${h.glyphs.y0},${h.glyphs.x1},${h.glyphs.y1} `).join('')+'|'+markerClearance(pts,l).own.map(r=>`${r.x0},${r.y0},${r.x1},${r.y1}`).join(' ')).trim());
  }
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
  const far=cases[3];assert.deepEqual(layoutMarkers(far).map(({x,y})=>({x,y})),far.map(({x,y})=>({x,y})));assert.equal(markerHulls(far,layoutMarkers(far)).length,0,'no hull without a group');
  // Grouped places run west to east.
  const eu=layoutMarkers(cases[0]);assert(eu[2].x<eu[1].x&&eu[1].x<eu[0].x,'Berlin, Paris, London by true longitude');
});
test('a hull is exactly the place glyphs\' 5 pixels tall, corners cut; your marker stands proud of it',()=>{
  const pts=cases[0],l=layoutMarkers(pts),[h]=markerHulls(pts,l);
  assert.deepEqual(h.members.sort(),[0,1,2]);
  const {ground,outline}=hullPixels(h),key=([x,y])=>x+','+y,out=new Set(outline.map(key));
  const {x0,y0,x1,y1}=h.glyphs,ys=[...outline,...ground].map(p=>p[1]);
  assert.equal(Math.max(...ys)-Math.min(...ys)+1,5,'5 pixels tall, outline included: no padding');
  assert.equal(x0,Math.min(...l.map((p,i)=>p.x-pts[i].half)));assert.equal(x1,Math.max(...l.map((p,i)=>p.x+pts[i].half)));
  for(const c of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]])assert(!out.has(key(c)),'corners cut');
  assert(out.has(key([x0+1,y0]))&&out.has(key([x0,y0+1])),'outline runs along the band');
  const mixed=cases[6],ml=layoutMarkers(mixed),mh=markerHulls(mixed,ml).find(h=>h.members.includes(3)),you=ml[3];
  assert.equal(mh.glyphs.y1-mh.glyphs.y0+1,5,'still 5 with your marker in the group');
  assert(you.y-3<mh.glyphs.y0&&you.y+3>mh.glyphs.y1,'your 7-pixel marker stands a pixel proud above and below');
});
