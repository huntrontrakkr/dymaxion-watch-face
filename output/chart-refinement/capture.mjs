import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaults} from '../../shared/settings.js';
const stage=process.argv[2];if(!['before','after'].includes(stage))throw new Error('Choose before or after.');
const directory=new URL('./',import.meta.url),base=process.env.PREVIEW_URL||'http://127.0.0.1:4174';
mkdirSync(directory,{recursive:true});
const cases=[
  {id:'weather',name:'Weather · 24 hours',page:'weather',horizon:24,format:1,theme:0},
  {id:'weather12',name:'Weather · 12 hours · AM/PM',page:'weather',horizon:12,format:2,theme:0},
  {id:'humidity',name:'Humidity · 24 hours',page:'humidity',horizon:24,format:1,theme:0},
  {id:'tide',name:'Tide · 24 hours',page:'tide',horizon:24,format:1,theme:0},
  {id:'tide48',name:'Tide · 48 hours · feet',page:'tide',horizon:48,format:2,theme:13},
  {id:'mono',name:'Weather · Monochrome',page:'weather',horizon:24,format:1,theme:9}
];
const browser=await chromium.launch(),entries=[],errors=[];
try{
  const page=await browser.newPage({viewport:{width:1200,height:1000},timezoneId:'America/New_York'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-23T16:34:00Z')});await page.clock.pauseAt(new Date('2026-09-23T16:34:00Z'));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));
  for(const spec of cases){
    const s=defaults();Object.assign(s,{theme:spec.theme,format:spec.format,motion:false});s.footer.home=spec.page;s.footer.horizon=spec.horizon;
    if(spec.id==='tide48')s.footer.tide.unit='ft';
    await page.locator('#import-file').setInputFiles({name:'chart.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
    await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Composition imported.');
    await page.getByRole('tab',{name:'Panels',exact:true}).click();
    await page.getByLabel('Starting panel',{exact:true}).selectOption('zones');
    await page.getByLabel('Starting panel',{exact:true}).selectOption(spec.page);
    assert.equal(await page.locator('#panel-preview-label').textContent(),spec.page==='weather'?'Weather':spec.page==='humidity'?'Humidity':'Tide');
    if(stage==='before')await page.evaluate(async ({root,s})=>{
      const {drawFooter}=await import('/@fs/'+root+'before-panel-render.js');
      const {sampleEnvironment}=await import('/@fs/'+root+'../../shared/panel-data.js');
      const {THEMES}=await import('/@fs/'+root+'../../shared/settings.js');
      const proofs=await (await fetch('/type/proofs.json')).json();
      drawFooter(document.querySelector('#screen').getContext('2d'),s,s.footer.home,{...sampleEnvironment(Date.now()),palette:THEMES[s.theme]},Date.now(),proofs.draft.text.small,s.format===1);
    },{root:directory.pathname,s});
    const images=await page.locator('#screen').evaluate(canvas=>{
      const crop=document.createElement('canvas');crop.width=200;crop.height=44;crop.getContext('2d').drawImage(canvas,0,184,200,44,0,0,200,44);
      return {watch:canvas.toDataURL(),chart:crop.toDataURL()};
    });
    for(const [kind,png]of Object.entries(images))writeFileSync(new URL(`${stage}-${spec.id}-${kind}.png`,directory),Buffer.from(png.split(',')[1],'base64'));
    entries.push({...spec,...images});
  }
  assert.deepEqual(errors,[]);writeFileSync(new URL(stage+'.json',directory),JSON.stringify(entries));
  console.log(stage+': six chart examples captured from the actual watch preview.');
}finally{await browser.close();}
