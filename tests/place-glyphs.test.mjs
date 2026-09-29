import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists,encodeSettings} from '../shared/protocol.js';
import {MARKERS,CUSTOM_MARKER,placeGlyph} from '../shared/markers.js';
import {encodeGlyphs,GLYPHS_SIZE} from '../shared/glyph-protocol.js';

const SMILE=['.....','.#.#.','.....','#...#','.###.'];
const rowBits=rows=>rows.map(r=>parseInt(r.replaceAll('.','0').replaceAll('#','1'),2));
test('a drawn glyph survives validation and reaches the watch as the same pixels',()=>{
  const s=defaults();s.placeIconsBeside=true;s.places[1]={...s.places[1],icon:CUSTOM_MARKER,glyph:SMILE};
  const v=validateSettings(s,zoneExists);
  assert.deepEqual(v.places[1].glyph,SMILE);assert.equal(v.places[1].icon,CUSTOM_MARKER);assert.equal(v.placeIconsBeside,true);
  const packet=encodeGlyphs(v);assert.equal(packet.length,GLYPHS_SIZE);
  // The settings packet carries glyph ID 12 for the drawn place.
  assert.equal(encodeSettings(v)[16+72+10],CUSTOM_MARKER);
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/place-glyphs-test.c','watchface/src/c/place_glyphs.c','-o','test-results/place-glyphs-test']);
  const out=execFileSync('test-results/place-glyphs-test',{input:[...packet].map(b=>b.toString(16)).join(' ')+' '+v.places.map(p=>p.icon).join(' '),encoding:'utf8'}).trim().split('\n');
  assert.equal(out[0],'1 1');
  v.places.forEach((p,i)=>assert.equal(out[1+i],rowBits(placeGlyph(p)).join(','),`place ${i+1}`));
  assert.equal(out[4],'0000','the watch refuses other versions, rows wider than five, unknown options and short packets');
});
test('built-in glyphs send blank rows; icons beside the clock are off by default',()=>{
  const v=validateSettings(defaults(),zoneExists);
  assert.equal(v.placeIconsBeside,false);
  assert.deepEqual([...encodeGlyphs(v)],[1,0,...Array(15).fill(0)]);
  assert.deepEqual(placeGlyph(v.places[0]),MARKERS[v.places[0].icon].rows);
});
test('a drawn glyph needs five rows of five pixels',()=>{
  const bad=[['#####'],[...SMILE.slice(0,4),'####'],[...SMILE.slice(0,4),'##x##']];
  for(const glyph of bad){const s=defaults();s.places[0]={...s.places[0],icon:CUSTOM_MARKER,glyph};assert.throws(()=>validateSettings(s,zoneExists));}
  const s=defaults();s.places[0]={...s.places[0],icon:CUSTOM_MARKER};assert.throws(()=>validateSettings(s,zoneExists),/pixels/);
  // A built-in glyph may keep an earlier drawing for later.
  const keep=defaults();keep.places[0]={...keep.places[0],glyph:SMILE};assert.deepEqual(validateSettings(keep,zoneExists).places[0].glyph,SMILE);
});
