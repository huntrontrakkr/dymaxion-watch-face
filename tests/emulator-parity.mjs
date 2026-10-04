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
import {encodeGlyphs} from '../shared/glyph-protocol.js';
import {sampleEnvironment} from '../shared/panel-data.js';
import {encodeCity} from '../shared/city.js';
import {encodeLanguage,resolveLanguage} from '../shared/watch-text.js';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173',out='test-results/emulator';
mkdirSync(out,{recursive:true});
// Message key numbers as the SDK assigned them for this build.
const KEY=JSON.parse(readFileSync('watchface/build/js/message_keys.json','utf8'));
for(const k of ['SETTINGS','FOOTER','DISPLAY','PALETTE','TIDE','CITY','GLYPHS','LANGUAGE'])if(!Number.isInteger(KEY[k]))throw new Error('No message key for '+k);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// pebble-tool respawns the phone simulator when it has stopped, which can take
// a moment to accept connections: try each command a few times.
const pebble=async(...args)=>{
  for(let attempt=1;;attempt++){
    try{execFileSync('pebble',[...args,'--emulator','emery'],{cwd:'watchface',stdio:['ignore','inherit','inherit'],timeout:60000});return;}
    catch(error){
      if(attempt===4){try{console.log(readFileSync('/tmp/pb-emulator.json','utf8'));console.log(execFileSync('ps',['-eo','pid,stat,comm']).toString().split('\n').filter(l=>/qemu|python/.test(l)).join('\n'));}catch{}throw error;}
      console.log(`pebble ${args[0]} failed (attempt ${attempt}); retrying`);await sleep(5000);
    }
  }
};
// Sends a set-up's packets, as the phone app does on Save; the watch then
// paints its whole face. The city arrives in its own packet on the watch; a
// typed-in name marks no position on the map.
const send=async(settings,slug)=>{
  const city=settings.location.mode==='auto'?{name:'Norfolk',lat:36.9,lon:-76.3,fetched:Math.floor(Date.now()/1000)}:{name:'Norfolk',manual:true};
  const files={SETTINGS:encodeSettings(settings),FOOTER:encodeFooter(settings),DISPLAY:encodeDisplay(settings),PALETTE:encodePalette(settings),GLYPHS:encodeGlyphs(settings),CITY:encodeCity(city),LANGUAGE:encodeLanguage(resolveLanguage(settings.language,[settings.deviceLanguage]))};
  if(settings.footer.pages.includes('tide'))files.TIDE=encodeEnvironment(sampleEnvironment(Date.now()).tide,'tide');
  const entries=Object.entries(files).map(([k,bytes])=>{const f=join(process.cwd(),out,`${slug}-${k}.bin`);writeFileSync(f,bytes);return `${KEY[k]}=${f}`;});
  await pebble('send-app-message','--bytes-file',...entries);
};
const screenshot=async name=>{const f=join(process.cwd(),out,name+'.png');await pebble('screenshot','--no-open','--no-correction',f);return readFileSync(f);};
const theme=name=>THEMES.findIndex(t=>t.name===name);
const cases={
  'default':{},
  'map Moon, current phase':{mapMoon:true},
  'turned map, Moon and place times':{mapRotation:180,mapMoon:true,zoneTimes:'always',zonePosition:'map'},
  'turned map, Moon without day-night shading':{mapRotation:180,mapMoon:true,dayNight:false,moonIndicator:false},
  'turned map, current city and place times':{mapRotation:180,mapMoon:true,zoneTimes:'always',zonePosition:'map',location:{mode:'auto',name:''}},
  'place times between the clock and the map':{zoneTimes:'always',zonePosition:'strip'},
  'compact place times between the clock and the map':{zoneTimes:'always',zonePosition:'strip',zoneStripCompact:true},
  // A drawn glyph for the second place, on the map and before its name beside the clock.
  'icons beside the clock, a drawn glyph':{zoneTimes:'always',zonePosition:'right',placeIconsBeside:true,places:defaults().places.map((p,i)=>i===1?{...p,icon:12,glyph:['.....','.#.#.','.....','#...#','.###.']}:p)},
  'icosahedron beside the clock, battery gauge':{clockArt:'left',zoneTimes:'panel',batteryGauge:true,theme:theme('Paper')},
  'Ultraviolet, 12-hour':{theme:theme('Ultraviolet'),format:2},
  'tides with highs and lows':{footer:{...defaults().footer,pages:['tide','zones'],home:'tide',tide:{...defaults().footer.tide,station:'8638610'}}},
  // The face in other languages: accents, Cyrillic and Japanese.
  'Polish, tides':{language:'pl',footer:{...defaults().footer,pages:['tide','zones'],home:'tide',tide:{...defaults().footer.tide,station:'8638610'}}},
  'Russian, calendar':{language:'ru',footer:{...defaults().footer,pages:['calendar','zones'],home:'calendar'}},
  'Japanese, calendar':{language:'ja',footer:{...defaults().footer,pages:['calendar','zones'],home:'calendar'}}
};

await pebble('emu-battery','--percent','86');await pebble('emu-bt-connection','--connected','yes');
// Let the phone app's own start-up sync finish before sending ours.
await sleep(15000);
const browser=await chromium.launch(),rows=[],minuteRows=[];let failed=0,minuteFailed=0;
try{
  for(const [name,change] of Object.entries(cases)){
    if(process.env.EMULATOR_CASE&&!name.includes(process.env.EMULATOR_CASE))continue;
    const settings={...defaults(),location:{mode:'manual',name:'Norfolk'},...change},slug=name.replace(/\W+/g,'-');
    // Capture within one minute, clear of the minute change and its animation.
    let shot,at;
    for(let attempt=0;attempt<3&&!shot;attempt++){
      while(new Date().getUTCSeconds()<8||new Date().getUTCSeconds()>40)await sleep(1000);
      await send(settings,slug);
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
      const diff=new ImageData(200,228),regions={},all=[];let off=0;
      for(let i=0;i<a.data.length;i+=4){const same=a.data[i]===b.data[i]&&a.data[i+1]===b.data[i+1]&&a.data[i+2]===b.data[i+2];if(!same){off++;if(all.length<300)all.push(`${(i/4)%200},${Math.floor(i/800)}:${a.data[i]>b.data[i]||a.data[i+1]>b.data[i+1]||a.data[i+2]>b.data[i+2]?'w':'p'}`);const px=(i/4)%200,py=Math.floor(i/800),band=py<18?'top bar':py<180?'clock and map':'panel',r=regions[band]||(regions[band]={count:0,x0:200,y0:228,x1:0,y1:0,samples:[]});r.count++;r.x0=Math.min(r.x0,px);r.y0=Math.min(r.y0,py);r.x1=Math.max(r.x1,px);r.y1=Math.max(r.y1,py);if(r.samples.length<4)r.samples.push(`(${px},${py}) watch #${[0,1,2].map(k=>a.data[i+k].toString(16).padStart(2,'0')).join('')} preview #${[0,1,2].map(k=>b.data[i+k].toString(16).padStart(2,'0')).join('')}`);}diff.data.set(same?[b.data[i]/3,b.data[i+1]/3,b.data[i+2]/3,255]:[255,0,0,255],i);}
      const s=document.createElement('canvas');s.width=620*2;s.height=228*2;const g=s.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#fff';g.fillRect(0,0,s.width,s.height);
      const put=(data,dx)=>{const t=document.createElement('canvas');t.width=200;t.height=228;t.getContext('2d').putImageData(data,0,0);g.drawImage(t,dx*2,0,400,456);};
      put(a,0);put(b,210);put(diff,420);
      return {off,regions,all,png:s.toDataURL().split(',')[1],size:[img.width,img.height]};
    },shot.toString('base64'));
    await page.close();
    writeFileSync(join(out,slug+'.png'),Buffer.from(result.png,'base64'));
    if(result.off)failed++;
    rows.push(`| ${name} | ${at.toISOString().slice(11,16)} UTC | ${result.size.join('×')} | ${result.off} |`);
    console.log(`${name}: ${result.off} pixels differ`);
    // Where they differ, so a mismatch can be read from the log alone.
    for(const [band,r] of Object.entries(result.regions))console.log(`  ${band}: ${r.count} pixels in x ${r.x0}-${r.x1}, y ${r.y0}-${r.y1}; ${r.samples.join('; ')}`);
    // Every differing pixel (w: brighter on the watch, p: in the preview), to read a mismatch from the log.
    if(result.off)console.log('  pixels: '+result.all.join(' '));
  }
  // A minute tick paints only the parts a minute changes (main.c
  // minute_redraw). The face it leaves must be the one a full paint draws:
  // after a tick, resending the same settings repaints everything, and the two
  // screenshots must match exactly. On minutes when the map is relit (every
  // five, by default) only the tiles near the terminator are repainted
  // (main.c relight_map): those ticks are checked the same way.
  const minuteCases=[...['default','place times between the clock and the map','icosahedron beside the clock, battery gauge','tides with highs and lows','turned map, current city and place times'].map(name=>({name,relight:false})),
    // Each relight case waits for its own five-minute mark, so three: plain,
    // turned with place times, and the Moon alone without day and night.
    ...['default','turned map, Moon and place times','turned map, Moon without day-night shading'].map(name=>({name,relight:true}))];
  for(const {name:base,relight} of minuteCases){
    const name=(relight?'relight, ':'')+base;
    if(process.env.EMULATOR_CASE&&!name.includes(process.env.EMULATOR_CASE))continue;
    const settings={...defaults(),location:{mode:'manual',name:'Norfolk'},...cases[base]},slug='minute-'+name.replace(/\W+/g,'-');
    let result=null;
    for(let attempt=0;attempt<3&&!result;attempt++){
      while(new Date().getUTCSeconds()<5||new Date().getUTCSeconds()>40||((new Date().getUTCMinutes()+1)%5===0)!==relight)await sleep(1000);
      await send(settings,slug);
      const minute=Math.floor(Date.now()/60000);
      while(Math.floor(Date.now()/60000)===minute)await sleep(250);
      await sleep(4000); // the minute change and its 400 ms animation
      const tick=await screenshot(slug+'-tick'),at=Math.floor(Date.now()/60000);
      await send(settings,slug);await sleep(3000);
      const full=await screenshot(slug+'-full');
      if(Math.floor(Date.now()/60000)!==at)continue; // crossed another minute: try again
      const page=await browser.newPage();
      result=await page.evaluate(async([a,b])=>{
        const load=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,c.width,c.height).data;};
        const p=await load(a),q=await load(b);let off=0,first='';
        for(let i=0;i<p.length;i+=4)if(p[i]!==q[i]||p[i+1]!==q[i+1]||p[i+2]!==q[i+2]){if(!off)first=`(${(i/4)%200},${Math.floor(i/800)})`;off++;}
        return {off,first};
      },[tick.toString('base64'),full.toString('base64')]);
      await page.close();
    }
    if(!result)throw new Error(name+': no minute tick captured');
    minuteRows.push(`| ${name} | ${result.off} |`);
    console.log(`minute tick, ${name}: ${result.off} pixels differ from a full paint${result.off?' first at '+result.first:''}`);
    if(result.off)minuteFailed++;
  }
}finally{await browser.close();}
const report=['### Emulator against the preview','','| Set-up | Time | Screenshot | Pixels that differ |','|---|---|---|---|',...rows,'','### A minute tick against a full paint','','| Set-up | Pixels that differ |','|---|---|',...minuteRows,''].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
console.log(report);
// Reports only for now: a difference is a warning with side-by-sides in the
// artifact, not a failed check, until the comparison has settled in.
if(failed)console.log(`::warning title=Emulator against the preview::${failed} of ${rows.length} set-ups differ; see the job summary and the emulator-comparison artifact.`);
// A minute tick that leaves a different face from a full paint is a bug in the
// watch's own drawing, not a preview difference: that fails the check.
if(minuteFailed){console.log(`::error title=Minute tick::${minuteFailed} set-ups differ from a full paint after a minute tick.`);process.exit(1);}
