import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {TRIANGLE_GRID,HEXAGON,groupLit,encodeDisplay} from '../shared/triangle-display.js';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
test('the display is one equilateral lattice, with six hexagonal edges and whole-cell electrodes',()=>{
  const grid=TRIANGLE_GRID,occupied=new Set(),groups=new Set();assert.equal(grid.cells.length,330);
  for(const cell of grid.cells){
    for(const vertices of [cell.vertices,cell.electrode]){
      const lengths=vertices.map((p,i)=>Math.hypot(p[0]-vertices[(i+1)%3][0],p[1]-vertices[(i+1)%3][1]));
      lengths.forEach(length=>assert(Math.abs(length-lengths[0])<1e-10));
      if(vertices===cell.vertices)assert(Math.abs(lengths[0]-7)<1e-10);
    }
    assert(cell.runs.length>0);groups.add(cell.group);
    for(const r of cell.runs){assert.equal(r.group,cell.group);assert(r.x>=0&&r.x+r.length<=196&&r.y>=0&&r.y<37);
      for(let x=r.x;x<r.x+r.length;x++){const key=r.y*196+x;assert(!occupied.has(key),'electrode pixels must never overlap');occupied.add(key);}
    }
  }
  assert.equal(groups.size,30);
  for(let i=0;i<HEXAGON.length;i++){const p=HEXAGON[i],q=HEXAGON[(i+1)%6],angle=Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI;assert(Math.abs(angle/60-Math.round(angle/60))<1e-10);}
  const glyphs=new Set();
  for(let digit=0;digit<10;digit++)glyphs.add(grid.cells.filter(c=>c.group<=7&&groupLit(c.group,[digit])).map(c=>c.column+','+c.row).join(';'));
  assert.equal(glyphs.size,10,'all ten numerals must remain distinct');
});
test('display preferences migrate, validate, and travel separately from the stable layout packet',()=>{
  const s=defaults();assert.deepEqual([...encodeDisplay(s)],[1,4,1,0],'new faces use Geodesic figures');
  assert.deepEqual([...encodeDisplay({...s,clockDisplay:'broad'})],[1,2,1,0]);
  for(const clockDisplay of ['span','triangles','broad','geodesic'])assert.notEqual(encodeDisplay({...s,clockDisplay})[1],3,'code 3 is the retired LCD style');
  delete s.clockDisplay;delete s.segmentGrid;
  assert.equal(validateSettings(s,zoneExists).clockDisplay,'broad');
  assert.throws(()=>validateSettings({...s,clockDisplay:'unknown'},zoneExists));assert.throws(()=>validateSettings({...s,segmentGrid:'false'},zoneExists));
  assert.deepEqual([...encodeDisplay({...defaults(),clockDisplay:'span',segmentGrid:false})],[1,0,0,0]);
});
test('retired LCD and framing settings restore the open face without resetting personal preferences',()=>{
  const saved=defaults();saved.theme=2;saved.format=2;saved.time=[0,30];saved.map=[0,78];
  saved.location={mode:'manual',name:'Norfolk'};saved.places[0].color='#FF5500';
  saved.footer.home='weather';
  for(const clockDisplay of ['lcd','broad','span','triangles']){
    const expected=validateSettings({...saved,clockDisplay:clockDisplay==='lcd'?'broad':clockDisplay},zoneExists);
    const migrated=validateSettings({...saved,clockDisplay,framing:{style:'rails',clock:true,map:true,footer:true,grid:true}},zoneExists);
    assert.deepEqual(migrated,expected);
    assert(!('framing' in migrated));assert.equal(encodeDisplay(migrated)[3],0);
    assert.deepEqual(validateSettings(migrated,zoneExists),migrated,'migration is stable on subsequent saves');
  }
});
test('native segment rendering matches the browser geometry pixel for pixel across all numerals and both grid modes',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/display-test.c','watchface/src/c/display.c','-o','test-results/display-test']);
  const frames=[];
  for(const grid of [false,true])for(let n=0;n<10;n++){
    const pixels=Buffer.alloc(196*37),digits=[0,1,2,3].map(d=>(n+d)%10);
    for(const r of TRIANGLE_GRID.runs){const lit=groupLit(r.group,digits);if(lit||grid)pixels.fill(lit?2:1,r.y*196+r.x,r.y*196+r.x+r.length);}
    frames.push(pixels);
  }
  assert.deepEqual(execFileSync('test-results/display-test'),Buffer.concat(frames));
  writeFileSync('test-results/display-triangles.bin',encodeDisplay({...defaults(),clockDisplay:'triangles'}));
  writeFileSync('test-results/display-broad.bin',encodeDisplay({...defaults(),clockDisplay:'broad'}));
  writeFileSync('test-results/display-geodesic.bin',encodeDisplay(defaults()));
  writeFileSync('test-results/display-span.bin',encodeDisplay({...defaults(),clockDisplay:'span'}));
});
