import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {THEMES} from '../../shared/settings.js';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:4174',directory=new URL('./',import.meta.url);
mkdirSync(directory,{recursive:true});
const browser=await chromium.launch(),entries=[],errors=[];
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000},timezoneId:'America/New_York'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-09-23T16:34:00Z')});
  await page.clock.pauseAt(new Date('2026-09-23T16:34:00Z'));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
  await page.locator('#reset').click();
  const screen=page.locator('#screen');
  const save=async name=>{
    const png=await screen.evaluate(canvas=>canvas.toDataURL());
    writeFileSync(new URL(name+'.png',directory),Buffer.from(png.split(',')[1],'base64'));
    return png;
  };
  for(let id=0;id<8;id++){
    const theme=THEMES[id],images={};
    await page.getByRole('tab',{name:'Character',exact:true}).click();
    await page.getByRole('button',{name:theme.name,exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')).theme),id);
    const corner=await screen.evaluate(c=>[...c.getContext('2d').getImageData(0,17,1,1).data].slice(0,3));
    assert.deepEqual(corner,[1,3,5].map(i=>parseInt(theme.bg.slice(i,i+2),16)));
    await page.getByRole('tab',{name:'Composition',exact:true}).click();
    for(const layout of ['atlas','horizon']){
      await page.getByRole('button',{name:layout==='atlas'?'Atlas':'Horizon',exact:true}).click();
      await page.clock.runFor(1200);
      for(const shading of [true,false]){
        await page.locator('#dayNight').setChecked(shading);
        const key=layout+(shading?'-shaded':'-day');
        if(id>=4)images[key]=await save(id+'-'+key);
      }
    }
    if(id>=4)entries.push({id,name:theme.name,description:theme.description,images});
  }
  await page.reload();await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')).theme),7);
  await page.getByRole('tab',{name:'Character',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:new URL('phone-picker.png',directory).pathname,fullPage:true});
  assert.deepEqual(errors,[]);
  writeFileSync(new URL('renders.json',directory),JSON.stringify(entries));
  console.log('Eight themes select and persist; 16 new-palette watch renders exported. No browser errors.');
}finally{await browser.close();}
