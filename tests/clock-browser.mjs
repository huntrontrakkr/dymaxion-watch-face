import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173',fixture=JSON.parse(readFileSync('tests/fixtures/city-norfolk.json'));
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'America/New_York',permissions:['geolocation'],geolocation:{latitude:36.8508,longitude:-76.2859}});
context.setDefaultTimeout(10000);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let lookups=0;
try{
  await page.route('https://photon.komoot.io/**',route=>{lookups++;return route.fulfill({json:fixture});});
  await page.clock.install({time:new Date('2026-09-23T16:34:00Z')});
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));await page.locator('#reset').click();
  const screen=page.locator('#screen');assert.equal(await screen.getAttribute('data-clock-display'),'chamfer');
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.getByLabel('Numerical display',{exact:true}).selectOption('triangles');await page.getByRole('tab',{name:'Composition',exact:true}).click();
  assert.match(await page.locator('#city-state').textContent(),/example city/);assert.equal(lookups,0,'no location lookup without preview request');
  await page.getByRole('button',{name:'Preview my current city'}).click();await page.waitForFunction(()=>document.querySelector('#city-state').textContent==='Current city: Norfolk.');
  assert.equal(await screen.getAttribute('data-clock-caption'),'WED 23 SEP  NORFOLK','Meridian names the city in its status line');
  await page.getByRole('button',{name:'Preview my current city'}).click();assert.equal(lookups,1,'cached city should not trigger another lookup');
  await screen.screenshot({path:'test-results/clock-triangles-meridian.png'});
  await page.getByRole('button',{name:'Horizon',exact:true}).click();await screen.screenshot({path:'test-results/clock-triangles-horizon.png'});
  await page.getByLabel('Clock location',{exact:true}).selectOption('manual');await page.getByLabel('Clock city name',{exact:true}).fill('São José');await page.getByLabel('Clock city name',{exact:true}).press('Tab');assert.match(await screen.getAttribute('data-clock-caption'),/SAO JOSE/);
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.locator('#format').selectOption('2');assert.match(await screen.getAttribute('data-clock-caption'),/^WED 23 SEP  SAO JO.* PM$/,'triangle numerals have no room for AM/PM, so it stays in the status line');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('chamfer');assert.equal(await screen.getAttribute('data-clock-caption'),'WED 23 SEP  SAO JOSE','12-hour Chamfer shows AM/PM beside the clock, so the city fits');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('triangles');
  await page.getByLabel('Show unlit triangles',{exact:true}).uncheck();const noGrid=await screen.screenshot();
  await page.getByLabel('Numerical display',{exact:true}).selectOption('span');assert.equal(await screen.getAttribute('data-clock-display'),'span');assert.match(await screen.getAttribute('data-clock-caption'),/ PM$/,'Span has no room beside the figures, so AM/PM stays in the status line');assert(await page.getByLabel('Show unlit triangles',{exact:true}).isDisabled());assert.notDeepEqual(await screen.screenshot(),noGrid);
  await page.getByLabel('Numerical display',{exact:true}).selectOption('triangles');await page.reload();await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));assert.equal(await screen.getAttribute('data-clock-display'),'triangles');
  await page.locator('#stacked').check();assert.equal(await screen.getAttribute('data-clock-display'),'draft');assert.match(await screen.getAttribute('data-clock-caption'),/Sao Jose PM$/);
  const study=await context.newPage();study.on('pageerror',e=>errors.push(e.message));await study.goto(new URL('segment-study.html',base+'/').href);
  assert.equal(await study.locator('#geometry polygon').count(),330);assert.equal(await study.locator('[data-electrode]').count(),7);
  assert.equal((await study.locator('#time-proof').boundingBox()).width,600);
  await study.getByLabel('Pixel size',{exact:true}).selectOption('1');assert.equal((await study.locator('#time-proof').boundingBox()).width,200);
  await study.getByLabel('Show unlit triangles',{exact:true}).uncheck();const initial=await study.locator('#geometry').screenshot();await study.getByLabel('Waist',{exact:true}).uncheck();assert.notDeepEqual(await study.locator('#geometry').screenshot(),initial);
  await study.getByLabel('Waist',{exact:true}).check();await study.getByLabel('Show unlit triangles',{exact:true}).check();await study.getByLabel('Pixel size',{exact:true}).selectOption('3');await study.screenshot({path:'test-results/triangular-display-study.png',fullPage:true});
  await study.setViewportSize({width:390,height:844});assert(await study.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'proof should scroll inside its container on a phone');
  // Leading zero is on by default and switches off from the display controls.
  await page.getByRole('tab',{name:'Character',exact:true}).click();
  assert.equal(await page.getByLabel('Leading zero',{exact:true}).isChecked(),true);
  await page.getByLabel('Leading zero',{exact:true}).uncheck();
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).leadingZero,false);
  await page.getByLabel('Leading zero',{exact:true}).check();
  // Bluetooth buzz is a Character setting that persists.
  await page.getByRole('tab',{name:'Character',exact:true}).click();
  assert.equal(await page.getByLabel('Buzz on Bluetooth',{exact:true}).inputValue(),'disconnect');
  await page.getByLabel('Buzz on Bluetooth',{exact:true}).selectOption('off');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).connectionBuzz,'off');
  // Quick View: the bottom band hides under the card and the clock stays clear of it.
  await page.getByRole('tab',{name:'Composition',exact:true}).click();await page.getByRole('button',{name:'Meridian',exact:true}).click();
  const clockTop=()=>screen.getAttribute('data-clock-top');const before=await clockTop();
  await page.locator('#quick-view').check();assert.equal(await screen.getAttribute('data-quick-view'),'true');assert.equal(await clockTop(),before,'Meridian\'s clock is already clear of the card');
  const band=await screen.evaluate(c=>[...c.getContext('2d').getImageData(0,184,200,5).data]);await page.locator('#quick-view').uncheck();
  assert.notDeepEqual(band,await screen.evaluate(c=>[...c.getContext('2d').getImageData(0,184,200,5).data]),'the card covers the bottom band');
  assert.deepEqual(errors,[]);console.log('PASS: actual and manual city captions, hourly lookup cache, 12-hour and stacked time, triangular/Span persistence, and integer-sized interactive electrode proof.');
}finally{await browser.close();}
