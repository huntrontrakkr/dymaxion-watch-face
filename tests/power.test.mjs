import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {batteryAllowsMotion,defaultPower,validatePower,encodePower,decodePower,isNight,daylightMinutes,relightAt,sinceRelight,minuteAnimationOn,flourishesOn,darkPaused} from '../shared/power.js';
import {encodeDisplay} from '../shared/display.js';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
const CASES=[defaultPower(),{...defaultPower(),daylightMinutes:30,minuteAnimation:false},{...defaultPower(),flourishes:false,daylightMinutes:10},
  {...defaultPower(),night:true},{...defaultPower(),night:true,darkPause:true,nightStart:1,nightEnd:6,daylightMinutes:15},
  {...defaultPower(),night:true,nightStart:9,nightEnd:9},{...defaultPower(),darkPause:true,lowBattery:30},{...defaultPower(),lowBattery:5},
  {...defaultPower(),quietTime:true,darkPause:true},{...defaultPower(),night:true,quietTime:true,darkPause:true,nightStart:23,nightEnd:5}];
test('the watch applies power and motion exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/power-test.c','watchface/src/c/power.c','-o','test-results/power-test']);
  for(const p of CASES)for(const quiet of [false,true]){
    const out=execFileSync('test-results/power-test',[...encodePower(p),+quiet].map(String)).toString().trim().split('\n');
    const expected=[...Array(24).keys()].map(h=>[isNight(p,h,quiet),minuteAnimationOn(p,true,h,quiet),minuteAnimationOn(p,false,h,quiet),flourishesOn(p,true,h,quiet),darkPaused(p,h,quiet)].map(Number).join('')+daylightMinutes(p,h,quiet)+':'+[...Array(60).keys()].map(m=>Number(relightAt(p,true,h,m,quiet))+2*Number(relightAt(p,false,h,m,quiet))).join(''));
    expected.push([...Array(101).keys()].map(b=>Number(batteryAllowsMotion(p,b))).join(''));
    assert.deepEqual(out,expected,JSON.stringify(p)+(quiet?' in Quiet Time':''));
    assert.deepEqual(decodePower(encodePower(p)),p,'round trip');
  }
});
test('night saver: every other hour, no animations, optional pause in the dark',()=>{
  const p={...defaultPower(),night:true};
  assert.equal(defaultPower().night,false,'off by default');assert.equal(defaultPower().lowBattery,10,'animations stop at 10% by default');
  assert(batteryAllowsMotion(defaultPower(),11)&&!batteryAllowsMotion(defaultPower(),10));assert.equal(defaultPower().daylightMinutes,5);
  assert(isNight(p,23)&&isNight(p,0)&&isNight(p,6)&&!isNight(p,7)&&!isNight(p,21),'22:00 to 7:00 wraps midnight');
  assert.equal(daylightMinutes(p,2),120);assert(relightAt(p,true,2,0)&&!relightAt(p,true,3,0)&&!relightAt(p,true,2,5),'every other hour');
  assert(relightAt(p,true,12,5)&&!relightAt(p,false,12,5),'day: every five minutes, never with day and night off');
  assert(!minuteAnimationOn(p,true,23)&&!flourishesOn(p,true,23)&&minuteAnimationOn(p,true,12));
  assert(!darkPaused(p,23)&&darkPaused({...p,darkPause:true},23)&&!darkPaused({...p,darkPause:true},12));
  const q={...defaultPower(),quietTime:true,darkPause:true};
  assert.equal(defaultPower().quietTime,false,'Quiet Time counts only when chosen');
  assert(isNight(q,14,true)&&!isNight(q,14,false),'Quiet Time is night at any hour, only while it is on');
  assert(!isNight({...q,quietTime:false},14,true),'not unless chosen');
  assert(darkPaused(q,14,true)&&!minuteAnimationOn(q,true,14,true)&&daylightMinutes(q,14,true)===120);
  assert.equal(sinceRelight(p,3,17),77,'last recomputed at 2:00');assert.equal(sinceRelight(defaultPower(),3,17),2);
  assert.equal(sinceRelight({...defaultPower(),daylightMinutes:30},3,17),17);
});
test('power settings validate and travel in the display packet',()=>{
  assert.deepEqual([...encodeDisplay({...defaults(),power:{...defaultPower(),daylightMinutes:15,minuteAnimation:false,night:true,darkPause:true,nightStart:23,nightEnd:6,lowBattery:20}})],[3,4,36,0,2|4|16|32,23,6,20]);
  assert.equal(encodeDisplay({...defaults(),power:{...defaultPower(),quietTime:true}})[4],64,'bit 6: Quiet Time counts as night');
  assert.deepEqual(validateSettings({...defaults(),power:undefined},zoneExists).power,defaultPower(),'older files get the defaults');
  assert.throws(()=>validatePower({daylightMinutes:7}));assert.throws(()=>validatePower({nightStart:24}));assert.throws(()=>validatePower({night:'yes'}));assert.throws(()=>validatePower({lowBattery:15}));
});
