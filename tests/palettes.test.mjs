import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,defaults,validateSettings,pebbleColor} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {panelColors,PANEL_COLOR_ROLES} from '../shared/panel-settings.js';
import {encodeFooter} from '../shared/panel-protocol.js';
import {contrast,simulateRGB,VISION_MODES} from '../tools/color-vision.mjs';
import {copyPalette,paletteFor,MAX_CUSTOM_PALETTES} from '../shared/palette-settings.js';
import {encodePalette,PALETTE_SIZE} from '../shared/palette-protocol.js';
import {encodeSettings} from '../shared/protocol.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

function customSettings(){
  const s=defaults();s.theme=5;s.customPalettes=[copyPalette(s)];s.customPalette=0;
  return s;
}

test('custom palettes migrate, snap every color, and preserve presets and independent saved copies',()=>{
  const legacy=defaults();delete legacy.customPalettes;delete legacy.customPalette;
  const migrated=validateSettings(legacy,zoneExists);
  assert.deepEqual(migrated.customPalettes,[]);assert.equal(migrated.customPalette,null);
  const s=customSettings(),original=structuredClone(THEMES[5]);
  Object.assign(s.customPalettes[0],{name:'  Coral study  ',bg:'#ddccb0',ink:'#3c3c3c'});
  s.customPalettes[0].marks[0]='#00dfdc';s.customPalettes[0].panelColors.tide='#fa605a';
  const valid=validateSettings(s,zoneExists),p=paletteFor(valid);
  assert.equal(p.name,'Coral study');assert.equal(p.bg,'#FFAAAA');assert.equal(p.ink,'#555555');
  assert.equal(p.marks[0],'#00FFFF');assert.equal(p.panelColors.tide,'#FF5555');
  assert.equal(s.customPalettes[0].bg,'#ddccb0','validation must not mutate imported input');
  valid.customPalettes.push(copyPalette(valid));valid.customPalettes[1].marks[0]='#FF0000';
  valid.customPalettes[1].panelColors.tide='#005555';
  assert.equal(valid.customPalettes[0].marks[0],'#00FFFF');assert.equal(valid.customPalettes[0].panelColors.tide,'#FF5555');
  assert.equal(copyPalette(valid).name,'My Coral study 2');
  valid.customPalette=null;assert.equal(paletteFor(valid),THEMES[5]);assert.equal(valid.customPalettes.length,2);
  valid.customPalette=0;assert.deepEqual(validateSettings(JSON.parse(JSON.stringify(valid)),zoneExists),valid);
  assert.deepEqual(THEMES[5],original);
});

test('invalid or incomplete palette imports are rejected before changing saved settings',()=>{
  const reject=(mutate,pattern)=>{const s=customSettings();mutate(s);assert.throws(()=>validateSettings(s,zoneExists),pattern);};
  for(const name of ['', '   ', 'x'.repeat(33), 'broken\nname'])reject(s=>s.customPalettes[0].name=name,/name/);
  for(const index of [-1,1,0.5,'0'])reject(s=>s.customPalette=index,/saved custom palette/);
  reject(s=>s.customPalettes=Array.from({length:MAX_CUSTOM_PALETTES+1},()=>copyPalette(defaults())),/up to 12/);
  reject(s=>s.customPalettes={},/up to 12/);
  reject(s=>delete s.customPalettes[0].nightOcean,/six-digit color/);
  reject(s=>s.customPalettes[0].marks=['#000000'],/Incomplete/);
  reject(s=>s.customPalettes[0].zoneGlyphs=1,/Incomplete/);
  reject(s=>s.customPalettes[0].panelColors.tide='red',/six-digit color/);
});

test('active custom colors reach all native packets while explicit place and panel colors take priority',()=>{
  const s=customSettings(),p=s.customPalettes[0];
  p.marks=['#00FFFF','#FF55AA','#AAAAFF'];p.panelColors.rain='#55FFAA';p.zoneGlyphs=true;
  const packet=encodePalette(s);assert.equal(packet.length,PALETTE_SIZE);
  assert.deepEqual([...packet.slice(0,4)],[1,5,1,1]);
  assert.deepEqual([...packet.slice(4,17)],[p.bg,p.ocean,p.land,p.nightOcean,p.nightLand,p.edge,p.ink,p.accent,...p.marks,p.moonShadow,p.inactive].map(pebbleColor));
  assert.equal(packet[17],0);
  assert.equal(encodeSettings(s)[16+70],pebbleColor(p.marks[0]));
  s.places[0].color='#5500AA';assert.equal(encodeSettings(s)[16+70],pebbleColor('#5500AA'));
  assert.equal(encodeFooter(s)[22],pebbleColor(p.panelColors.rain));
  s.footer.colorMode='custom';s.footer.colors.rain='#AA5500';
  assert.equal(encodeFooter(s)[22],pebbleColor('#AA5500'));
  s.customPalette=null;assert.equal(encodePalette(s)[2],0,'a preset explicitly disables a previously active custom palette');
  assert.equal(encodePalette(s)[4],pebbleColor(THEMES[5].bg));
});

test('native palette validation accepts real packets and rejects corrupt versions, colors and lengths',()=>{
  mkdirSync('test-results',{recursive:true});
  writeFileSync('test-results/palette-custom.bin',encodePalette(customSettings()));
  writeFileSync('test-results/palette-preset.bin',encodePalette(defaults()));
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/palette-test.c','watchface/src/c/palette.c','-o','test-results/palette-test']);
  execFileSync('test-results/palette-test',['test-results/palette-custom.bin','test-results/palette-preset.bin']);
});

test('new palettes retain contrast through color-vision simulations and grayscale',()=>{
  assert.equal(contrast('#000000','#FFFFFF'),21);
  assert.deepEqual(simulateRGB([85,85,85],'grayscale'),[85,85,85]);
  for(const t of THEMES.filter(t=>t.zoneGlyphs)){
    for(const mode of VISION_MODES){
      const check=(a,b,min,role)=>assert(contrast(a,b,mode)>=min,`${t.name}: ${role} in ${mode}`);
      check(t.ink,t.bg,7,'time');
      for(const color of [t.accent,...t.marks,...Object.values(t.panelColors)])check(color,t.bg,7,'small labels');
      check(t.land,t.ocean,3,'day coastlines');check(t.nightLand,t.nightOcean,3,'night coastlines');
    }
    for(const c of Object.values(t.panelColors))assert.match(c,/^#(?:00|55|AA|FF){3}$/);
  }
  const mono=THEMES.find(t=>t.name==='Monochrome');
  for(const c of [mono.bg,mono.ink,mono.ocean,mono.land,mono.nightOcean,mono.nightLand,mono.edge,mono.accent,...mono.marks,...Object.values(mono.panelColors)])assert(c.slice(1,3)===c.slice(3,5)&&c.slice(3,5)===c.slice(5,7),'Monochrome must stay neutral');
});

test('theme panel colors reach the watch while old and new custom colors survive palette changes',()=>{
  const s=defaults();
  for(let theme=0;theme<THEMES.length;theme++){
    s.theme=theme;const expected=THEMES[theme].panelColors||defaults().footer.colors;
    assert.deepEqual(panelColors(s),expected);
    assert.deepEqual([...encodeFooter(s).slice(21,29)],PANEL_COLOR_ROLES.map(k=>pebbleColor(expected[k])));
  }
  const legacy=defaults();delete legacy.footer.colorMode;
  assert.equal(validateSettings(legacy,zoneExists).footer.colorMode,'theme');
  legacy.footer.colors.tide='#997744';
  const custom=validateSettings(legacy,zoneExists);assert.equal(custom.footer.colorMode,'custom');
  assert.equal(custom.footer.colors.tide,'#AA5555');
  for(const theme of [8,9,10,11,12,13]){
    custom.theme=theme;assert.equal(panelColors(custom).tide,'#AA5555');
    assert.equal(encodeFooter(custom)[24],pebbleColor('#AA5555'));
  }
  custom.footer.colorMode='theme';assert.equal(panelColors(custom).tide,THEMES[13].panelColors.tide);
  custom.footer.colorMode='invalid';assert.throws(()=>validateSettings(custom,zoneExists),/colorMode/);
});
