import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import moment from 'moment-timezone';
import {defaults,THEMES} from '../shared/settings.js';
mkdirSync('test-results/settings',{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'America/New_York',hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const norfolk={id:4776222,name:'Norfolk',latitude:36.84681,longitude:-76.28522,timezone:'America/New_York',admin1:'Virginia',country:'United States'};
const html=readFileSync('tools/mobile-config.generated.html','utf8').replace('__CONFIG__',JSON.stringify({settings:defaults(),zoneNames:moment.tz.names(),city:{name:'Norfolk',lat:36.8,lon:-76.3}}));
const section=name=>page.locator('.config-section').filter({has:page.locator(':scope > summary').filter({hasText:name})}).first();
const openSection=async name=>{const el=section(name);if(!await el.evaluate(e=>e.open))await el.locator(':scope > summary').click();};
const pixels=()=>page.locator('#watch-preview').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,200,228).data));
try{
  await page.goto('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  await page.waitForFunction(()=>document.querySelector('#preview-caption').textContent.includes('Sample readings'));
  assert.equal(await page.locator('#preview-error').textContent(),'');
  for(const width of [320,390,768,1100]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'settings fit '+width+'px');}
  // The preview can show the colors as on the watch, and back.
  await page.locator('#preview-watch-colors').click();
  assert.equal(await page.locator('#preview-watch-colors').getAttribute('aria-pressed'),'true');assert(await page.locator('canvas[data-watch-view]').isVisible());
  await page.locator('#preview-watch-colors').click();
  assert.equal(await page.locator('#preview-watch-colors').getAttribute('aria-pressed'),'false');assert(await page.locator('canvas[data-watch-view]').isHidden());
  await page.setViewportSize({width:390,height:844});
  const before=await pixels();assert(before.some((n,i)=>i%4!==3&&n>0),'preview is drawn');
  assert(before.every((n,i)=>i%4===3?n===255:n%85===0),'preview uses native opaque pixels');
  await page.locator('#palette-picker > summary').click();
  assert.equal(await page.locator('#palette-options button').count(),THEMES.filter(t=>!t.hidden).length);
  await page.locator('#palette-options').getByRole('button',{name:'DaVinci',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#preview-palette').textContent==='DaVinci');
  assert.notDeepEqual(await pixels(),before);assert.equal(await page.locator('#palette-picker').evaluate(e=>e.open),false);
  await page.locator('#preview-night').click();await page.waitForTimeout(50);const night=await pixels();
  await page.locator('#preview-day').click();await page.waitForTimeout(50);assert.notDeepEqual(await pixels(),night,'sunlight preview changes');
  await page.screenshot({path:'test-results/settings/appearance.png',fullPage:true});
  for(const palette of THEMES.filter(t=>!t.hidden)){
    await page.locator('#palette-picker > summary').click();
    await page.locator('#palette-options').getByRole('button',{name:palette.name,exact:true}).click();
    await page.waitForFunction(name=>document.querySelector('#preview-palette').textContent===name,palette.name);
    assert.equal(await page.locator('#preview-error').textContent(),'');
    assert((await pixels()).every((n,i)=>i%4===3?n===255:n%85===0),palette.name+' uses native pixels');
  }
  await page.locator('#palette-picker > summary').click();await page.locator('#palette-options').getByRole('button',{name:'DaVinci',exact:true}).click();
  const lettering=page.getByLabel('Numerical display',{exact:true});
  for(const style of await lettering.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value))){
    await lettering.selectOption(style);await page.waitForTimeout(40);assert.equal(await page.locator('#preview-error').textContent(),'','preview supports '+style);
  }
  await lettering.selectOption('chamfer');
  await page.locator('#preset').selectOption('horizon');await page.waitForTimeout(40);assert.equal(await page.locator('#preview-error').textContent(),'');
  await page.locator('#preset').selectOption('meridian');
  await openSection('Places');
  let mode='ok',requests=0;
  await page.route('https://geocoding-api.open-meteo.com/**',async route=>{
    requests++;const q=new URL(route.request().url()).searchParams.get('name');
    if(mode==='offline')return route.abort();
    if(q==='Slowcity'){await new Promise(r=>setTimeout(r,700));try{await route.fulfill({json:{results:[{...norfolk,name:'Old city'}]}});}catch{}return;}
    await route.fulfill({json:{results:mode==='empty'?[]:[norfolk,{...norfolk,id:2,admin1:'Nebraska',timezone:'America/Chicago',latitude:42,longitude:-97}]}});
  });
  await page.getByLabel('Color for place 1',{exact:true}).fill('#aa5500');
  await page.getByLabel('Symbol for place 1',{exact:true}).selectOption('4');
  await page.getByLabel('Enable place 1',{exact:true}).uncheck();
  const search=page.getByRole('combobox',{name:'Search city for place 1',exact:true});
  await search.fill('N');await page.waitForTimeout(450);assert.equal(requests,0);
  await search.fill('Nor');await search.fill('Norf');await search.fill('Norfolk');
  await page.getByRole('option').filter({hasText:'Virginia, United States'}).waitFor();assert.equal(requests,1,'typing is debounced');
  await page.screenshot({path:'test-results/settings/city-search.png',fullPage:true});
  await search.press('ArrowDown');await search.press('Enter');
  assert.equal(await page.getByLabel('Label for place 1',{exact:true}).inputValue(),'ORF');
  assert.equal(await page.getByLabel('Latitude for place 1',{exact:true}).inputValue(),'36.84681');
  assert.equal(await page.getByLabel('Time zone for place 1',{exact:true}).inputValue(),'America/New_York');
  assert.equal(await page.getByLabel('Color for place 1',{exact:true}).inputValue(),'#aa5500');
  assert.equal(await page.getByLabel('Symbol for place 1',{exact:true}).inputValue(),'4');assert(!await page.getByLabel('Enable place 1',{exact:true}).isChecked());
  await page.getByLabel('Enable place 1',{exact:true}).check();
  await page.getByLabel('Label for place 1',{exact:true}).fill('HOME');await page.getByLabel('Label for place 1',{exact:true}).press('Tab');
  await search.fill('Slowcity');await page.waitForTimeout(400);await search.fill('Norfolk');
  await page.getByRole('option').filter({hasText:'Virginia, United States'}).waitFor();await page.waitForTimeout(750);assert.equal(await page.getByRole('option').filter({hasText:'Old city'}).count(),0,'late responses cannot replace newer matches');
  await search.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
  mode='empty';await search.fill('NoSuchPlace');await page.getByText('No cities found.',{exact:false}).waitFor();
  mode='offline';await search.fill('Norfolk');await page.getByText('City search is unavailable.',{exact:false}).waitFor();
  await page.getByRole('listbox',{name:'Matching cities'}).getByRole('option').filter({hasText:'Norfolk'}).tap();assert.equal(await page.getByLabel('Label for place 1',{exact:true}).inputValue(),'ORF','offline city remains selectable by touch');
  await openSection('Bottom panels');await page.getByLabel('Starting panel',{exact:true}).selectOption('weather');
  await page.getByLabel('Panel gesture',{exact:true}).selectOption('3');
  await page.getByText('Weather & humidity',{exact:true}).click();
  const forecast=page.getByLabel('Forecast location',{exact:true});assert.equal(await forecast.inputValue(),'current');
  await forecast.selectOption('1');await page.waitForTimeout(40);assert.equal(await page.locator('#preview-error').textContent(),'');
  await forecast.selectOption('current');
  await page.waitForFunction(()=>document.querySelector('#preview-caption').textContent.startsWith('Weather'));
  assert.equal(await page.locator('#preview-error').textContent(),'');
  for(let i=0;i<8;i++)await page.locator('#preview-next').click();assert.equal(await page.locator('#preview-error').textContent(),'');
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(d=>d.open=true));
  for(const width of [320,390,768,1100]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'expanded settings fit '+width+'px');}
  await page.setViewportSize({width:390,height:844});
  // Exercise the actual Pebble return URL, with no mutation hook in production.
  let response='';const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');
  cdp.on('Page.frameRequestedNavigation',event=>{if(event.url.startsWith('pebblejs://close'))response=event.url;});
  await page.locator('#apply').click();await page.waitForTimeout(100);
  assert(response.startsWith('pebblejs://close#'),'Save returns settings to Pebble');
  const saved=JSON.parse(decodeURIComponent(response.split('#')[1]));assert.equal(saved.places[0].label,'ORF');assert.equal(saved.places[0].icon,4);assert.equal(saved.theme,4);assert.equal(saved.footer.home,'weather');
  assert.equal(saved.footer.weather.place,'current');
  assert.equal(saved.footer.flicks,3);
  assert.deepEqual(errors,[]);console.log('PASS: phone settings, city search, offline fallback, race handling, native palette preview and save.');
}finally{await browser.close();}
