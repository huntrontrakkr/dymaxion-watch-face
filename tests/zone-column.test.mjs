import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {ZONE_COLUMN,ZONE_TIMES,zoneColumnFits,zonesBeside,zoneRow,zoneRowBaseline} from '../shared/zone-column.js';
import {textWidth} from '../shared/type.js';
import {SYSTEM_CLOCKS} from '../shared/system-clock.js';
import fonts from '../assets/type/system-clock.json' with {type:'json'};
import {CHAMFER_METRICS} from '../shared/chamfer-numerals.js';
const caps=JSON.parse(readFileSync('designer/public/type/draft.json')).lining.small,measure=t=>textWidth(caps,t);
const STYLE_CODES=['span',null,'broad',null,'chamfer','leco','bitham-bold','bitham-light','bitham-medium','leco-delta'];
test('the watch lays out place times beside the clock exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/zone-column-test.c','watchface/src/c/zone_column.c','watchface/src/c/caps.c','-o','test-results/zone-column-test']);
  const rows=[['NYC',9,5,1,0,0],['LON',17,34,0,0,0],['TYO',1,34,0,1,0],['Tokyo',13,7,0,1,0],['SYDNEY',23,59,1,-1,0],['HNL',0,0,0,-1,0],['X',12,0,0,0,1],['ABCDEFG',11,11,1,0,0]];
  const native=execFileSync('test-results/zone-column-test',['watchface/resources/data/caps.bin',...rows.flat().map(String)]).toString().trim().split('\n');
  rows.forEach(([label,hour,minute,clock24,delta,stale],i)=>{
    const r=zoneRow({label,hour,minute,clock24:!!clock24,delta,stale:!!stale},measure);
    assert.equal(native[i],[r.label,r.labelX,r.time,r.timeX,r.suffix,r.suffixX,r.day,r.dayX].join('|'),label);
  });
  assert.equal(native[rows.length].trim(),[1,2,3].flatMap(n=>Array.from({length:n},(_,i)=>zoneRowBaseline(i,n))).join(' '));
  let rules='';
  for(let style=0;style<=9;style++)for(const stacked of [false,true])for(const mode of ZONE_TIMES)for(const shown of [false,true])
    rules+=+zonesBeside({stacked,clockDisplay:STYLE_CODES[style]??'none',zoneTimes:mode},shown);
  assert.equal(native[rows.length+1],rules);
});
test('rows fit the column, clear of the shifted figures, on the figures\' rows',()=>{
  const {x,right,shift}=ZONE_COLUMN;
  for(const clock24 of [true,false])for(const delta of [-1,0,1])for(const label of ['NYC','LON','TYO','SYDNEY','W']){
    const r=zoneRow({label,hour:23,minute:59,clock24,delta},measure);
    assert(r.labelX>=x&&r.labelX+measure(r.label)<=r.timeX-3,'label clears the time');
    assert(r.label.length>=Math.min(3,label.length),`${label}: at least three letters`);
    assert((r.day?r.dayX+measure(r.day):r.suffixX+measure(r.suffix))<=right);
    assert.equal(r.timeX,zoneRow({label:'X',hour:1,minute:1,clock24,delta:0},measure).timeX,'times line up in one column');
  }
  // Shifted, Chamfer and every system font end before the column.
  assert(CHAMFER_METRICS.starts.at(-1)+CHAMFER_METRICS.digitWidth+shift<x-1);
  for(const id of SYSTEM_CLOCKS){const f=fonts[id];
    for(let h=0;h<24;h++)for(let m=0;m<60;m+=7){const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
      let cur=Math.trunc((200-[...t].reduce((s,c)=>s+f.glyphs[c].advance,0))/2),left=999,end=0;
      for(const c of t){const g=f.glyphs[c];if(g.width){left=Math.min(left,cur+g.left);end=Math.max(end,cur+g.left+g.width);}cur+=g.advance;}
      assert(end+shift<x-1&&left+shift>=0,`${id} ${t}`);}}
  assert(zoneColumnFits('chamfer')&&!zoneColumnFits('broad')&&!zoneColumnFits('span'));
  // Rows sit on the figures (y 2-37): top of the first glyph and bottom of the last.
  for(const n of [1,2,3]){assert(zoneRowBaseline(0,n)-7>=2);assert(zoneRowBaseline(n-1,n)<=38);}
});
