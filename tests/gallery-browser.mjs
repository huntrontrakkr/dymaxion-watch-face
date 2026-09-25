import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {defaults,validateSettings,THEMES} from '../shared/settings.js';
import {GALLERY_COUNT} from '../tools/gallery-configs.mjs';
import {zoneExists} from '../shared/protocol.js';

mkdirSync('test-results',{recursive:true});
const base=(process.env.PREVIEW_URL||'http://127.0.0.1:5173').replace(/\/?$/,'/');
const browser=await chromium.launch(),errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);
  const saved={...defaults(),theme:5};
  await page.evaluate(s=>localStorage.setItem('dymaxion-workshop-v1',JSON.stringify(s)),saved);
  await page.getByRole('link',{name:'Browse the gallery'}).click();
  await page.waitForFunction(count=>document.querySelector('#count').textContent===`${count} of ${count} faces`,GALLERY_COUNT);
  assert.equal(await page.locator('.face').count(),GALLERY_COUNT);
  assert.equal(await page.locator('#face-total').textContent(),String(GALLERY_COUNT));
  assert.equal(await page.locator('#palette-total').textContent(),String(THEMES.filter(t=>!t.hidden).length));
  for(const [id,count] of [['palette',THEMES.filter(t=>!t.hidden).length+1],['layout',3],['clock',9],['panel',7]])assert.equal(await page.locator('#'+id+' option').count(),count);
  await page.locator('.face img').evaluateAll(images=>Promise.all(images.map(i=>{i.loading='eager';return i.decode();})));
  assert(await page.locator('.face img').evaluateAll(images=>images.every(i=>i.naturalWidth===200&&i.naturalHeight===228)));
  await page.locator('#palette').selectOption('Solstice');
  assert.equal(await page.locator('.face:visible').count(),3);
  await page.locator('#layout').selectOption('horizon');
  assert.equal(await page.locator('.face:visible').count(),1);
  await page.locator('#panel').selectOption('tide');
  assert.equal(await page.locator('.face:visible').count(),0);assert(await page.locator('#empty').isVisible());
  await page.getByRole('button',{name:'Clear filters'}).click();
  assert.equal(await page.locator('.face:visible').count(),GALLERY_COUNT);
  await page.locator('#palette').selectOption('TWA Atlantic');
  const downloaded=page.waitForEvent('download');
  await page.locator('.face:visible a').first().click();
  const download=await downloaded;await download.saveAs('test-results/gallery-import.json');
  const settings=JSON.parse(readFileSync('test-results/gallery-import.json','utf8'));
  assert.equal(settings.theme,14);assert.deepEqual(validateSettings(settings,zoneExists),settings);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1'))),saved,'browsing and downloading must preserve the existing composition');
  await page.getByRole('link',{name:'Open the workshop'}).click();
  await page.waitForFunction(()=>document.querySelector('#screen')?.dataset.clockDisplay);
  await page.locator('#import-file').setInputFiles('test-results/gallery-import.json');
  await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Composition imported.');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')).theme),14);
  await page.goto(new URL('gallery.html',base).href);
  await page.waitForFunction(count=>document.querySelector('#count').textContent===`${count} of ${count} faces`,GALLERY_COUNT);
  await page.screenshot({path:'test-results/gallery-desktop.png'});
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'gallery must fit a '+width+'px phone');
  }
  await page.screenshot({path:'test-results/gallery-mobile.png'});
  await page.route('**/gallery/manifest.json',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.reload();await page.locator('#error').waitFor();
  assert(await page.locator('form').isHidden());
  assert(await page.locator('#error a').isVisible());
  assert.deepEqual(errors,[]);
  console.log(`Gallery passed: ${GALLERY_COUNT} images, filters, downloads/import, saved settings, mobile widths and load failure.`);
}finally{await browser.close();}
