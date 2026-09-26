import test from 'node:test';
import assert from 'node:assert/strict';
import {WATCH_COLORS,WATCH_COLOR_LAYOUT,SUNLIGHT,snapToWatch,asOnWatch} from '../shared/pebble-colors.js';
test('the picker offers exactly the watch\'s 64 colors, each with Pebble\'s sunlight appearance',()=>{
  const levels=['00','55','aa','ff'],all=levels.flatMap(r=>levels.flatMap(g=>levels.map(b=>r+g+b)));
  assert.equal(WATCH_COLORS.length,64);assert.deepEqual([...WATCH_COLORS].sort(),[...all].sort());
  assert.deepEqual(WATCH_COLOR_LAYOUT.map(row=>row.length),[6,7,8,9,10,9,8,7],'a hexagon of hexagons');
  for(const c of all)assert.match(SUNLIGHT[c],/^[0-9a-f]{6}$/,c);
  assert.equal(asOnWatch('#000000'),'#000000');assert.equal(asOnWatch('#ff0000'),'#E35462');
  assert.equal(snapToWatch('#123456'),'#005555');assert.equal(snapToWatch('#FEFEFE'),'#FFFFFF');
});
