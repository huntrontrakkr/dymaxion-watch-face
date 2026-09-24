import {mkdirSync,writeFileSync} from 'node:fs';
import {MOON_GLYPHS,MOON_FRAMES,MOON_NAMES,MOON_SIZE} from '../shared/moon.js';
import {BLUETOOTH_ROWS,DAY_NIGHT_ROWS,MARKER_HALO_ROWS,SUN_ROWS,SUN_HALO_ROWS,SUN_SIZE,PULSE_ROWS,PULSE_SIZE} from '../shared/status-glyphs.js';

if(MOON_GLYPHS.length!==MOON_FRAMES || MOON_GLYPHS.some(frame=>
  frame.length!==MOON_SIZE || frame.some(row=>row.length!==MOON_SIZE || /[^.o#]/.test(row))))
  throw new Error('Invalid Moon glyphs.');
if(BLUETOOTH_ROWS.length!==11 || BLUETOOTH_ROWS.some(row=>row.length!==7 || /[^.#]/.test(row)))
  throw new Error('Invalid Bluetooth glyph.');
const mask=(row,pixel)=>parseInt([...row].map(ch=>ch===pixel?'1':'0').join(''),2);
const matrix=pixel=>MOON_GLYPHS.map(frame=>'{'+frame.map(row=>mask(row,pixel)).join(',')+'}').join(',\n  ');
const bt=BLUETOOTH_ROWS.map(row=>mask(row,'#')).join(',');
const pixelRows=rows=>'{'+rows.map(row=>mask(row,'#')).join(',')+'}';
mkdirSync('watchface/src/c/generated',{recursive:true});
writeFileSync('watchface/src/c/generated/status_glyphs.h',
  '// Generated from shared/moon.js and shared/status-glyphs.js.\n'
  +`#define MOON_GLYPH_SIZE ${MOON_SIZE}\n#define MOON_GLYPH_COUNT ${MOON_FRAMES}\n`
  +`#define BLUETOOTH_WIDTH 7\n#define BLUETOOTH_HEIGHT 11\n`
  +`static const uint16_t MOON_SHADE_ROWS[MOON_GLYPH_COUNT][MOON_GLYPH_SIZE] = {\n  ${matrix('o')}\n};\n`
  +`static const uint16_t MOON_LIGHT_ROWS[MOON_GLYPH_COUNT][MOON_GLYPH_SIZE] = {\n  ${matrix('#')}\n};\n`
  +`static const uint8_t BLUETOOTH_GLYPH[BLUETOOTH_HEIGHT] = {${bt}};\n`
  +`static const uint32_t DAY_NIGHT_GLYPHS[2][5] = {${DAY_NIGHT_ROWS.map(pixelRows).join(',')}};\n`
  +`static const uint32_t MARKER_HALO[7] = ${pixelRows(MARKER_HALO_ROWS)};\n`
  +`#define SUN_SIZE ${SUN_SIZE}\nstatic const uint32_t SUN_GLYPH[SUN_SIZE] = ${pixelRows(SUN_ROWS)};\nstatic const uint32_t SUN_HALO[SUN_SIZE+2] = ${pixelRows(SUN_HALO_ROWS)};\n`
  +`#define PULSE_SIZE ${PULSE_SIZE}\nstatic const uint32_t PULSE_GLYPHS[4][PULSE_SIZE] = {${PULSE_ROWS.map(pixelRows).join(',')}};\n`);
const pixel=(x,y,color)=>`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
const moonSamples=MOON_GLYPHS.map((rows,i)=>{
  const x=18+i*64;
  const dots=rows.flatMap((row,y)=>[...row].flatMap((ch,px)=>ch==='.'?[]:[pixel(px,y,ch==='#'?'#fff':'#777')])).join('');
  return `<g transform="translate(${x} 23) scale(4)">${dots}</g>`
    +`<text x="${x+18}" y="76" text-anchor="middle">${MOON_NAMES[i]}</text>`;
}).join('');
const bluetooth=BLUETOOTH_ROWS.flatMap((row,y)=>[...row].flatMap((ch,x)=>ch==='#'?[pixel(x,y,'#fff')]:[])).join('');
mkdirSync('docs/screenshots',{recursive:true});
writeFileSync('docs/screenshots/status-glyphs.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="544" height="118" viewBox="0 0 544 118">`
  +`<rect width="544" height="118" fill="#15191f"/>`
  +`<g fill="#c9d0d8" font-family="sans-serif" font-size="8">${moonSamples}`
  +`<g transform="translate(258 91) scale(2)">${bluetooth}</g>`
  +`<text x="281" y="105">Bluetooth connected</text></g></svg>\n`);
console.log('Pixel status masks: eight Moon phases, Bluetooth, day/night, marker halo, sun and four pulse rings.');
