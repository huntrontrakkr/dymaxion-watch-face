// The real watch build in the Pebble emulator against the workshop preview, at
// the same minute, for a few set-ups. Run in CI after `pebble build`, with the
// workshop served (npm run dev) and the emulator's host clock in UTC. Writes
// test-results/emulator/*.png (watch | preview | differing pixels in red).
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {defaults,THEMES} from '../shared/settings.js';
import {encodeSettings} from '../shared/protocol.js';
import {encodeFooter,encodeEnvironment} from '../shared/panel-protocol.js';
import {encodeDisplay} from '../shared/display.js';
import {encodePalette} from '../shared/palette-protocol.js';
import {sampleEnvironment} from '../shared/panel-data.js';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173',out='test-results/emulator';
mkdirSync(out,{recursive:true});
const find=(dir,name)=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()){const f=find(p,name);if(f)return f;}else if(e.name===name)return p;}return null;};
const header=readFileSync(find('watchface/build','message_keys.auto.h'),'utf8');
const KEY=Object.fromEntries([...header.matchAll(/MESSAGE_KEY_(\w+)\s+(\d+)/g)].map(m=>[m[1],m[2]]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// pebble-tool respawns the phone simulator when it has stopped, which can take
// a moment to accept connections: try each command a few times.
const pebble=async(...args)=>{
  for(let attempt=1;;attempt++){
    try{return execFileSync('pebble',[...args,'--emulator','emery'],{cwd:'watchface',stdio:['ignore','pipe','inherit'],timeout:60000}).toString();}
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
  'tides with highs and lows':{footer:{...defaults().footer,pages:['tide','zones'],home:'tide'}}
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
      const files={SETTINGS:encodeSettings(settings),FOOTER:encodeFooter(settings),DISPLAY:encodeDisplay(settings),PALETTE:encodePalette(settings)};
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
      const diff=new ImageData(200,228);let off=0;
      for(let i=0;i<a.data.length;i+=4){const same=a.data[i]===b.data[i]&&a.data[i+1]===b.data[i+1]&&a.data[i+2]===b.data[i+2];if(!same)off++;diff.data.set(same?[b.data[i]/3,b.data[i+1]/3,b.data[i+2]/3,255]:[255,0,0,255],i);}
      const s=document.createElement('canvas');s.width=620*2;s.height=228*2;const g=s.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#fff';g.fillRect(0,0,s.width,s.height);
      const put=(data,dx)=>{const t=document.createElement('canvas');t.width=200;t.height=228;t.getContext('2d').putImageData(data,0,0);g.drawImage(t,dx*2,0,400,456);};
      put(a,0);put(b,210);put(diff,420);
      return {off,png:s.toDataURL().split(',')[1],size:[img.width,img.height]};
    },shot.toString('base64'));
    await page.close();
    writeFileSync(join(out,slug+'.png'),Buffer.from(result.png,'base64'));
    if(result.off)failed++;
    rows.push(`| ${name} | ${at.toISOString().slice(11,16)} UTC | ${result.size.join('×')} | ${result.off} |`);
    console.log(`${name}: ${result.off} pixels differ`);
  }
}finally{await browser.close();}
const report=['### Emulator against the preview','','| Set-up | Time | Screenshot | Pixels that differ |','|---|---|---|---|',...rows,''].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
console.log(report);
process.exit(failed?1:0);
