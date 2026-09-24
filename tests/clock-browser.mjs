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
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.getByLabel('Numerical display',{exact:true}).selectOption('span');await page.getByRole('tab',{name:'Composition',exact:true}).click();
  assert.match(await page.locator('#city-state').textContent(),/example city/);assert.equal(lookups,0,'no location lookup without preview request');
  await page.getByRole('button',{name:'Preview my current city'}).click();await page.waitForFunction(()=>document.querySelector('#city-state').textContent==='Current city: Norfolk.');
  assert.equal(await screen.getAttribute('data-clock-caption'),'WED 23 SEP  NORFOLK','Meridian names the city in its status line');
  await page.getByRole('button',{name:'Preview my current city'}).click();assert.equal(lookups,1,'cached city should not trigger another lookup');
  await screen.screenshot({path:'test-results/clock-span-meridian.png'});
  await page.getByRole('button',{name:'Horizon',exact:true}).click();await screen.screenshot({path:'test-results/clock-span-horizon.png'});
  await page.getByLabel('Clock location',{exact:true}).selectOption('manual');await page.getByLabel('Clock city name',{exact:true}).fill('São José');await page.getByLabel('Clock city name',{exact:true}).press('Tab');assert.match(await screen.getAttribute('data-clock-caption'),/SAO JOSE/);
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.locator('#format').selectOption('2');assert.match(await screen.getAttribute('data-clock-caption'),/^WED 23 SEP  SAO JO.* PM$/,'Span has no room for AM/PM, so it stays in the status line');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('chamfer');assert.equal(await screen.getAttribute('data-clock-caption'),'WED 23 SEP  SAO JOSE','12-hour Chamfer shows AM/PM beside the clock, so the city fits');
  const options=await page.getByLabel('Numerical display',{exact:true}).locator('option').evaluateAll(o=>o.map(x=>x.value));
  assert(!options.includes('triangles'),'the triangular display is retired');assert.equal(await page.getByLabel('Show unlit triangles',{exact:true}).count(),0);
  await page.getByLabel('Numerical display',{exact:true}).selectOption('span');await page.reload();await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));assert.equal(await screen.getAttribute('data-clock-display'),'span');
  await page.locator('#stacked').check();assert.equal(await screen.getAttribute('data-clock-display'),'draft');assert.match(await screen.getAttribute('data-clock-caption'),/Sao Jose PM$/);
  // Pebble's built-in fonts are numeral styles too; the choice persists.
  await page.locator('#stacked').uncheck();await page.getByRole('tab',{name:'Character',exact:true}).click();
  for(const id of ['leco','bitham-bold','bitham-light','bitham-medium','leco-delta']){
    await page.getByLabel('Numerical display',{exact:true}).selectOption(id);assert.equal(await screen.getAttribute('data-clock-display'),id);
  }
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).clockDisplay,'leco-delta');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('chamfer');
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
  // Map backgrounds (triangle points, lines, fine points, fold tabs) fill only the empty map pixels, in the edge colour.
  const mapBlock=()=>screen.evaluate(c=>[...c.getContext('2d').getImageData(0,73,200,104).data]);
  assert.equal(await page.getByLabel('Map background',{exact:true}).inputValue(),'none');
  await page.clock.runFor(3000);const plain=await mapBlock(); // let any marker pulse finish
  const settingsNow=JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))),{paletteFor}=await import('../shared/palette-settings.js'),pal=paletteFor(settingsNow);
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  for(const [id,low,high] of [['points',20,40],['lines',300,494],['fine-points',90,130],['folds',150,238]]){
    await page.getByLabel('Map background',{exact:true}).selectOption(id);await page.clock.runFor(3000);const gridded=await mapBlock();
    let changed=0;for(let i=0;i<plain.length;i+=4)if(plain[i]!==gridded[i]||plain[i+1]!==gridded[i+1]||plain[i+2]!==gridded[i+2]){
      changed++;assert.deepEqual(gridded.slice(i,i+3),rgb(pal.edge),'dots use the edge colour');assert.deepEqual(plain.slice(i,i+3),rgb(pal.bg),'only the empty ground changes');
      const y=Math.floor(i/800);assert(y>=6&&y<=97,'inside the rows the map covers');
    }
    assert(changed>=low&&changed<=high,`${id}: ${changed} dots`);
    assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).mapBackground,id);
    await screen.screenshot({path:`test-results/map-background-${id}.png`});
  }
  await page.getByLabel('Map background',{exact:true}).selectOption('none');await page.clock.runFor(3000);assert.deepEqual(await mapBlock(),plain);
  assert.deepEqual(errors,[]);console.log('PASS: actual and manual city captions, hourly lookup cache, 12-hour and stacked time, Span persistence, retired triangular display, system fonts, and the map background.');
}finally{await browser.close();}
