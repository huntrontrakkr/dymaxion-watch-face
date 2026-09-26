import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ICOSAHEDRON_ROWS,ICOSAHEDRON_WIDTH,ICOSAHEDRON_HEIGHT,clockArtSpot} from '../shared/clock-art.js';
import {ZONE_COLUMN} from '../shared/zone-column.js';

test('the icosahedron is mirror-symmetric and sits in the column the shifted clock leaves',()=>{
  assert.equal(ICOSAHEDRON_ROWS.length,ICOSAHEDRON_HEIGHT);
  for(const row of ICOSAHEDRON_ROWS){assert.equal(row.length,ICOSAHEDRON_WIDTH);assert.equal(row,[...row].reverse().join(''),'mirror-symmetric');}
  // Pointed top and bottom, one pixel each: a hexagon seen with a corner up.
  assert.equal(ICOSAHEDRON_ROWS[0].replaceAll('.',''),'#');assert.equal(ICOSAHEDRON_ROWS.at(-1).replaceAll('.',''),'#');
  // Chamfer and the system fonts' ink spans x 37-162; shifted 36 aside it leaves
  // 0-72 on the left or 127-199 on the right. The figure stays inside that,
  // and inside the 40-pixel strip.
  const left=clockArtSpot('left'),right=clockArtSpot('right');
  assert(left.x>=0&&left.x+ICOSAHEDRON_WIDTH-1<37+ZONE_COLUMN.shift);
  assert(right.x>162-ZONE_COLUMN.shift&&right.x+ICOSAHEDRON_WIDTH-1<=199);
  assert(left.y>=0&&left.y+ICOSAHEDRON_HEIGHT<=40);
});
test('the watch draws the same icosahedron',()=>{
  const header=readFileSync('watchface/src/c/generated/status_glyphs.h','utf8');
  const rows=header.match(/ICOSAHEDRON_GLYPH\[ICOSAHEDRON_HEIGHT\] = \{([^}]*)\}/)[1].split(',').map(v=>BigInt(v.replace('ull','')));
  assert.deepEqual(rows,ICOSAHEDRON_ROWS.map(r=>BigInt('0b'+r.replaceAll('.','0').replaceAll('#','1'))));
  assert.match(header,new RegExp(`#define ICOSAHEDRON_LEFT_X ${clockArtSpot('left').x}\\b`));assert.match(header,new RegExp(`#define ICOSAHEDRON_RIGHT_X ${clockArtSpot('right').x}\\b`));
});
