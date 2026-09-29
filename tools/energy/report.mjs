// Compares the builds counted by count.mjs (windows named
// <build>-<round>~<kind>-<n>) and writes a Markdown summary: instructions per
// window, what a minute change and a relight add over an idle window, those two
// per day at the default five-minute relight, and where in the firmware a
// relight's instructions go. Usage: node tools/energy/report.mjs counts.json [out.md]
import {readFileSync,writeFileSync} from 'node:fs';
const counts=JSON.parse(readFileSync(process.argv[2],'utf8'));
const median=v=>{const s=[...v].sort((a,b)=>a-b),m=s.length>>1;return s.length?s.length%2?s[m]:(s[m-1]+s[m])/2:NaN;};
const parse=w=>{const [label,kind]=w.name.split('~');return {build:label.replace(/-\d+$/,''),kind:kind.replace(/-\d+$/,''),...w,firmware:w.total-w.app};};
const windows=counts.windows.map(parse);
// Builds in the order they were measured; each is compared with the first.
const builds=[...new Set(windows.map(w=>w.build))],has=kind=>windows.some(w=>w.kind===kind);
const of=(build,kind,key)=>median(windows.filter(w=>w.build===build&&w.kind===kind).map(w=>w[key]));
const n=x=>Number.isFinite(x)?Math.round(x).toLocaleString('en-US'):'–',pct=(a,b)=>a&&Number.isFinite(b)?`${((1-b/a)*100).toFixed(1)}%`:'–';
const cost={};
for(const b of builds){cost[b]={};for(const key of ['total','app','firmware']){
  const idle=of(b,'idle',key),c={idle,minute:of(b,'minute',key)-idle,relight:of(b,'relight',key)-idle};
  c.day=1152*c.minute+288*c.relight;cost[b][key]=c;}}
const base=builds[0],rows=[];
const line=(what,key,field)=>rows.push(`| ${what} | ${builds.map((b,i)=>n(cost[b][key][field])+(i?` (${pct(cost[base][key][field],cost[b][key][field])})`:'')).join(' | ')} |`);
line('Idle nine seconds (background)','total','idle');
line('A minute change, over idle','total','minute');
if(has('relight')){line('A relight minute, over idle','total','relight');line('A day of minute changes and relights','total','day');}
for(const [key,name] of [['app','app code'],['firmware','firmware']]){line(`Of a minute change: ${name}`,key,'minute');if(has('relight'))line(`Of a relight minute: ${name}`,key,'relight');}
// Firmware pages (4 KB of code each) where the last build's minute (or
// relight) windows differ most from the first's.
const kind=has('relight')?'relight':'minute',last=builds.at(-1);
const pages=b=>{const ws=windows.filter(w=>w.build===b&&w.kind===kind),keys=new Set(ws.flatMap(w=>Object.keys(w.pages)));return Object.fromEntries([...keys].map(k=>[k,median(ws.map(w=>w.pages[k]||0))]));};
const pb=pages(base),pa=pages(last),diff=[...new Set([...Object.keys(pb),...Object.keys(pa)])].map(k=>[k,(pa[k]||0)-(pb[k]||0)]).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1])).slice(0,10);
const counted=b=>windows.filter(w=>w.build===b).length;
const md=['### Instructions executed in the emulator','',`| | ${builds.join(' | ')} |`,`|---|${builds.map(()=>'---:').join('|')}|`,...rows,'',
  `Medians of ${builds.map(b=>`${counted(b)} (${b})`).join(', ')} nine-second windows, all builds in one emulator in turn; percentages are the reduction from ${base}. Every executed block is counted, firmware included (drawing, flash reads, display driver); app code is code running from RAM. `+
  `Blocks without a translation: ${counts.unknown}; addresses translated with different lengths: ${counts.ambiguous}. These are instruction counts, not current: flash, display and radio energy are not modelled.`,'',
  `#### ${kind==='relight'?'Relight':'Minute'} windows: firmware code pages that differ most, ${last} against ${base}`,'',`| Page | ${base} | ${last} | difference |`,'|---|---:|---:|---:|',
  ...diff.map(([k,d])=>`| 0x${k}000 | ${n(pb[k]||0)} | ${n(pa[k]||0)} | ${d>0?'+':''}${n(d)} |`),''].join('\n');
if(process.argv[3])writeFileSync(process.argv[3],md);
console.log(md);
