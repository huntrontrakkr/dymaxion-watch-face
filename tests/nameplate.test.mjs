import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {nameplateSpot,NAMEPLATE_ROWS,NAMEPLATE_WIDTH,NAMEPLATE_HEIGHT} from '../shared/nameplate.js';
import {PRESETS} from '../shared/settings.js';
const CASES=[[73,22,0],[73,20,0],[73,30,0],[24,134,0],[73,0,1],[90,22,0],[60,22,0],[100,40,1]];
test('the watch places and draws the nameplate exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/nameplate-test.c','watchface/src/c/nameplate.c','-o','test-results/nameplate-test']);
  const [spots,checksum]=execFileSync('test-results/nameplate-test',CASES.flat().map(String)).toString().trim().split('\n');
  assert.equal(spots.trim(),CASES.map(([mapY,clockTop,stacked])=>{const s=nameplateSpot({mapY,clockTop,stacked:!!stacked});return s?s.x+','+s.y:'-';}).join(' '));
  let count=0,sum=0;NAMEPLATE_ROWS.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#'){count++;sum+=x*1000+y;}}));
  assert.equal(checksum,`${count} ${sum}`,'same pixels');
});
test('the nameplate fits Meridian between clock and map, and stays out of the way elsewhere',()=>{
  const m=PRESETS.meridian,spot=nameplateSpot({mapY:m.map[1],clockTop:m.time[1]});
  assert(spot,'Meridian has room');assert.equal(spot.x,(200-NAMEPLATE_WIDTH)>>1,'centred');
  assert(spot.y>=m.time[1]+38+1,'a pixel clear of the clock\'s figures');
  assert.equal(spot.y+NAMEPLATE_HEIGHT-1,m.map[1]+6-2,'its last row a pixel above the map\'s net');
  assert.equal(nameplateSpot({mapY:PRESETS.horizon.map[1],clockTop:PRESETS.horizon.time[1]}),null,'Horizon: the map sits under the status line, no room');
  assert.equal(nameplateSpot({mapY:73,clockTop:30}),null,'a lower clock leaves no room');
  const rows=JSON.parse(readFileSync('designer/public/type/identity.json'));
  assert.equal(NAMEPLATE_ROWS.join('').split('#').length-1,rows.flat().filter(Boolean).length,'every pixel of the script, trimmed');
});
