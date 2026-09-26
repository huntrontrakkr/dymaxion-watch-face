import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {batteryGauge,QUIET_X} from '../shared/status-bar.js';
import {QUIET_ROWS} from '../shared/status-glyphs.js';
import {textWidth} from '../shared/type.js';
const font=JSON.parse(readFileSync('designer/public/type/draft.json','utf8')).lining.small;

test('the battery gauge frames the percentage and fills with the charge',()=>{
  for(const percent of [0,5,50,86,100]){
    const width=textWidth(font,percent+'%'),g=batteryGauge(width,percent);
    // One clear pixel on each side of the figures (right-aligned at g.text).
    assert.equal(g.text-width-2,g.left);assert.equal(g.right,194);assert.equal(g.right+2,196,'the cap ends four pixels from the edge');
    assert(g.fill>=0&&g.fill<=g.right-g.left-1);
  }
  const width=textWidth(font,'50%');
  assert.equal(batteryGauge(width,0).fill,0);assert.equal(batteryGauge(width,100).fill,193-batteryGauge(width,100).left);
  assert.equal(batteryGauge(width,50).fill,Math.trunc(((193-(192-width))*50+50)/100));
});
test('Quiet Time sits between the Bluetooth rune and a full battery gauge',()=>{
  const right=QUIET_X+QUIET_ROWS[0].length-1;
  assert(QUIET_X>=148+7+2,'clear of the Bluetooth rune');
  assert(right<batteryGauge(textWidth(font,'100%'),100).left,'clear of the gauge at 100%');
  // The three Zs never touch, so they read as three letters.
  const pixels=QUIET_ROWS.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='#'?[[x,y]]:[]));
  const seen=new Set(),groups=[];
  for(const p of pixels){if(seen.has(p+''))continue;const group=[p];seen.add(p+'');for(let i=0;i<group.length;i++)for(const q of pixels)if(!seen.has(q+'')&&Math.abs(q[0]-group[i][0])<=1&&Math.abs(q[1]-group[i][1])<=1){seen.add(q+'');group.push(q);}groups.push(group);}
  assert.equal(groups.length,3);
});
