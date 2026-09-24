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
test('untouched tiles stay fixed while each changed tile shrinks to its centroid in the face colors',()=>{
  const plan=planPixelFlip(mask('12:33'),mask('12:34'));
  let moving=false;
  for(const ms of [40,80,120,160,200,240,280,320,360,399]){
    const frame=sampleMinuteFlip(plan,ms);
    for(let i=0;i<8000;i++){
      assert(frame[i]===0||frame[i]===1,'no shading: ink and ground only');
      if(!plan.active[plan.grid.membership[i]]){assert.equal(frame[i],plan.before[i]);assert.equal(frame[i],plan.after[i]);}
    }
    if(frame.some((v,i)=>v!==plan.before[i])&&frame.some((v,i)=>v!==plan.after[i]))moving=true;
  }
  assert(moving,'mid-transition frames show the old drawing shrinking over the new');
  // A tile's old drawing only ever retreats toward its centroid.
  const cell=plan.grid.cells.find(c=>plan.active[c.id]),spread=ms=>{
    const frame=sampleMinuteFlip(plan,ms),cx=cell.cx/256,cy=cell.cy/256;
    return Math.max(0,...cell.pixels.filter(i=>frame[i]!==plan.after[i]).map(i=>Math.hypot(i%200+.5-cx,Math.floor(i/200)+.5-cy)));
  };
  const spreads=[100,200,300,390].map(ms=>spread(ms+plan.delays[cell.id]));
  for(let k=1;k<spreads.length;k++)assert(spreads[k]<=spreads[k-1]+1e-9,`spread grew: ${spreads}`);
  const still=planPixelFlip(mask('12:34'),mask('12:34'));
  assert.equal(still.duration,0);assert.equal(still.changedCells,0);
  assert.deepEqual(sampleMinuteFlip(still,0),still.after);
});
test('native packed frames match the browser at every sampled stage of minute, hour and midnight transitions',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/minute-flip-test.c','watchface/src/c/minute_flip.c','watchface/src/c/clock_styles.c','watchface/src/c/display.c','-o','test-results/minute-flip-test']);
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
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/minute-flip-test.c','watchface/src/c/minute_flip.c','watchface/src/c/clock_styles.c','watchface/src/c/display.c','-o','test-results/minute-flip-test']);
  const timings=[0,33,80,120,160,200,240,280,320,399,400];
  for(const [from,to] of [['12:33','12:34'],['12:59','13:00'],['23:59','00:00'],['09:09','09:10'],['19:59','20:00'],['01:11','01:12'],['12:34','12:34'],[' 9:59','10:00'],['12:59',' 1:00'],[' 9:07',' 9:08']]){
    const plan=planPixelFlip(clockMask(from,'chamfer'),clockMask(to,'chamfer'),'chamfer');
    const expected=Buffer.concat(timings.map(ms=>Buffer.from(sampleMinuteFlip(plan,ms))));
    assert.deepEqual(execFileSync('test-results/minute-flip-test',['watchface/resources/data/clock-chamfer.bin',from,to,...timings.map(String)],{maxBuffer:4_000_000}),expected,from+' → '+to);
  }
});
test('every numeral style shares the transition: native frames match the browser for Span, triangles and each font',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/minute-flip-test.c','watchface/src/c/minute_flip.c','watchface/src/c/clock_styles.c','watchface/src/c/display.c','-o','test-results/minute-flip-test']);
  const timings=[0,80,160,240,320,400];
  const styles=[['span',0],['triangles',1],['leco',5],['bitham-bold',6],['bitham-light',7],['bitham-medium',8],['leco-delta',9]];
  for(const [style,code] of styles){
    const target=`watchface/resources/data/clock-chamfer.bin,${code}`+(code>1?',watchface/resources/data/clock-glyphs.bin':'');
    for(const [from,to] of [['12:33','12:34'],['12:59','13:00'],['23:59','00:00'],[' 9:59','10:00'],['12:59',' 1:00'],['12:34','12:34']]){
      const plan=planPixelFlip(clockMask(from,style),clockMask(to,style),style);
      if(from!==to)assert(plan.changedCells>0,style+' '+from);
      assert.deepEqual(sampleMinuteFlip(plan,400),plan.after);
      const expected=Buffer.concat(timings.map(ms=>Buffer.from(sampleMinuteFlip(plan,ms))));
      assert.deepEqual(execFileSync('test-results/minute-flip-test',[target,from,to,...timings.map(String)],{maxBuffer:4_000_000}),expected,style+' '+from+' → '+to);
    }
  }
});
