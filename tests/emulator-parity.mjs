// The real watch build in the Pebble emulator against the workshop preview, at
// the same minute, for a few set-ups. Run in CI after `pebble build`, with the
// workshop served (npm run dev) and the emulator's host clock in UTC. Writes
// test-results/emulator/*.png (watch | preview | differing pixels in red).
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {defaults,THEMES} from '../shared/settings.js';
import {encodeSettings} from '../shared/protocol.js';
import {encodeFooter,encodeEnvironment} from '../shared/panel-protocol.js';
import {encodeDisplay} from '../shared/display.js';
import {encodePalette} from '../shared/palette-protocol.js';
import {sampleEnvironment} from '../shared/panel-data.js';
import {encodeCity} from '../shared/city.js';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173',out='test-results/emulator';
mkdirSync(out,{recursive:true});
// Message key numbers as the SDK assigned them for this build.
const KEY=JSON.parse(readFileSync('watchface/build/js/message_keys.json','utf8'));
for(const k of ['SETTINGS','FOOTER','DISPLAY','PALETTE','TIDE','CITY'])if(!Number.isInteger(KEY[k]))throw new Error('No message key for '+k);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// pebble-tool respawns the phone simulator when it has stopped, which can take
// a moment to accept connections: try each command a few times.
const pebble=async(...args)=>{
  for(let attempt=1;;attempt++){
    try{execFileSync('pebble',[...args,'--emulator','emery'],{cwd:'watchface',stdio:['ignore','inherit','inherit'],timeout:60000});return;}
    catch(error){
      if(attempt===4){try{console.log(readFileSync('/tmp/pb-emulator.json','utf8'));console.log(execFileSync('ps',['-eo','pid,stat,cmd']).toString().split('\n').filter(l=>/qemu|pypkjs/.test(l)).join('\n'));}catch{}throw error;}
      console.log(`pebble ${args[0]} failed (attempt ${attempt}); retrying`);await sleep(5000);
    }
  }
};
const theme=name=>THEMES.findIndex(t=>t.name===name);
const cases={
  'default':{},
  'place times between the clock and the map':{zoneTimes:'always',zonePosition:'strip'},
  'icosahedron beside the clock, battery gauge':{clockArt:'left',zoneTimes:'panel',batteryGauge:true,theme:theme('Paper')},
  'tides with highs and lows':{footer:{...defaults().footer,pages:['tide','zones'],home:'tide',tide:{...defaults().footer.tide,station:'8638610'}}}
};

await pebble('emu-battery','--percent','86');await pebble('emu-bt-connection','--connected','yes');
// Let the phone app's own start-up sync finish before sending ours.
await sleep(15000);
const browser=await chromium.launch(),rows=[];let failed=0;
try{
  for(const [name,change] of Object.entries(cases)){
    const settings={...defaults(),...change,location:{mode:'manual',name:'Norfolk'}},slug=name.replace(/\W+/g,'-');
    // Capture within one minute, clear of the minute change and its animation.
    let shot,at;
    for(let attempt=0;attempt<3&&!shot;attempt++){
      while(new Date().getUTCSeconds()<8||new Date().getUTCSeconds()>40)await sleep(1000);
      // The city arrives in its own packet on the watch, as the phone app sends it;
      // a typed-in name marks no position on the map.
      const files={SETTINGS:encodeSettings(settings),FOOTER:encodeFooter(settings),DISPLAY:encodeDisplay(settings),PALETTE:encodePalette(settings),CITY:encodeCity({name:'Norfolk',manual:true})};
      if(settings.footer.pages.includes('tide'))files.TIDE=encodeEnvironment(sampleEnvironment(Date.now()).tide,'tide');
      const entries=Object.entries(files).map(([k,bytes])=>{const f=join(process.cwd(),out,`${slug}-${k}.bin`);writeFileSync(f,bytes);return `${KEY[k]}=${f}`;});
      await pebble('send-app-message','--bytes-file',...entries);
      await sleep(4000);
      const before=new Date();await pebble('screenshot','--no-open','--no-correction',join(process.cwd(),out,slug+'-watch.png'));const after=new Date();
      if(Math.floor(+before/60000)===Math.floor(+after/60000)){shot=readFileSync(join(out,slug+'-watch.png'));at=before;}
    }
    if(!shot)throw new Error(name+': no capture within one minute');
    const page=await browser.newPage({timezoneId:'UTC'});
    await page.clock.install({time:at});
    await page.addInitScript(s=>localStorage.setItem('dymaxion-workshop-v1',s),JSON.stringify(settings));
    await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));await page.clock.runFor(3000);
    // Watch, preview and the pixels that differ, side by side at 2x.
    const result=await page.evaluate(async watch=>{
      const img=new Image();img.src='data:image/png;base64,'+watch;await img.decode();
      const c=document.createElement('canvas');c.width=200;c.height=228;const x=c.getContext('2d');x.drawImage(img,0,0);
      const a=x.getImageData(0,0,200,228),b=document.querySelector('#screen').getContext('2d').getImageData(0,0,200,228);
      const diff=new ImageData(200,228),regions={};let off=0;
      for(let i=0;i<a.data.length;i+=4){const same=a.data[i]===b.data[i]&&a.data[i+1]===b.data[i+1]&&a.data[i+2]===b.data[i+2];if(!same){off++;const px=(i/4)%200,py=Math.floor(i/800),band=py<18?'top bar':py<180?'clock and map':'panel',r=regions[band]||(regions[band]={count:0,x0:200,y0:228,x1:0,y1:0,samples:[]});r.count++;r.x0=Math.min(r.x0,px);r.y0=Math.min(r.y0,py);r.x1=Math.max(r.x1,px);r.y1=Math.max(r.y1,py);if(r.samples.length<4)r.samples.push(`(${px},${py}) watch #${[0,1,2].map(k=>a.data[i+k].toString(16).padStart(2,'0')).join('')} preview #${[0,1,2].map(k=>b.data[i+k].toString(16).padStart(2,'0')).join('')}`);}diff.data.set(same?[b.data[i]/3,b.data[i+1]/3,b.data[i+2]/3,255]:[255,0,0,255],i);}
      const s=document.createElement('canvas');s.width=620*2;s.height=228*2;const g=s.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#fff';g.fillRect(0,0,s.width,s.height);
      const put=(data,dx)=>{const t=document.createElement('canvas');t.width=200;t.height=228;t.getContext('2d').putImageData(data,0,0);g.drawImage(t,dx*2,0,400,456);};
      put(a,0);put(b,210);put(diff,420);
      return {off,regions,png:s.toDataURL().split(',')[1],size:[img.width,img.height]};
    },shot.toString('base64'));
    await page.close();
    writeFileSync(join(out,slug+'.png'),Buffer.from(result.png,'base64'));
    if(result.off)failed++;
    rows.push(`| ${name} | ${at.toISOString().slice(11,16)} UTC | ${result.size.join('×')} | ${result.off} |`);
    console.log(`${name}: ${result.off} pixels differ`);
    // Where they differ, so a mismatch can be read from the log alone.
    for(const [band,r] of Object.entries(result.regions))console.log(`  ${band}: ${r.count} pixels in x ${r.x0}-${r.x1}, y ${r.y0}-${r.y1}; ${r.samples.join('; ')}`);
  }
}finally{await browser.close();}
const report=['### Emulator against the preview','','| Set-up | Time | Screenshot | Pixels that differ |','|---|---|---|---|',...rows,''].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
console.log(report);
// Reports only for now: a difference is a warning with side-by-sides in the
// artifact, not a failed check, until the comparison has settled in.
if(failed)console.log(`::warning title=Emulator against the preview::${failed} of ${rows.length} set-ups differ; see the job summary and the emulator-comparison artifact.`);
