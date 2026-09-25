import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {healthView,sampleHealth,stepScale} from '../shared/health.js';
const zeros=()=>Array(24).fill(0);
const at=(hour,minute)=>new Date(2026,8,23,hour,minute).getTime();
const CASES=[
  [true,12,sampleHealth(at(14,20))],[false,12,sampleHealth(at(14,20))],[true,15,sampleHealth(at(0,5))],[true,12,sampleHealth(at(23,59))],
  [true,12,{steps:zeros(),typical:zeros(),heart:zeros(),hour:9,minute:30,heartNow:0}],
  [true,12,{steps:zeros().map((_,i)=>i<=6?[0,0,0,0,0,300,12500][i]:0),typical:zeros().map(()=>400),heart:zeros().map((_,i)=>i===3?48:i===6?171:0),hour:6,minute:0,heartNow:171}],
  [true,12,{...sampleHealth(at(18,45)),typical:zeros()}],
];
test('the watch lays out the health drawer exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/health-test.c','watchface/src/c/health.c','watchface/src/c/chart_axis.c','-o','test-results/health-test']);
  for(const [labels,width,h] of CASES){
    const out=execFileSync('test-results/health-test',[+labels,width,h.hour,h.minute,h.heartNow,...h.steps,...h.typical,...h.heart].map(String)).toString().split('\n');
    const v=healthView(h,labels,width);
    assert.equal(out[0],`${v.title}|${v.right}|${v.upper}|${v.lower}|${v.scale} ${v.lo} ${v.hi} ${v.layout.left} ${v.layout.step}`);
    assert.equal(out[1].trim(),v.bars.map(b=>`${b.x},${b.y},${b.width},${b.height}`).join(' '));
    assert.equal(out[2].trim(),v.usual.map((u,i)=>`${u},${v.pulse[i]}`).join(' '));
  }
});
test('steps, heart rate and the typical day read at a glance',()=>{
  const v=healthView(sampleHealth(at(14,20)));
  assert.match(v.title,/^STEPS \d+ HR \d+$/);assert.match(v.right,/^TYPICAL [+-]?\d+%$/);
  assert.equal(v.bars.length,15,'bars up to the current hour');assert(v.pulse.slice(15).every(y=>y===-1),'no heart rate in the future');
  assert.equal(healthView({steps:zeros(),typical:zeros(),heart:zeros(),hour:9,minute:0,heartNow:0}).right,'','no typical day yet: no comparison');
  assert.equal(stepScale(90),500);assert.equal(stepScale(1200),1500);assert.equal(stepScale(12500),15000);
  const quiet=healthView({steps:zeros(),typical:zeros(),heart:zeros(),hour:9,minute:0,heartNow:0});assert.equal(quiet.upper,'500','without heart rate the range labels show the step scale');
});
