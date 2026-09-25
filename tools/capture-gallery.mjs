// Run npm run dev first. Every PNG is the actual 200×228 workshop framebuffer.
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {galleryConfigs,GALLERY_SEED} from './gallery-configs.mjs';
import {THEMES,PUBLIC_THEME_IDS} from '../shared/palettes.js';
import {contrast,VISION_MODES} from './color-vision.mjs';

const directory=new URL('../designer/public/gallery/',import.meta.url);
const screenshots=new URL('../docs/screenshots/',import.meta.url);
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
mkdirSync(directory,{recursive:true});mkdirSync(screenshots,{recursive:true});
const browser=await chromium.launch(),entries=galleryConfigs(),errors=[];
try{
  for(const entry of entries){
    const page=await browser.newPage({viewport:{width:1440,height:1100},timezoneId:entry.timezone,reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(entry.id+': '+error.message));
    await page.clock.install({time:new Date(entry.when)});await page.clock.pauseAt(new Date(entry.when));
    await page.addInitScript(s=>localStorage.setItem('dymaxion-workshop-v1',JSON.stringify(s)),entry.settings);
    await page.goto(base);
    await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
    assert.equal(await page.locator('#screen').getAttribute('data-clock-display'),entry.clock);
    const capture=await page.locator('#screen').evaluate(c=>{
      const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      return {png:c.toDataURL(),width:c.width,height:c.height,quantized:pixels.every((v,i)=>i%4===3?v===255:v%85===0)};
    });
    assert.deepEqual([capture.width,capture.height],[200,228]);assert(capture.quantized,entry.id+' must use RGB222');
    writeFileSync(new URL(entry.id+'.png',directory),Buffer.from(capture.png.split(',')[1],'base64'));
    writeFileSync(new URL(entry.id+'.json',directory),JSON.stringify(entry.settings,null,2)+'\n');
    entry.image=entry.id+'.png';entry.preset=entry.id+'.json';delete entry.settings;
    await page.close();
  }
  assert.deepEqual(errors,[]);
  writeFileSync(new URL('manifest.json',directory),JSON.stringify({seed:GALLERY_SEED,width:200,height:228,
    note:'Actual workshop renders. Weather, tide, Health, battery, connection and current city are examples. Each recipe downloads as an importable settings file.',entries},null,2)+'\n');
  // The same native PNGs form the README hero and the complete contact sheet.
  const page=await browser.newPage({viewport:{width:1900,height:2600},deviceScaleFactor:1});
  async function sheet(name,selection,columns,title,subtitle){
    const cards=selection.map(e=>`<figure><img src="${new URL('gallery/'+e.image,base).href}" width="200" height="228"><figcaption><b>${e.id.slice(0,2)} / ${e.theme}</b><span>${e.layout} · ${e.clock} · ${e.panel}</span></figcaption></figure>`).join('');
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#f1efe6;color:#253b38;font-family:Arial,sans-serif}article{padding:28px;width:max-content}h1{font-size:27px;letter-spacing:-.6px;margin:0 0 8px;font-weight:500}p{font-size:12px;margin:0 0 24px;color:#596b61}.cards{display:grid;grid-template-columns:repeat(${columns},224px);gap:20px}figure{margin:0;width:224px;padding:12px;background:#f8f7f0;border:1px solid #cfd4c6}img{display:block;image-rendering:pixelated}figcaption{margin-top:12px;line-height:1.5}b{display:block;font-size:12px}span{display:block;font-size:9px;color:#596b61;text-transform:capitalize}</style><article><h1>${title}</h1><p>${subtitle}</p><div class="cards">${cards}</div></article>`);
    await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
    await page.locator('article').screenshot({path:fileURLToPath(new URL(name,screenshots))});
  }
  const canonical=theme=>entries.find(e=>e.themeId===theme&&e.variant===0);
  // Keep the original contact sheet's URL and examples intact as the gallery grows.
  await sheet('gallery-64.png',entries.slice(0,64),8,'Dymaxion / 64 ways to see the world','21 palettes · 8 clock styles · 6 panels · Meridian & Horizon · sample data');
  await sheet('gallery-all.png',entries,8,`Dymaxion / ${entries.length} ways to see the world`,`${PUBLIC_THEME_IDS.length} palettes · 8 clock styles · 6 panels · Meridian & Horizon · sample data`);
  await sheet('gallery-hero.png',[canonical(14),canonical(15),canonical(16),entries.find(e=>e.themeId===0&&e.variant===1),canonical(17),canonical(18),canonical(19),canonical(20)],4,'A little world. A wider view.','Dymaxion for Pebble Time 2 · actual 200 × 228 pixel renders · preview data');
  await sheet('new-palettes.png',entries.filter(e=>e.themeId>=14&&e.themeId<=20&&e.variant===0),4,'Seven new perspectives','Red Atlantic · cool daylight / warm nights · color and shape at watch resolution');
  await sheet('bright-land-palettes.png',[canonical(21),canonical(22)],2,'Light land. Deep oceans.','Lagoon & Sandstone · land stays brighter than water, day and night');
  const review=THEMES.slice(14).filter(theme=>!theme.hidden).map(theme=>({name:theme.name,modes:Object.fromEntries(VISION_MODES.map(mode=>[mode,{
    textMinimum:Math.min(...[theme.ink,theme.accent,...theme.marks,...Object.values(theme.panelColors)].map(color=>contrast(color,theme.bg,mode))),
    dayCoastline:contrast(theme.land,theme.ocean,mode),nightCoastline:contrast(theme.nightLand,theme.nightOcean,mode)}]))}));
  writeFileSync(new URL('../new-palette-contrast.json',screenshots),JSON.stringify(review,null,2)+'\n');
  await page.close();
}finally{await browser.close();}
console.log(`Captured ${entries.length} RGB222 screens, settings recipes, contact sheet and palette previews.`);
