// Records the store's animated demo from the workshop renderer: every frame is
// the actual 200×228 framebuffer. Run npm run dev first, then
// python3 tools/encode-demo.py for the GIFs. The store's still screenshots are
// written to docs/screenshots/store/ as it goes.
import {chromium} from '@playwright/test';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173',out=process.argv[2]||'test-results/demo-frames.json';
const gallery=new URL('../designer/public/gallery/',import.meta.url);
const presets=readdirSync(gallery).filter(n=>/^\d\d-.*\.json$/.test(n)).sort().map(n=>JSON.parse(readFileSync(new URL(n,gallery),'utf8')));
const browser=await chromium.launch(),frames=[],errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1100},timezoneId:'America/New_York'});
page.on('pageerror',e=>errors.push(e.message));
const screen=page.locator('#screen');
const store=new URL('../docs/screenshots/store/',import.meta.url);mkdirSync(store,{recursive:true});
const still=async name=>writeFileSync(new URL('emery_'+name+'.png',store),Buffer.from((await screen.evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
const grab=async ms=>frames.push({png:await screen.evaluate(c=>c.toDataURL()),ms});
// Run the page's clock in steps, keeping a frame for each: the animations.
const run=async(total,step=40)=>{for(let t=0;t<total;t+=step){await page.clock.runFor(step);await grab(step);}};
const tab=name=>page.getByRole('tab',{name,exact:true}).click();
// Loads a whole composition through the workshop's own import.
const settings=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')));
const load=async s=>{await page.locator('#import-file').setInputFiles({name:'demo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.clock.runFor(50);};
const change=async edit=>{const s=await settings();edit(s);await load(s);};
const LABELS={zones:'Time zones',weather:'Weather',tide:'Tide',calendar:'Two-week calendar',health:'Health'};
const panel=async name=>{for(let i=0;i<8&&await page.locator('#panel-preview-label').textContent()!==name;i++){await page.locator('#next-panel').click();await page.clock.runFor(700);}};
try{
  await page.clock.install({time:new Date('2026-09-23T16:33:50Z')});
  await page.clock.pauseAt(new Date('2026-09-23T16:33:59.2Z'));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
  await page.locator('#reset').click();await page.clock.runFor(50);
  await change(s=>{s.batteryGauge=true;s.stepLine=true;s.footer.pages=['zones','weather','tide','calendar','health'];});
  // 1. The face, then a minute change.
  await still('01-default');await grab(900);await run(1000);await grab(600);
  // 2. A day of sunlight in fast motion.
  for(let h=0;h<=24;h+=0.5){await page.locator('#scrub').fill(String(h>12?h-24:h));await grab(40);}
  await page.locator('#scrub').fill('0');await grab(300);
  // 3. The bottom panels: weather with sunrise and sunset, tides with highs
  // and lows, the calendar and Health. Place times move onto the map.
  for(const name of ['Weather','Tide','Two-week calendar','Health']){await page.locator('#next-panel').click();await run(400);assert.equal(await page.locator('#panel-preview-label').textContent(),name);if(name==='Weather')await still('02-weather');await grab(1000);}
  await page.locator('#next-panel').click();await run(400);await grab(300);
  // 4. The top bar: Quiet Time, charging, and a low battery.
  await page.locator('#preview-quiet').check();await grab(700);
  await page.locator('#preview-battery').selectOption('charging');await grab(700);
  await page.locator('#preview-battery').selectOption('low');await grab(700);
  await page.locator('#preview-battery').selectOption('normal');await page.locator('#preview-quiet').uncheck();
  // 5. Place times between the clock and the map; the icosahedron beside the clock.
  await change(s=>{s.zonePosition='strip';s.footer.home='weather';});await panel('Weather');await grab(1200);
  await change(s=>{s.zonePosition='map';s.clockArt='left';s.footer.home='zones';});await panel('Time zones');await run(900);await grab(600);
  await change(s=>{s.clockArt='right';});await run(900);await grab(600);
  // Place times beside the clock: the clock glides aside as the panel changes.
  await change(s=>{s.clockArt='none';s.zonePosition='left';});
  await page.locator('#next-panel').click();await run(700);await grab(700);
  await panel('Time zones');await run(700);
  // 6. Rapid fire through the gallery: palettes, clocks, layouts and panels.
  // Each at its own hour and panel; some with this year's additions.
  const pages=['weather','tide','zones','calendar','health'],stills={21:'03-strip-tides',48:'04-calendar',60:'05-palette'};
  for(const [k,preset] of presets.entries()){
    const s=structuredClone(preset),home=pages[k%pages.length];
    s.footer.pages=[...new Set([...s.footer.pages,'tide',home])];s.footer.home=home;
    s.batteryGauge=k%2===0;s.stepLine=k%3===0;
    if(k%4===1&&s.zoneTimes!=='panel')s.zonePosition='strip';
    // The icosahedron needs a narrow clock.
    if(k%5===1){s.clockArt=k%2?'left':'right';s.clockDisplay='chamfer';}
    await page.locator('#scrub').fill(String((k*7)%24-12));await load(s);await panel(LABELS[home]);if(stills[k])await still(stills[k]);await grab(200);
  }
  await page.locator('#scrub').fill('0');
  // 7. Back home.
  await page.locator('#reset').click();await page.clock.runFor(50);
  await change(s=>{s.batteryGauge=true;s.stepLine=true;});await grab(1200);
}finally{await browser.close();}
assert.deepEqual(errors,[]);
mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});
writeFileSync(out,JSON.stringify(frames));
console.log(frames.length,'frames,',frames.reduce((s,f)=>s+f.ms,0),'ms');
