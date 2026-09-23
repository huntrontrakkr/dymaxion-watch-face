import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {FLIP_DURATION, planPixelFlip, sampleMinuteFlip, clockMask} from '../shared/minute-flip.js';
import {broadTimeMask as mask} from '../shared/broad-numerals.js';
const time = minute => String(Math.floor((minute%1440)/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
test('every adjacent minute selects exactly the changed triangles and fits inside 400 ms', () => {
  assert(FLIP_DURATION<500);
  for(let minute=0;minute<1440;minute++){
    const before=mask(time(minute)),after=mask(time(minute+1)),plan=planPixelFlip(before,after);
    assert(plan.changedCells>0);
    for(const cell of plan.grid.cells){
      assert.equal(!!plan.active[cell.id],cell.pixels.some(i=>before[i]!==after[i]));
      assert(plan.delays[cell.id]+320<=FLIP_DURATION);
    }
    assert.deepEqual(sampleMinuteFlip(plan,0),before);
    assert.deepEqual(sampleMinuteFlip(plan,400),after);
  }
});
test('untouched tiles stay fixed while each changed tile shrinks to its centroid',()=>{
  const plan=planPixelFlip(mask('12:33'),mask('12:34'));
  const covered=new Map();
  for(const ms of [40,80,120,160,200,240,280,320,360,399]){
    const frame=sampleMinuteFlip(plan,ms);
    for(let i=0;i<8000;i++){
      assert(frame[i]>=0&&frame[i]<=3);
      const id=plan.grid.membership[i];
      if(!plan.active[id]){assert.equal(frame[i],plan.before[i]);assert.equal(frame[i],plan.after[i]);}
      else if(frame[i]<2)assert(frame[i]===plan.before[i]||frame[i]===plan.after[i]);
    }
    // The shaded remainder of every changed tile only ever gets smaller.
    for(const cell of plan.grid.cells)if(plan.active[cell.id]){
      const area=cell.pixels.filter(i=>frame[i]>1).length,last=covered.get(cell.id);
      if(last!==undefined&&last>0)assert(area<=last,`tile ${cell.id} grew at ${ms} ms`);
      covered.set(cell.id,area);
    }
  }
  assert([...covered.values()].every(area=>area===0),'every tile has vanished by the end');
  const mid=sampleMinuteFlip(plan,160);
  assert(mid.some(v=>v>1),'shrinking tiles are shaded so the triangles read');
  const still=planPixelFlip(mask('12:34'),mask('12:34'));
  assert.equal(still.duration,0);assert.equal(still.changedCells,0);
  assert.deepEqual(sampleMinuteFlip(still,0),still.after);
});
test('native packed frames match the browser at every sampled stage of minute, hour and midnight transitions',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/minute-flip-test.c','watchface/src/c/minute_flip.c','-o','test-results/minute-flip-test']);
  const timings=[0,33,80,120,160,200,240,280,320,399,400,800];
  for(const [from,to] of [['12:33','12:34'],['12:59','13:00'],['23:59','00:00'],['09:09','09:10'],['11:59','12:00'],['12:59','01:00'],['08:08','08:09'],['12:34','12:34']]){
    const plan=planPixelFlip(mask(from),mask(to));
    const expected=Buffer.concat(timings.map(ms=>Buffer.from(sampleMinuteFlip(plan,ms))));
    assert.deepEqual(execFileSync('test-results/minute-flip-test',['broad',from,to,...timings.map(String)],{maxBuffer:1_000_000}),expected,from+' → '+to);
  }
});

test('Chamfer figures shrink away on a map-scale lattice: every adjacent minute, untouched tiles still',()=>{
  const g=time=>clockMask(time,'chamfer');
  for(let minute=0;minute<1440;minute++){
    const before=g(time(minute)),after=g(time(minute+1)),plan=planPixelFlip(before,after,'chamfer');
    assert(plan.changedCells>0);
    for(const cell of plan.grid.cells){
      assert.equal(!!plan.active[cell.id],cell.pixels.some(i=>before[i]!==after[i]));
      assert(plan.delays[cell.id]+320<=FLIP_DURATION);
    }
    assert.deepEqual(sampleMinuteFlip(plan,0),before);
    assert.deepEqual(sampleMinuteFlip(plan,400),after);
  }
  const plan=planPixelFlip(g('12:33'),g('12:34'),'chamfer');
  for(const ms of [80,200,320])for(let i=0;i<200*40;i++)if(!plan.active[plan.grid.membership[i]])assert.equal(sampleMinuteFlip(plan,ms)[i],plan.before[i]);
  assert(plan.grid.cells.length<40,'a coarse lattice, near the map scale');
});
test('native Chamfer frames, read from the packed resource, match the browser at every stage',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/minute-flip-test.c','watchface/src/c/minute_flip.c','-o','test-results/minute-flip-test']);
  const timings=[0,33,80,120,160,200,240,280,320,399,400];
  for(const [from,to] of [['12:33','12:34'],['12:59','13:00'],['23:59','00:00'],['09:09','09:10'],['19:59','20:00'],['01:11','01:12'],['12:34','12:34']]){
    const plan=planPixelFlip(clockMask(from,'chamfer'),clockMask(to,'chamfer'),'chamfer');
    const expected=Buffer.concat(timings.map(ms=>Buffer.from(sampleMinuteFlip(plan,ms))));
    assert.deepEqual(execFileSync('test-results/minute-flip-test',['watchface/resources/data/clock-chamfer.bin',from,to,...timings.map(String)],{maxBuffer:4_000_000}),expected,from+' → '+to);
  }
});
