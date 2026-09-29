// Compares two measure.mjs results (before, after) and writes a Markdown
// summary: instructions per window, what a minute change and a relight add
// over an idle window, and those two per day at the default five-minute relight.
// Usage: node tools/energy/report.mjs before.json after.json [out.md]
import {readFileSync,writeFileSync} from 'node:fs';
const [before,after]=process.argv.slice(2,4).map(f=>JSON.parse(readFileSync(f,'utf8')));
const median=v=>{const s=[...v].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const of=(r,kind,key)=>median(r.windows.filter(w=>w.name.startsWith(kind+'-')).map(w=>w[key]));
const n=x=>Math.round(x).toLocaleString('en-US'),pct=(a,b)=>a?`${((1-b/a)*100).toFixed(1)}%`:'–';
const rows=[],cost={};
for(const r of [before,after]){
  cost[r.label]={};
  for(const key of ['total','app']){
    const idle=of(r,'idle',key);
    cost[r.label][key]={idle,minute:of(r,'minute',key)-idle,relight:of(r,'relight',key)-idle};
  }
  // A day: 1,440 minute changes, 288 of them relights.
  for(const key of ['total','app'])cost[r.label][key].day=1152*cost[r.label][key].minute+288*cost[r.label][key].relight;
}
const b=cost[before.label],a=cost[after.label];
const line=(what,key,field)=>rows.push(`| ${what} | ${n(b[key][field])} | ${n(a[key][field])} | ${pct(b[key][field],a[key][field])} |`);
line('Idle nine seconds (background)','total','idle');
line('A minute change, over idle','total','minute');
line('A relight minute, over idle','total','relight');
line('A day of minute changes and relights','total','day');
line('Of that, app code: a minute change','app','minute');
line('Of that, app code: a relight minute','app','relight');
const md=['### Instructions executed in the emulator','',`| | ${before.label} | ${after.label} | Reduction |`,'|---|---:|---:|---:|',...rows,'',
  `Medians of ${before.windows.length} and ${after.windows.length} nine-second windows. Every executed block is counted, firmware included (drawing, flash reads, display driver); "app code" is code running from RAM. `+
  `Blocks without a translation: ${before.unknown} and ${after.unknown}; translations of one address with different lengths: ${before.ambiguous} and ${after.ambiguous}. `+
  'These are instruction counts, not current: flash, display and radio energy are not modelled.',''].join('\n');
if(process.argv[4])writeFileSync(process.argv[4],md);
console.log(md);
