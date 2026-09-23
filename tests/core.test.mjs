import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildNetFuller,makeMap,direction,dot,GF} from '../shared/map.js';
import {defaults,PRESETS,validateSettings,THEMES,MOON_COLORS,quantizeColor,pebbleColor,markColor} from '../shared/settings.js';
import {MARKERS,MARKER_SIZE} from '../shared/markers.js';
import {encodeSettings,zoneExists,packetOffset} from '../shared/protocol.js';
import {sunDirection} from '../shared/solar.js';
import {lunarPhase,moonFrame,moonDescription,MOON_FRAMES,MOON_SIZE,MOON_GLYPHS} from '../shared/moon.js';
import {BLUETOOTH_ROWS,DAY_NIGHT_ROWS,MARKER_HALO_ROWS,PULSE_ROWS} from '../shared/status-glyphs.js';
const at=iso=>Date.parse(iso),seconds=iso=>Math.floor(at(iso)/1000);
test('original canonical net retains 20 faces, 22 placements and both split faces',()=>{
  const net=buildNetFuller();assert.equal(GF.length,20);assert.equal(net.length,22);
  for(const tri of [9,16])assert.deepEqual(net.filter(t=>t.tri===tri).flatMap(t=>t.lcd).sort(),[1,2,3,4,5,6]);
});
test('projection and inverse round trip globally including both placements of split faces',()=>{
    const m=makeMap();
    for(let lat=-89;lat<90;lat+=3)for(let lon=-179;lon<180;lon+=5){
      const p=m.project(lat,lon),d=m.inverse(...p);
      assert.ok(d,`${lat},${lon} missing`);assert.ok(Math.abs(1-dot(direction(lat,lon),d[0]))<1e-10);
      assert.ok(p[0]>=0&&p[0]<m.width&&p[1]>=0&&p[1]<m.height);
    }
    const a=m.project(5,20),b=m.project(5,25),c=m.project(10,20);
    assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0,'no mirroring');
});
test('baked map direction agrees with arbitrary geographic markers within a pixel',()=>{
    const m=makeMap(),bytes=readFileSync('watchface/resources/maps/map-0.bin');
    assert.equal(bytes.length,m.width*m.height*4);
    for(const p of defaults().places){const [x,y]=m.project(p.lat,p.lon).map(Math.floor),i=(y*m.width+x)*4;assert.ok(bytes[i+3]&3);const d=[0,1,2].map(j=>bytes.readInt8(i+j)/127);assert.ok(Math.abs(Math.hypot(...d)-1)<.007);assert.ok(dot(d.map(v=>v/Math.hypot(...d)),direction(p.lat,p.lon))>.999);}
});
test('cached offsets change at exact DST boundaries and preserve fractional zones',()=>{
  const s=defaults(),packet=encodeSettings(s,at('2026-01-01T00:00:00Z'));
  for(const [iso,expected]of [['2026-03-08T06:59:59Z',-300],['2026-03-08T07:00:00Z',-240],['2026-11-01T05:59:59Z',-240],['2026-11-01T06:00:00Z',-300]])assert.equal(packetOffset(packet,0,seconds(iso)),expected);
  assert.equal(packetOffset(packet,1,seconds('2026-03-29T00:59:59Z')),0);
  assert.equal(packetOffset(packet,1,seconds('2026-03-29T01:00:00Z')),60);
  s.places[0].tz='Asia/Kathmandu';s.places[1].tz='Asia/Kolkata';s.places[2].tz='Australia/Sydney';
  const fractional=encodeSettings(s,at('2026-01-01T00:00:00Z'));
  assert.equal(packetOffset(fractional,0,seconds('2026-10-01T00:00:00Z')),345);
  assert.equal(packetOffset(fractional,1,seconds('2026-10-01T00:00:00Z')),330);
  assert.equal(packetOffset(fractional,2,seconds('2026-04-04T15:59:59Z')),660);
  assert.equal(packetOffset(fractional,2,seconds('2026-04-04T16:00:00Z')),600);
});
test('invalid imports fail before replacing settings; placements are constrained',()=>{
  const s=defaults();assert.throws(()=>validateSettings({...s,places:[{}]},zoneExists));
  s.places[0].tz='Invented/Zone';assert.throws(()=>validateSettings(s,zoneExists));
  s.places[0].tz='Europe/London';s.places[0].lat=91;assert.throws(()=>validateSettings(s,zoneExists));
  s.places[0].lat=51;s.time=[-100,900];assert.deepEqual(validateSettings(s,zoneExists).time,[0,182]);
  assert.throws(()=>validateSettings({...s,time:[NaN,4]},zoneExists));
  for(const theme of THEMES)for(const v of Object.values(theme).flat())if(typeof v==='string'&&v.startsWith('#'))assert.match(v,/^#(?:00|55|AA|FF){3}$/i);
  for(const palette of MOON_COLORS)for(const color of palette)assert.match(color,/^#(?:00|55|AA|FF){3}$/i);
  assert.equal(MOON_COLORS.length,THEMES.length);
  for(let theme=0;theme<THEMES.length;theme++){
    const colored=validateSettings({...defaults(),theme},zoneExists);
    const packet=encodeSettings(colored);
    assert.equal(packet[1],theme);
    for(let i=0;i<3;i++)assert.equal(packet[16+i*72+70],pebbleColor(THEMES[theme].marks[i]));
  }
  for(const theme of [-1,THEMES.length,255,4.5])assert.throws(()=>validateSettings({...defaults(),theme},zoneExists));
});
test('small map glyphs are distinct and match the native pixel table',()=>{
  assert.equal(MARKERS.length,5);assert.equal(MARKER_SIZE,5);
  const patterns=new Set();
  for(const marker of MARKERS){
    assert.equal(marker.rows.length,MARKER_SIZE);
    assert.ok(marker.rows.every(row=>row.length===MARKER_SIZE&&/^[.#]+$/.test(row)));
    patterns.add(marker.rows.join(''));
  }
  assert.equal(patterns.size,MARKERS.length);
  assert.match(readFileSync('watchface/src/c/settings.h','utf8'),new RegExp(`#define MARKER_COUNT ${MARKERS.length}\\b`));
  const header=readFileSync('watchface/src/c/generated/markers.h','utf8');
  const native=[...header.matchAll(/\{([0-9,]+)\}/g)].map(match=>match[1].split(',').map(Number));
  assert.deepEqual(native,MARKERS.map(marker=>marker.rows.map(row=>parseInt(row.replaceAll('.','0').replaceAll('#','1'),2))));
});
test('each place can retain a distinct watch-palette color',()=>{
  const s=defaults();assert.equal(s.places[0].color,null);
  assert.equal(quantizeColor('#cc7700'),'#AA5500');assert.equal(pebbleColor('#AA5500'),0xe4);
  s.places[0].icon=4;s.places[0].color='#cc7700';
  s.places[1].color='#00ff55';
  const clean=validateSettings(s,zoneExists);
  assert.equal(clean.places[0].color,'#AA5500');assert.equal(clean.places[1].color,'#00FF55');
  const packet=encodeSettings(clean);
  assert.equal(packet[0],7);assert.equal(packet[16+10],4);
  assert.equal(packet[16+70],0xe4);assert.equal(packet[16+72+70],0xcd);
  assert.equal(packet[16+2*72+70],pebbleColor(markColor(clean.places[2],clean,2)));
  assert.throws(()=>validateSettings({...s,places:[{...s.places[0],color:'red'},...s.places.slice(1)]},zoneExists));
  const legacy=validateSettings({...s,places:s.places.map(({color,...place})=>place)},zoneExists);
  assert.ok(legacy.places.every(place=>place.color===null));
  const older={...s,places:s.places.map(p=>({...p}))};delete older.markerSet;
  older.places[0].icon=20;
  const migrated=validateSettings(older,zoneExists);
  assert.equal(migrated.markerSet,2);assert.equal(migrated.places[0].icon,3);
  assert.equal(migrated.places[0].color,'#AA5500');
  assert.throws(()=>validateSettings({...older,places:[{...older.places[0],icon:21},...older.places.slice(1)]},zoneExists));
});
test('solar geometry: opposite seasons, equinox noon and UTC date rollover',()=>{
  const june=sunDirection(new Date('2026-06-21T12:00:00Z')),dec=sunDirection(new Date('2026-12-21T12:00:00Z'));
  assert.ok(june[2]>.38&&june[2]<.41);assert.ok(dec[2]<-.38&&dec[2]>-.41);
  const noon=sunDirection(new Date('2026-03-20T12:00:00Z'));assert.ok(noon[0]>.99&&Math.abs(noon[2])<.03);
  const a=sunDirection(new Date('2026-12-31T23:59:00Z')),b=sunDirection(new Date('2027-01-01T00:00:00Z'));assert.ok(dot(a,b)>.9999);
});
test('lunar phase selects the eight familiar glyphs near published primary phases',()=>{
  // US Naval Observatory primary phase times, September–October 2026 UTC.
  for(const [iso,expected] of [
    ['2026-09-11T03:27:00Z',0],['2026-09-18T20:44:00Z',.25],
    ['2026-09-26T16:49:00Z',.5],['2026-10-03T13:25:00Z',.75]
  ]){
    const phase=lunarPhase(new Date(iso));
    assert.ok(Math.abs(phase-expected)<.002||Math.abs(phase-expected-1)<.002,`${iso}: ${phase}`);
    assert.equal(moonFrame(new Date(iso)),Math.round(expected*MOON_FRAMES));
  }
  assert.match(moonDescription(new Date('2026-09-22T12:00:00Z')).name,/Waxing gibbous/);
  assert.equal(MOON_FRAMES,8);assert.equal(MOON_SIZE,9);
  assert.ok(MOON_GLYPHS.every(rows=>rows.length===MOON_SIZE&&rows.every(row=>row.length===MOON_SIZE&&/^[.o#]+$/.test(row))));
  const lit=i=>MOON_GLYPHS[i].join('').split('#').length-1;
  assert.equal(lit(0),0);assert.ok(lit(4)>40);
  for(let i=1;i<5;i++)assert.ok(lit(i)>lit(i-1),`waxing frame ${i}`);
  for(let i=5;i<8;i++)assert.ok(lit(i)<lit(i-1),`waning frame ${i}`);
  for(let i=1;i<4;i++)assert.equal(lit(i),lit(8-i));
  assert.equal(MOON_GLYPHS[2][4][1],'o');assert.equal(MOON_GLYPHS[2][4][7],'#');
  assert.equal(MOON_GLYPHS[6][4][1],'#');assert.equal(MOON_GLYPHS[6][4][7],'o');
  const header=readFileSync('watchface/src/c/generated/status_glyphs.h','utf8');
  const mask=(row,char)=>parseInt([...row].map(pixel=>pixel===char?'1':'0').join(''),2);
  for(const [key,char] of [['MOON_SHADE_ROWS','o'],['MOON_LIGHT_ROWS','#']]){
    const table=header.split(key+'[MOON_GLYPH_COUNT][MOON_GLYPH_SIZE] = {')[1].split('\n};')[0];
    const rows=[...table.matchAll(/\{([0-9,]+)\}/g)].map(match=>match[1].split(',').map(Number));
    assert.deepEqual(rows,MOON_GLYPHS.map(frame=>frame.map(row=>mask(row,char))));
  }
  const bt=header.match(/BLUETOOTH_GLYPH\[BLUETOOTH_HEIGHT\] = \{([0-9,]+)\}/)[1].split(',').map(Number);
  assert.deepEqual(bt,BLUETOOTH_ROWS.map(row=>mask(row,'#')));
  for(const [name,expected]of [['DAY_NIGHT_GLYPHS',DAY_NIGHT_ROWS],['PULSE_GLYPHS',PULSE_ROWS]]){
    const table=header.split(name)[1].split(';')[0];
    const native=[...table.matchAll(/\{([0-9,]+)\}/g)].map(match=>match[1].split(',').map(Number));
    assert.deepEqual(native,expected.map(rows=>rows.map(row=>mask(row,'#'))));
  }
  const halo=header.match(/MARKER_HALO\[7\] = \{([0-9,]+)\}/)[1].split(',').map(Number);
  assert.deepEqual(halo,MARKER_HALO_ROWS.map(row=>mask(row,'#')));
});
test('full-width clock and top-bar moon migrate old widget settings',()=>{
  const s=defaults();assert.deepEqual(s.time,[0,20]);assert.equal(s.moonIndicator,true);
  const packet=encodeSettings(s);assert.equal(packet[0],7);assert.equal(packet[16+17],1);
  assert.equal(packet[16+72+17],0);assert.equal(packet[16+71],0);assert.ok(packet[16+70]>=0xc0);
  const disabled=encodeSettings({...s,moonIndicator:false});assert.equal(disabled[16+17],0);
  const old={...s,time:[28,20],widgets:[{type:4,pos:[2,29]},{type:2,pos:[174,29]}]};delete old.moonIndicator;
  const migrated=validateSettings(old,zoneExists);
  assert.deepEqual(migrated.time,PRESETS.atlas.time);assert.equal(migrated.moonIndicator,true);
  assert.equal('widgets' in migrated,false);
  assert.throws(()=>validateSettings({...s,moonIndicator:3},zoneExists));
});
test('old saved presets adopt the enlarged map; custom arrangements keep their positions',()=>{
  const saved={...defaults(),time:[20,18],map:[4,73]};
  const migrated=validateSettings(saved,zoneExists);
  assert.deepEqual(migrated.time,PRESETS.atlas.time);
  assert.deepEqual(migrated.map,PRESETS.atlas.map);
  const custom=validateSettings({...saved,time:[31,28],zones:[[8,187],[71,180],[132,188]]},zoneExists);
  assert.deepEqual(custom.time,[0,28]);
  assert.deepEqual(custom.zones,[[8,187],[71,180],[132,188]]);
  assert.deepEqual(custom.map,[0,73],'map origin stays within the new display bounds');
  const oldPortrait={...defaults(),orientation:1,stacked:true,time:[0,76],map:[48,20],zones:[[139,23],[139,96],[139,169]],theme:2};
  const flattened=validateSettings(oldPortrait,zoneExists);
  assert.equal(flattened.orientation,0);
  assert.deepEqual(flattened.time,PRESETS.atlas.time);
  assert.deepEqual(flattened.map,PRESETS.atlas.map);
  assert.equal(flattened.theme,2);
  assert.deepEqual(flattened.places,oldPortrait.places);
});
test('native packet reader validates JS packets and rejects truncated or corrupt input',()=>{
  mkdirSync('test-results',{recursive:true});
  for(const [name,preset]of Object.entries(PRESETS)){const s={...defaults(),...preset};writeFileSync(`test-results/${name}.bin`,encodeSettings(s,at('2026-01-01T00:00:00Z')));}
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/settings-test.c','watchface/src/c/settings.c','-o','test-results/settings-test']);
  execFileSync('test-results/settings-test',['test-results/atlas.bin','test-results/horizon.bin']);
});
