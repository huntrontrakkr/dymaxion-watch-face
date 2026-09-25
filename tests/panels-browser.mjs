import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const fixture=name=>JSON.parse(readFileSync(`tests/fixtures/${name}.json`));
const meta=fixture('environment-meta'),base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1200},timezoneId:'America/New_York',geolocation:{latitude:36.85,longitude:-76.29},permissions:['geolocation']});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.clock.install({time:new Date(meta.capturedAt)});
  await page.route('https://api.open-meteo.com/**',route=>{const url=new URL(route.request().url());assert.equal(url.searchParams.get('latitude'),'36.85');assert.equal(url.searchParams.get('longitude'),'-76.29');return route.fulfill({json:fixture('weather'),headers:{'access-control-allow-origin':'*'}});});
  await page.route('https://api.tidesandcurrents.noaa.gov/**',route=>{const url=route.request().url();return route.fulfill({json:fixture(url.includes('/mdapi/')?(url.includes('?type=')?'noaa-stations':'noaa-station-details'):url.includes('interval=hilo')?'tide-extrema':'tide-hourly'),headers:{'access-control-allow-origin':'*'}});});
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));await page.locator('#reset').click();
  for(const [id,label]of [['zones','Time zones'],['weather','Weather'],['calendar','Two-week calendar'],['health','Health']]){
    assert.equal(await page.locator('#panel-preview-label').textContent(),label);
    await page.locator('#screen').screenshot({path:`test-results/panel-${id}.png`});await page.locator('#next-panel').click();
  }
  await page.getByRole('tab',{name:'Panels',exact:true}).click();
  // The first custom edit snapshots the active theme; switching themes must not
  // silently discard those choices. Returning to theme colors is explicit.
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.getByRole('button',{name:'Polar',exact:true}).click();
  await page.getByRole('tab',{name:'Panels',exact:true}).click();await page.getByText('Panel colors',{exact:true}).click();
  assert.equal(await page.getByLabel('Temperature panel color',{exact:true}).inputValue(),'#000055');
  await page.getByLabel('Temperature panel color',{exact:true}).fill('#ff0055');
  assert.equal(await page.getByLabel('Rain panel color',{exact:true}).inputValue(),'#005555');
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.getByRole('button',{name:'Monochrome',exact:true}).click();
  await page.getByRole('tab',{name:'Panels',exact:true}).click();
  assert.equal(await page.getByLabel('Temperature panel color',{exact:true}).inputValue(),'#ff0055');
  assert.equal(await page.getByLabel('Rain panel color',{exact:true}).inputValue(),'#005555');
  await page.getByRole('button',{name:'Use theme colors',exact:true}).click();
  assert.equal(await page.getByLabel('Temperature panel color',{exact:true}).inputValue(),'#000000');
  assert.equal(await page.getByLabel('Rain panel color',{exact:true}).inputValue(),'#555555');
  assert.equal(await page.getByLabel('Panel gesture',{exact:true}).inputValue(),'2','existing default remains two flicks');
  await page.getByLabel('Panel gesture',{exact:true}).selectOption('4');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).footer.flicks,4);
  assert.match(await page.locator('[data-gesture-help]').textContent(),/listening stops when the light goes out/);
  await page.getByLabel('Panel gesture',{exact:true}).selectOption('3');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).footer.flicks,3);
  await page.getByLabel('Flick to change panels',{exact:true}).uncheck();await page.getByLabel('Automatic rotation',{exact:true}).selectOption('1');
  assert(await page.getByLabel('Panel gesture',{exact:true}).isDisabled());
  await page.clock.fastForward(61000);assert.equal(await page.locator('#panel-preview-label').textContent(),'Weather');
  // Smart rotation: the page that matters now (sample data, so the choice is
  // whatever the rules pick at this hour), and a manual change holds against it.
  await page.getByLabel('Automatic rotation',{exact:true}).selectOption('smart');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).footer.rotationMinutes,'smart');
  const label=()=>page.locator('#panel-preview-label').textContent(),pick=()=>page.locator('#screen').getAttribute('data-smart-page');
  const names={zones:'Time zones',weather:'Weather',calendar:'Two-week calendar',humidity:'Humidity',tide:'Tide',health:'Health'};
  // The Next clicks above count as manual choices: let their ten-minute hold pass.
  await page.clock.fastForward(11*60000);const smartLabel=await label();assert.equal(smartLabel,names[await pick()],'the tray shows the smart choice');
  await page.locator('#next-panel').click();const manualLabel=await page.locator('#panel-preview-label').textContent();
  assert.notEqual(manualLabel,smartLabel,'Next bottom panel moves on');
  await page.clock.fastForward(5*60000);assert.equal(await page.locator('#panel-preview-label').textContent(),manualLabel,'a manual choice holds for ten minutes');
  // Play the rest of the hold a minute at a time, as a watch's minute ticks would.
  for(let i=0;i<7;i++)await page.clock.fastForward(60000);
  { const l=await label(),p=await pick(),t=await page.evaluate(()=>new Date().toISOString());assert.equal(l,names[p],'then smart rotation returns: '+JSON.stringify({l,p,t,manualLabel,smartLabel})); }
  await page.getByLabel('Automatic rotation',{exact:true}).selectOption('0');
  await page.getByLabel('Starting panel',{exact:true}).selectOption('weather');
  await page.getByText('Weather & humidity',{exact:true}).click();
  assert.equal(await page.getByLabel('Forecast location',{exact:true}).inputValue(),'current');
  await page.getByLabel('Forecast location',{exact:true}).selectOption('1');
  await page.getByLabel('Forecast location',{exact:true}).selectOption('current');
  await page.getByRole('button',{name:'Load live data',exact:true}).click();await page.waitForFunction(()=>!!localStorage.getItem('dymaxion-environment-weather'));
  await page.locator('#screen').screenshot({path:'test-results/panel-weather-live.png'});
  await page.getByText('NOAA tides',{exact:true}).click();await page.getByLabel('Tide station',{exact:true}).selectOption('8518750');
  // The tide panel is optional; including it starts the NOAA download.
  await page.getByLabel('Include Tide',{exact:true}).check();
  await page.waitForFunction(()=>!!localStorage.getItem('dymaxion-environment-tide'));
  await page.getByLabel('Starting panel',{exact:true}).selectOption('tide');await page.locator('#screen').screenshot({path:'test-results/panel-tide-live.png'});
  await page.getByLabel('Tide height units',{exact:true}).selectOption('ft');assert.equal(await page.getByLabel('Tide maximum',{exact:true}).inputValue(),'9.8');
  await page.getByLabel('Tide height units',{exact:true}).selectOption('m');
  await page.getByText('Two-week calendar',{exact:true}).last().click();await page.getByLabel('First day of week',{exact:true}).selectOption('0');await page.getByLabel('Calendar weeks',{exact:true}).selectOption('previous-current');await page.getByLabel('Holiday highlighting',{exact:true}).selectOption('us');
  await page.getByLabel('Starting panel',{exact:true}).selectOption('calendar');
  await page.getByRole('button',{name:'Move calendar earlier',exact:true}).click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')));assert.equal(before.footer.pages[1],'calendar');assert.equal(before.footer.shake,false);assert.equal(before.footer.tide.station,'8518750');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('dymaxion-workshop-v1')));assert.deepEqual(after.footer,before.footer);
  await page.getByRole('tab',{name:'Panels',exact:true}).click();await page.screenshot({path:'test-results/panels-editor.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'panel controls must fit a phone');await page.screenshot({path:'test-results/panels-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: default panel rotation, timed rotation, live-provider fixtures, station and unit settings, calendar options, persistence and mobile layout.');
}finally{await browser.close();}
