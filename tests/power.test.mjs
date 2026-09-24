import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {defaultPower,validatePower,encodePower,decodePower,isNight,daylightMinutes,relightAt,sinceRelight,minuteAnimationOn,flourishesOn,darkPaused} from '../shared/power.js';
import {encodeDisplay} from '../shared/display.js';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
const CASES=[defaultPower(),{...defaultPower(),daylightMinutes:30,minuteAnimation:false},{...defaultPower(),flourishes:false,daylightMinutes:10},
  {...defaultPower(),night:true},{...defaultPower(),night:true,darkPause:true,nightStart:1,nightEnd:6,daylightMinutes:15},
  {...defaultPower(),night:true,nightStart:9,nightEnd:9},{...defaultPower(),darkPause:true}];
test('the watch applies power and motion exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/power-test.c','watchface/src/c/power.c','-o','test-results/power-test']);
  for(const p of CASES){
    const out=execFileSync('test-results/power-test',encodePower(p).map(String)).toString().trim().split('\n');
    const expected=[...Array(24).keys()].map(h=>[isNight(p,h),minuteAnimationOn(p,true,h),minuteAnimationOn(p,false,h),flourishesOn(p,true,h),darkPaused(p,h)].map(Number).join('')+daylightMinutes(p,h)+':'+[...Array(60).keys()].map(m=>Number(relightAt(p,true,h,m))+2*Number(relightAt(p,false,h,m))).join(''));
    assert.deepEqual(out,expected,JSON.stringify(p));
    assert.deepEqual(decodePower(encodePower(p)),p,'round trip');
  }
});
test('night saver: every other hour, no animations, optional pause in the dark',()=>{
  const p={...defaultPower(),night:true};
  assert.equal(defaultPower().night,false,'off by default');assert.equal(defaultPower().daylightMinutes,5);
  assert(isNight(p,23)&&isNight(p,0)&&isNight(p,6)&&!isNight(p,7)&&!isNight(p,21),'22:00 to 7:00 wraps midnight');
  assert.equal(daylightMinutes(p,2),120);assert(relightAt(p,true,2,0)&&!relightAt(p,true,3,0)&&!relightAt(p,true,2,5),'every other hour');
  assert(relightAt(p,true,12,5)&&!relightAt(p,false,12,5),'day: every five minutes, never with day and night off');
  assert(!minuteAnimationOn(p,true,23)&&!flourishesOn(p,true,23)&&minuteAnimationOn(p,true,12));
  assert(!darkPaused(p,23)&&darkPaused({...p,darkPause:true},23)&&!darkPaused({...p,darkPause:true},12));
  assert.equal(sinceRelight(p,3,17),77,'last recomputed at 2:00');assert.equal(sinceRelight(defaultPower(),3,17),2);
  assert.equal(sinceRelight({...defaultPower(),daylightMinutes:30},3,17),17);
});
test('power settings validate and travel in the display packet',()=>{
  assert.deepEqual([...encodeDisplay({...defaults(),power:{...defaultPower(),daylightMinutes:15,minuteAnimation:false,night:true,darkPause:true,nightStart:23,nightEnd:6}})],[3,4,0,0,2|4|16|32,23,6,0]);
  assert.deepEqual(validateSettings({...defaults(),power:undefined},zoneExists).power,defaultPower(),'older files get the defaults');
  assert.throws(()=>validatePower({daylightMinutes:7}));assert.throws(()=>validatePower({nightStart:24}));assert.throws(()=>validatePower({night:'yes'}));
});
