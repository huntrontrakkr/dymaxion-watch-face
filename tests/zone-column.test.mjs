import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {ZONE_TIMES,ZONE_POSITIONS,zoneColumn,zoneColumnFits,zonesBeside,zonesOnMap,zonesOnStrip,zoneStrip,zoneStripEntry,artBeside,besideSide,zoneRow,zoneRowBaseline,tallPixels,tallWidth,TALL_FIGURES,TALL_HEIGHT} from '../shared/zone-column.js';
import {textWidth} from '../shared/type.js';
import {SYSTEM_CLOCKS} from '../shared/system-clock.js';
import fonts from '../assets/type/system-clock.json' with {type:'json'};
import {CHAMFER_METRICS} from '../shared/chamfer-numerals.js';
const caps=JSON.parse(readFileSync('designer/public/type/draft.json')).lining.small,measure=t=>textWidth(caps,t);
const STYLE_CODES=['span',null,'broad',null,'chamfer','leco','bitham-bold','bitham-light','bitham-medium','leco-delta'];
test('the watch lays out place times beside the clock exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/zone-column-test.c','watchface/src/c/zone_column.c','watchface/src/c/caps.c','watchface/src/c/watch_text.c','-o','test-results/zone-column-test']);
  const base=[['NYC',9,5,1,0,0],['LON',17,34,0,0,0],['TYO',1,34,0,1,0],['Tokyo',13,7,0,1,0],['SYDNEY',23,59,1,-1,0],['HNL',0,0,0,-1,0],['X',12,0,0,0,1],['ABCDEFG',11,11,1,0,0]];
  const rows=[0,1].flatMap(icon=>[0,1].flatMap(tall=>[0,1].flatMap(right=>base.map(r=>[...r,right,tall,icon]))));
  const native=execFileSync('test-results/zone-column-test',['watchface/resources/data/caps.bin',...rows.flat().map(String)]).toString().trim().split('\n');
  rows.forEach(([label,hour,minute,clock24,delta,stale,right,tall,icon],i)=>{
    const r=zoneRow({label,hour,minute,clock24:!!clock24,delta,stale:!!stale,side:right?'right':'left',tall:!!tall,icon:!!icon},measure);
    assert.equal(native[i],[r.glyphX,r.label,r.labelX,r.time,r.timeX,r.suffix,r.suffixX,r.day,r.dayX].join('|'),label);
  });
  assert.equal(native[rows.length].trim(),[1,2,3].flatMap(n=>Array.from({length:n},(_,i)=>zoneRowBaseline(i,n))).join(' '));
  let rules='';
  for(let style=0;style<=9;style++)for(const mode of ZONE_TIMES)for(const zonePosition of ZONE_POSITIONS)for(const shown of [false,true]){
    const s={clockDisplay:STYLE_CODES[style]??'none',zoneTimes:mode,zonePosition};rules+=`${+zonesBeside(s,shown)}${+zonesOnMap(s,shown)}${+zonesOnStrip(s,shown)}`;}
  assert.equal(native[rows.length+1],rules);
  assert.equal(native[rows.length+2],`${zoneColumn('left').shift} ${zoneColumn('right').shift}`);
  assert.equal(native[rows.length+3].trim(),[1,2,3].flatMap(n=>Array.from({length:n},(_,i)=>zoneRowBaseline(i,n,true))).join(' '),'tall baselines');
  ['01:23','45:67','89:00'].forEach((t,i)=>{
    const [pixels,advance]=native[rows.length+4+i].split('|');
    assert.equal(pixels.trim(),tallPixels(t).map(p=>p.join(',')).join(' '),t+' tall pixels');
    assert.equal(Number(advance),30,t+' advances 7 a figure, 2 the colon');assert.equal(tallWidth(t),30);
  });
});
test('rows fit the column on either side, clear of the shifted figures, on the figures\' rows',()=>{
  assert.deepEqual(ZONE_POSITIONS,['left','right','map','strip']);
  for(const side of ['left','right']){const {x,right,shift}=zoneColumn(side);
    for(const icon of [false,true])for(const tall of [false,true])for(const clock24 of [true,false])for(const delta of [-1,0,1])for(const label of ['NYC','LON','TYO','SYDNEY','W']){
      const r=zoneRow({label,hour:23,minute:59,clock24,delta,side,tall,icon},measure),t=tall?1:0;
      // An icon leads the row, a glyph and 2 before the label.
      assert.equal(r.labelX,x+(icon?7:0));if(icon)assert.equal(r.glyphX-2,x);// Without icons a label keeps at least three letters; with one, two, or
      // none in a 12-hour row with a day offset, where the glyph names the place.
      if(!icon)assert(r.label.length>=Math.min(3,label.length),`${label}: at least three letters`);
      else assert(r.label.length>=Math.min(2,label.length)||(!clock24&&delta),`${label}: at least two letters beside an icon`);
      if(icon&&label.length>1&&r.label.length===1)assert.fail('a label cut to one letter beside an icon');
      // The day offset follows the label; both clear the time.
      const labelEnd=r.day?r.dayX+measure(r.day):r.labelX+measure(r.label);
      if(r.day)assert.equal(r.dayX,r.labelX+measure(r.label)+1-t,'the day offset sits right after the label');
      assert(labelEnd<=r.timeX-2+t,`${side} ${label} clears the time`);
      assert(r.suffixX+measure(r.suffix)-t<=right);
      assert.equal(r.timeX,zoneRow({label:'X',hour:1,minute:1,clock24,delta:0,side,tall,icon},measure).timeX,'times line up in one column');
    }
    // Shifted, Chamfer and every system font clear the column by 3 pixels.
    const inkLeft=[CHAMFER_METRICS.starts[0]],inkRight=[CHAMFER_METRICS.starts.at(-1)+CHAMFER_METRICS.digitWidth];
    for(const id of SYSTEM_CLOCKS){const f=fonts[id];
      for(let h=0;h<24;h++)for(let m=0;m<60;m+=7){const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
        let cur=Math.trunc((200-[...t].reduce((s,c)=>s+f.glyphs[c].advance,0))/2),l=999,e=0;
        for(const c of t){const g=f.glyphs[c];if(g.width){l=Math.min(l,cur+g.left);e=Math.max(e,cur+g.left+g.width);}cur+=g.advance;}
        inkLeft.push(l);inkRight.push(e);}}
    const lo=Math.min(...inkLeft)+shift,hi=Math.max(...inkRight)+shift;
    assert(lo>=0&&hi<=200,`${side}: figures stay on screen`);
    assert(side==='left'?lo>=right+3:hi<=x-3,`${side}: figures clear the column (${lo}-${hi})`);
  }
  assert(zoneColumnFits('chamfer')&&!zoneColumnFits('broad')&&!zoneColumnFits('span'));
  for(const n of [1,2,3]){assert(zoneRowBaseline(0,n)-7>=2);assert(zoneRowBaseline(n-1,n)<=38);}
  for(const n of [1,2,3]){assert(zoneRowBaseline(0,n,true)-TALL_HEIGHT>=2,'tall rows start below the status line');assert(zoneRowBaseline(n-1,n,true)<=38,'and end above the map');}
  for(const [c,g] of Object.entries(TALL_FIGURES)){assert.equal(g.length,TALL_HEIGHT,c);assert(g.every(r=>r.length===g[0].length&&/^[.#]+$/.test(r)),c);}
  assert.equal(new Set([...'0123456789'].map(c=>TALL_FIGURES[c].join(''))).size,10,'every tall figure distinct');
});
test('place times between the clock and the map: one line, spread evenly, the same on the watch',()=>{
  const cases=[],expected=[];let seed=5;const rand=n=>(seed=(seed*1103515245+12345)%2147483648)%n;
  const labels=['NYC','LON','TYO','SYDNEY','HONOLULU','W','ABCDEFG'];
  for(let k=0;k<600;k++){
    const compact=k>=300,timeWidth=compact?measure:tallWidth,n=1+rand(3),clock24=rand(2),places=Array.from({length:n},()=>[labels[rand(labels.length)],rand(24),rand(60),clock24,rand(3)-1,+(rand(10)===0)]);
    cases.push([n,+compact,...places.flat()].join(' '));
    const items=zoneStrip(places.map(([label,hour,minute,c,delta,stale])=>zoneStripEntry({label,hour,minute,clock24:!!c,delta,stale:!!stale})),measure,compact);
    expected.push(items.map(i=>[i.label,i.time,i.suffix,i.day,i.glyphX,i.labelX,i.timeX,i.suffixX,i.dayX].join('|')).join(' '));
    // Everything on the line fits the width, in order, a pixel or more apart.
    const last=items.at(-1),end=last.day?last.dayX+measure(last.day)-1:last.suffix?last.suffixX+measure(last.suffix)-1:last.timeX+timeWidth(last.time)-1;
    assert(items[0].glyphX-2>=2&&end<=197,`fits: ${cases.at(-1)}`);
    items.forEach((it,i)=>{if(i)assert(it.glyphX-2>items[i-1].dayX,'in order');});
  }
  const native=execFileSync('test-results/zone-column-test',['watchface/resources/data/caps.bin','strip'],{input:cases.join('\n')}).toString().trim().split('\n');
  assert.deepEqual(native,expected);
  // Three places with their three-letter codes fit in 24- and 12-hour time.
  for(const compact of [false,true])for(const clock24 of [true,false]){const items=zoneStrip([['NYC',9],['LON',14],['TYO',22]].map(([label,hour],i)=>zoneStripEntry({label,hour,minute:7,clock24,delta:i===2?1:0})),measure,compact);assert(items.every(i=>i.label.length===3),'labels kept');}
});
test('the icosahedron holds the column beside a narrow clock; place times take its place',()=>{
  const base={clockDisplay:'chamfer',zonePosition:'left',clockArt:'right'};
  assert.equal(artBeside(base),true);assert.equal(besideSide(base),'right','the column follows the icosahedron');
  assert.equal(artBeside({...base,clockDisplay:'broad'}),false,'no room beside Broad');
  assert.equal(besideSide({...base,clockArt:'none'}),'left');
});
