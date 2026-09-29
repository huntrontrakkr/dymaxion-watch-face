// Records instruction counts for the installed build in the Pebble emulator
// (CI: .github/workflows/energy.yml). The emulator must have been started
// through tools/energy/qemu-trace.sh. It sends the default settings, then
// opens a nine-second window, through QEMU's monitor, around each of these:
//   minute  an ordinary minute change (the clock, top bar and tray change)
//   relight a minute that also relights the map (every five minutes by default)
//   idle    nine seconds with no minute change: the background to subtract
// Both builds run in one emulator in turn, so the host's speed (which sets how
// long the firmware spins waiting on emulated devices) is the same for both.
// Windows are named <label>~<kind>-<n>; count.mjs counts them afterwards.
// Usage: node tools/energy/measure.mjs <label> [repeats] [message_keys.json]
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {connect} from 'node:net';
import {defaults} from '../../shared/settings.js';
import {encodeSettings} from '../../shared/protocol.js';
import {encodeFooter} from '../../shared/panel-protocol.js';
import {encodeDisplay} from '../../shared/display.js';
import {encodePalette} from '../../shared/palette-protocol.js';
import {encodeCity} from '../../shared/city.js';

const label=process.argv[2]||'build',repeats=Number(process.argv[3]||2);
const dir=resolve(process.env.QEMU_TRACE_DIR),out=resolve('test-results/energy');mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pebble=(...args)=>execFileSync('pebble',[...args,'--emulator','emery'],{cwd:'watchface',stdio:['ignore','inherit','inherit'],timeout:60000});
const info=JSON.parse(readFileSync('/tmp/pb-emulator.json','utf8')).emery,port=Object.values(info)[0].qemu.monitor;
// One command through QEMU's monitor: wait for its prompt, send, then wait for
// the prompt that follows the command's output.
const monitor=command=>new Promise((ok,fail)=>{
  const s=connect(port,'127.0.0.1');let text='',sent=false;
  const timer=setTimeout(()=>{s.destroy();fail(new Error('monitor: no reply to '+command+': '+text));},5000);
  s.on('data',d=>{
    text+=d;
    if(!sent&&text.includes('(qemu) ')){sent=true;text='';s.write(command+'\n');}
    else if(sent&&text.includes('(qemu) ')){clearTimeout(timer);s.end();ok(text);}
  });
  s.on('error',e=>{clearTimeout(timer);fail(e);});
});
import {readdirSync} from 'node:fs';
let file=1+Math.max(0,...readdirSync(dir).map(f=>parseInt(f,10)).filter(Number.isFinite));const next=name=>join(dir,String(file++).padStart(4,'0')+'-'+name+'.log');
async function window(name,ms){
  await monitor('logfile '+next('window-'+label+'~'+name));await monitor('log in_asm,exec,nochain');
  await sleep(ms);
  await monitor('log in_asm,nochain');await monitor('logfile '+next('gap'));
}
// Default settings, as the phone sends them on Save; a typed-in city.
const KEY=JSON.parse(readFileSync(process.argv[4]||'watchface/build/js/message_keys.json','utf8')),settings={...defaults(),location:{mode:'manual',name:'Norfolk'}};
const files={SETTINGS:encodeSettings(settings),FOOTER:encodeFooter(settings),DISPLAY:encodeDisplay(settings),PALETTE:encodePalette(settings),CITY:encodeCity({name:'Norfolk',manual:true})};
pebble('send-app-message','--bytes-file',...Object.entries(files).map(([k,b])=>{const f=join(out,`${label}-${k}.bin`);writeFileSync(f,b);return `${KEY[k]}=${f}`;}));
await sleep(20000);
const want={minute:repeats,relight:repeats,idle:repeats},got={minute:0,relight:0,idle:0},names=[];
const until=async second=>{while(new Date().getUTCSeconds()!==second)await sleep(200);};
while(Object.keys(want).some(k=>got[k]<want[k])){
  const s=new Date().getUTCSeconds();
  if(s>=50){await sleep(12000);continue;}
  // Nine seconds from :15, clear of any minute change.
  if(got.idle<want.idle&&s<15){await until(15);const n='idle-'+(++got.idle);await window(n,9000);names.push(n);continue;}
  // Nine seconds from :56, across the minute change.
  await until(56);
  const kind=(new Date().getUTCMinutes()+1)%5===0?'relight':'minute';
  if(got[kind]>=want[kind]){await sleep(10000);continue;}
  const n=kind+'-'+(++got[kind]);await window(n,9000);names.push(n);
}
await monitor('log in_asm,nochain');
console.log(label,'windows:',names.join(' '));
