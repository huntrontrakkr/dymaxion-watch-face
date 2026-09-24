import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const fixture=name=>JSON.parse(readFileSync(`tests/fixtures/${name}.json`));
const meta=fixture('environment-meta'),base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1200},timezoneId:'America/New_York'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.clock.install({time:new Date(meta.capturedAt)});
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({json:fixture('weather'),headers:{'access-control-allow-origin':'*'}}));
  await page.route('https://api.tidesandcurrents.noaa.gov/**',route=>route.fulfill({json:fixture(route.request().url().includes('interval=hilo')?'tide-extrema':'tide-hourly'),headers:{'access-control-allow-origin':'*'}}));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));await page.locator('#reset').click();
  for(const [id,label]of [['zones','Time zones'],['weather','Weather'],['calendar','Two-week calendar']]){
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
  assert.equal(await page.getByLabel('Flicks per panel change',{exact:true}).inputValue(),'2','two flicks by default, so the backlight flick does not change panels');
  await page.getByLabel('Flicks per panel change',{exact:true}).selectOption('3');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).footer.flicks,3);
  await page.getByLabel('Flick to change panels',{exact:true}).uncheck();await page.getByLabel('Automatic rotation',{exact:true}).selectOption('1');
  await page.clock.fastForward(61000);assert.equal(await page.locator('#panel-preview-label').textContent(),'Weather');
  await page.getByLabel('Automatic rotation',{exact:true}).selectOption('0');
  await page.getByLabel('Starting panel',{exact:true}).selectOption('weather');
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
