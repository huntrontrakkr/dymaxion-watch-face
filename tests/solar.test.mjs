import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {sunUp,nextSunEvent,sunDirection} from '../shared/solar.js';
import {direction} from '../shared/map.js';
const minute=(t,tz)=>new Date(t*1000).toLocaleTimeString('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit'});
test('sunrise and sunset match almanac times for the wearer\'s place',()=>{
  // Norfolk, VA on 23-24 September 2026: sunset 19:01, sunrise 06:53 (EDT), within two minutes.
  const norfolk=direction(36.85,-76.29),now=Date.UTC(2026,8,23,16,38)/1000;
  const set=nextSunEvent(now,norfolk),rise=nextSunEvent(set.time+60,norfolk);
  assert.equal(set.rise,false);assert.equal(rise.rise,true);
  assert(Math.abs(set.time-Date.UTC(2026,8,23,23,1)/1000)<=120,minute(set.time,'America/New_York'));
  assert(Math.abs(rise.time-Date.UTC(2026,8,24,10,53)/1000)<=120,minute(rise.time,'America/New_York'));
  assert.equal(sunUp(now,norfolk),true);assert.equal(sunUp(Date.UTC(2026,8,24,6)/1000,norfolk),false);
  // Midnight sun and polar night have no event.
  assert.equal(nextSunEvent(Date.UTC(2026,5,21)/1000,direction(69.65,18.96)),null);
  assert.equal(nextSunEvent(Date.UTC(2026,11,21)/1000,direction(78.22,15.65)),null);
});
test('watch and browser agree on daylight and the next sunrise or sunset',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/solar-test.c','watchface/src/c/solar.c','-o','test-results/solar-test']);
  const places=[[369,-763],[515,-1],[-339,1512],[-2,-785],[697,190],[352,1397],[-549,-683],[641,-219]],cases=[];
  for(const [lat,lon] of places)for(let day=0;day<366;day+=11)for(const hour of [0,5,11,17,22])cases.push([Date.UTC(2026,0,1+day,hour,17)/1000,lat,lon]);
  const out=execFileSync('test-results/solar-test',{input:cases.map(c=>c.join(' ')).join('\n'),encoding:'utf8'}).trim().split('\n');
  cases.forEach(([t,lat,lon],i)=>{
    const place=direction(lat/10,lon/10),[up,next,rise]=out[i].split(' ').map(Number),event=nextSunEvent(t,place);
    // Single-precision trig on the watch may flip a moment within a minute of the event.
    if(up!==+sunUp(t,place)){const near=nextSunEvent(t-120,place,1);assert(near&&Math.abs(near.time-t)<=90,`up ${lat},${lon} @${t}`);}
    if(!event){assert(next===0||Math.abs(next-t)<=90,`none ${lat},${lon} @${t}`);return;}
    assert.equal(rise,+event.rise,`${lat},${lon} @${t}`);assert(Math.abs(next-event.time)<=90,`${lat},${lon} @${t}: ${next} vs ${event.time}`);
  });
});
test('the sun sits where the almanac puts it through the seasons',()=>{
  const deg=r=>r*180/Math.PI,at=t=>sunDirection(new Date(t));
  // Declination at the 2026 equinoxes and solstices (USNO), to 0.02 degrees.
  for(const [t,want] of [['2026-03-20T14:46Z',0],['2026-06-21T08:24Z',23.436],['2026-09-23T00:05Z',0],['2026-12-21T20:50Z',-23.436],['2030-03-20T13:52Z',0]])
    assert(Math.abs(deg(Math.asin(at(t)[2]))-want)<0.02,t);
  // The equation of time at its extremes: the sun 16.4 minutes fast in early
  // November and 14.2 minutes slow in mid-February, to 0.2 minutes.
  const late=t=>deg(Math.atan2(at(t)[1],at(t)[0]))*4;
  assert(Math.abs(late('2026-11-03T12:00Z')+16.4)<0.2);assert(Math.abs(late('2026-02-11T12:00Z')-14.2)<0.2);
});
