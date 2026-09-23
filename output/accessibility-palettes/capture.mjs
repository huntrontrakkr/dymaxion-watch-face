import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {THEMES} from '../../shared/settings.js';
import {MARKERS} from '../../shared/markers.js';
import {contrast,VISION_MODES} from '../../tools/color-vision.mjs';

const directory=new URL('./',import.meta.url),base=process.env.PREVIEW_URL||'http://127.0.0.1:4174';
mkdirSync(directory,{recursive:true});
const browser=await chromium.launch(),entries=[],errors=[];
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000},timezoneId:'America/New_York'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-23T16:34:00Z')});
  await page.clock.pauseAt(new Date('2026-09-23T16:34:00Z'));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
  await page.locator('#reset').click();
  const screen=page.locator('#screen');
  for(let id=8;id<THEMES.length;id++){
    const theme=THEMES[id],images={};
    await page.getByRole('tab',{name:'Character',exact:true}).click();
    await page.getByRole('button',{name:theme.name,exact:true}).click();
    const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')));
    assert.equal(settings.theme,id);
    // The same 5×5 symbol must be visible beside the label and on the map.
    for(let i=0;i<3;i++){
      const [x,y]=settings.zones[i],place=settings.places[i];
      const pixels=await screen.evaluate((c,{x,y})=>[...c.getContext('2d').getImageData(x+8,y+5,5,5).data],{x,y});
      const ink=[1,3,5].map(k=>parseInt(theme.marks[i].slice(k,k+2),16));
      for(let r=0;r<5;r++)for(let col=0;col<5;col++)if(MARKERS[place.icon].rows[r][col]==='#')assert.deepEqual(pixels.slice((r*5+col)*4,(r*5+col)*4+3),ink);
    }
    for(const panel of ['zones','weather','calendar','humidity','tide']){
      const png=await screen.evaluate(c=>c.toDataURL());
      writeFileSync(new URL(id+'-'+panel+'.png',directory),Buffer.from(png.split(',')[1],'base64'));
      images[panel]=png;await page.locator('#next-panel').click();
    }
    entries.push({id,name:theme.name,images});
  }
  await page.reload();await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')).theme),13);
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL('phone-picker.png',directory).pathname,fullPage:true});
  assert.deepEqual(errors,[]);writeFileSync(new URL('renders.json',directory),JSON.stringify(entries));
  const report=THEMES.slice(8).map(t=>({name:t.name,checks:VISION_MODES.map(mode=>({mode,time:contrast(t.ink,t.bg,mode),minimumLabel:Math.min(...[t.accent,...t.marks,...Object.values(t.panelColors)].map(c=>contrast(c,t.bg,mode))),dayCoast:contrast(t.land,t.ocean,mode),nightCoast:contrast(t.nightLand,t.nightOcean,mode)}))}));
  writeFileSync(new URL('contrast.json',directory),JSON.stringify(report,null,2));
  console.log('Six palettes, matching city glyphs, all five footer panels, persistence and phone layout passed. Thirty native-resolution renders saved.');
}finally{await browser.close();}
