import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {defaults,validateSettings,THEMES} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {copyPalette} from '../shared/palette-settings.js';
import {backlightColor,themeBacklight,encodeBacklight} from '../shared/backlight.js';

test('backlight migrations, per-theme overrides and custom palettes round trip independently',()=>{
  let s=defaults();assert.equal(s.backlight.mode,'system');assert.equal(encodeBacklight(s)[2],0);delete s.backlight;
  s=validateSettings(s,zoneExists);assert.equal(s.backlight.mode,'system');
  s.backlight={mode:'theme',colors:{0:'#0000FF',1:'#FFF1E7'}};
  s=validateSettings(s,zoneExists);
  assert.equal(themeBacklight(s),'#0000FF');
  s.customPalettes=[copyPalette(s)];s.customPalette=0;
  assert.equal(themeBacklight(s),'#0000FF');
  s.customPalettes[0].backlight='#FFE3F2';s.theme=1;
  assert.equal(themeBacklight(s),'#FFE3F2');
  const copy=copyPalette(s);copy.backlight='#FFFFFF';
  assert.equal(themeBacklight(s),'#FFE3F2');
  assert.deepEqual(validateSettings(JSON.parse(JSON.stringify(s)),zoneExists),s);
  delete s.customPalettes[0].backlight;
  assert.equal(themeBacklight(validateSettings(s,zoneExists)),'#FFFFFF','old custom palettes migrate to neutral');
  s.customPalette=null;assert.equal(themeBacklight(s),'#FFF1E7');
  s.theme=0;assert.equal(themeBacklight(s),'#0000FF');
  delete s.backlight.colors[0];assert.equal(themeBacklight(s),THEMES[0].backlight);
});

test('gentle theme defaults and unrestricted custom RGB888 colors are independent',()=>{
  for(const p of THEMES){
    assert.equal(backlightColor(p.backlight),p.backlight,p.name);
    assert([1,3,5].every(i=>parseInt(p.backlight.slice(i,i+2),16)>=224),p.name+' has a gentle default');
  }
  for(const name of ['Monochrome','High Visibility','Paper','Signal'])assert.equal(THEMES.find(p=>p.name===name).backlight,'#FFFFFF');
  for(let r=0;r<256;r+=17)for(let g=0;g<256;g+=17)for(let b=0;b<256;b+=17){
    const color=backlightColor('#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''));
    const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    assert.deepEqual(channels,[r,g,b]);
    const sample=defaults();sample.backlight={mode:'theme',colors:{0:color}};
    assert.deepEqual([...encodeBacklight(validateSettings(sample,zoneExists)).slice(3)],[r,g,b]);
    assert.equal(backlightColor(color),color,'normalization is idempotent');
  }
  assert.equal(backlightColor('#000000'),'#000000');
  assert.equal(backlightColor('#123abc'),'#123ABC');
  const s=defaults();s.backlight={mode:'theme',colors:{0:'#1234AB'}};
  assert.deepEqual([...encodeBacklight(s)],[1,0,1,18,52,171]);
  s.backlight.mode='system';assert.equal(encodeBacklight(s)[2],0);
});

test('invalid backlight imports fail before replacing settings',()=>{
  for(const backlight of [null,{},[],{mode:'invalid',colors:{}},{mode:'theme',colors:[]},{mode:'theme',colors:{'-1':'#FFFFFF'}},{mode:'theme',colors:{[THEMES.length]:'#FFFFFF'}},{mode:'theme',colors:{'01':'#FFFFFF'}},{mode:'theme',colors:{0:'red'}}]){
    assert.throws(()=>validateSettings({...defaults(),backlight},zoneExists),/backlight/);
  }
});

test('native backlight validates the wire packet and restores/reapplies the LED on focus changes',()=>{
  mkdirSync('test-results/backlight',{recursive:true});
  writeFileSync('test-results/backlight/pebble.h','#include <stdint.h>\nvoid light_set_color_rgb888(uint32_t rgb);\nvoid light_set_system_color(void);\n');
  const s=defaults();s.backlight={mode:'theme',colors:{0:'#1234AB'}};
  writeFileSync('test-results/backlight/packet.bin',encodeBacklight(s));
  for(const supported of [true,false]){
    execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror',...(supported?['-DPBL_RGB_BACKLIGHT']:[]),'-Itest-results/backlight','-Iwatchface/src/c','tests/backlight-test.c','watchface/src/c/backlight.c','-o','test-results/backlight/test']);
    execFileSync('test-results/backlight/test',['test-results/backlight/packet.bin']);
  }
});
