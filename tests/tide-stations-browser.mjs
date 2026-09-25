import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import moment from 'moment-timezone';
import {defaults} from '../shared/settings.js';
const read=name=>JSON.parse(readFileSync('tests/fixtures/'+name+'.json'));
const catalog=read('noaa-stations'),details=read('noaa-station-details');
const template=readFileSync('tools/mobile-config.generated.html','utf8');
const position=()=>({lat:36.85,lon:-76.29,fetched:Date.now()});
const browser=await chromium.launch(),errors=[];
mkdirSync('test-results/noaa-stations',{recursive:true});
async function phone({settings=defaults(),location=position(),reply}={}){
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Pacific/Honolulu',hasTouch:true}),requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.tidesandcurrents.noaa.gov/**',async route=>{
    const url=new URL(route.request().url());requests.push(url);
    if(reply&&await reply(route,url,requests.length))return;
    await route.fulfill({json:url.pathname.endsWith('/stations.json')?catalog:details,headers:{'access-control-allow-origin':'*'}});
  });
  const html=template.replace('__CONFIG__',JSON.stringify({settings,zoneNames:moment.tz.names(),city:{name:'Norfolk',lat:36.8,lon:-76.3},position:location}));
  await page.goto('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  await page.waitForFunction(()=>document.querySelector('#preview-caption').textContent.includes('Sample readings'));
  await page.locator('.config-section > summary').filter({hasText:'Bottom panels'}).click();
  return {page,requests,open:()=>page.getByText('NOAA tides',{exact:true}).click(),
    station:()=>page.getByLabel('NOAA station ID',{exact:true}).inputValue(),
    settled:()=>page.waitForFunction(()=>!document.querySelector('[data-nearby-tides]').disabled)};
}
async function waitStation(page,id){await page.waitForFunction(id=>document.querySelector('[data-panel="tide.station"]').value===id,id);}
try{
  const h=await phone();assert.equal(h.requests.length,0,'no catalog download before tide setup');
  await h.page.getByLabel('Include Tide',{exact:true}).check();await waitStation(h.page,'8638660');
  assert.equal(await h.page.getByLabel('Tide label',{exact:true}).inputValue(),'PORTSMO');
  assert.equal(await h.page.getByLabel('Tide station time zone',{exact:true}).inputValue(),'America/New_York','station zone differs from the phone');
  assert.equal(h.requests.length,2);assert(h.requests.every(u=>!u.searchParams.has('latitude')&&!u.searchParams.has('longitude')),'coordinates stay on the phone');
  await h.open();assert.equal(await h.page.locator('optgroup[label="Near your location"] option').count(),5);
  assert.match(await h.page.locator('[data-tide-status]').textContent(),/Nearest hourly station selected/);
  await h.page.getByLabel('Starting panel',{exact:true}).selectOption('tide');
  for(const width of [320,390,768]){await h.page.setViewportSize({width,height:844});assert(await h.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'station controls fit '+width);}
  await h.page.setViewportSize({width:390,height:844});
  await h.page.locator('[data-tide-section]').scrollIntoViewIfNeeded();
  await h.page.screenshot({path:'test-results/noaa-stations/nearby-phone.png'});
  await h.page.getByLabel('Tide station',{exact:true}).selectOption('8638671');await waitStation(h.page,'8638671');
  assert.equal(await h.page.getByLabel('Tide label',{exact:true}).inputValue(),'LAFAYET');
  await h.page.getByRole('button',{name:'Find nearby NOAA stations',exact:true}).click();await h.settled();
  assert.equal(await h.station(),'8638671','finding again preserves the chosen station');assert.equal(h.requests.length,3,'same-page catalog is cached');
  let response='';const cdp=await h.page.context().newCDPSession(h.page);await cdp.send('Page.enable');
  cdp.on('Page.frameRequestedNavigation',e=>{if(e.url.startsWith('pebblejs://close'))response=e.url;});
  await h.page.locator('#apply').click();await h.page.waitForTimeout(100);
  const saved=JSON.parse(decodeURIComponent(response.split('#')[1]));
  assert.equal(saved.footer.tide.station,'8638671');assert.equal(saved.footer.tide.label,'LAFAYET');assert.equal(saved.footer.tide.tz,'America/New_York');
  const existing=await phone({settings:saved});await existing.open();assert.equal(existing.requests.length,0,'saved station never starts an automatic lookup');
  await existing.page.getByRole('button',{name:'Find nearby NOAA stations',exact:true}).click();await existing.settled();assert.equal(await existing.station(),'8638671');assert.equal(existing.requests.length,1);
  await existing.page.close();await h.page.close();

  for(const location of [null,{...position(),fetched:Date.now()-16*60000}]){
    const denied=await phone({location});await denied.open();await denied.page.getByText('Phone location unavailable.',{exact:false}).waitFor();
    assert.equal(denied.requests.length,0,'coarse city caption cannot substitute for phone location');
    await denied.page.getByLabel('Tide station',{exact:true}).selectOption('custom');
    assert(await denied.page.getByLabel('NOAA station ID',{exact:true}).isVisible());
    await denied.page.getByLabel('NOAA station ID',{exact:true}).fill('8518750');await denied.page.getByLabel('NOAA station ID',{exact:true}).press('Tab');
    assert.equal(await denied.station(),'8518750');await denied.page.close();
  }
  const inland=await phone({location:{...position(),lat:39.74,lon:-104.99}});await inland.open();
  await inland.page.getByText('No hourly NOAA tide stations within 150 km.',{exact:false}).waitFor();assert.equal(await inland.station(),'');assert.equal(inland.requests.length,1);await inland.page.close();
  const offline=await phone({reply:async(route,url,n)=>{if(n===1){await route.abort();return true;}}});await offline.open();
  await offline.page.getByText('NOAA station lookup is unavailable.',{exact:false}).waitFor();
  await offline.page.getByRole('button',{name:'Find nearby NOAA stations',exact:true}).click();await waitStation(offline.page,'8638660');await offline.page.close();

  // A choice made while either network stage is pending wins over the old suggestion.
  for(const stage of ['catalog','details']){
    let release,started;const blocked=new Promise(r=>release=r),pending=new Promise(r=>started=r);
    const race=await phone({reply:async(route,url)=>{
      if(url.pathname.endsWith('/stations.json')===(stage==='catalog')){started();await blocked;}
    }});
    await race.open();await pending;
    await race.page.getByLabel('Tide station',{exact:true}).selectOption('1612340');release();
    await race.page.waitForTimeout(200);assert.equal(await race.station(),'1612340');
    assert.equal(await race.page.getByLabel('Tide station time zone',{exact:true}).inputValue(),'Pacific/Honolulu');await race.page.close();
  }
  const bad=await phone({reply:async(route,url)=>{
    if(!url.pathname.endsWith('/stations.json')){await route.fulfill({json:{stations:[{...details.stations[0],observedst:null}]}});return true;}
  }});await bad.open();await bad.page.getByText('NOAA did not provide a usable station time zone.',{exact:false}).waitFor();
  assert.equal(await bad.station(),'','missing metadata does not silently use phone time');
  await bad.page.getByLabel('Tide station',{exact:true}).selectOption('8518750');assert.equal(await bad.station(),'8518750');await bad.page.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: nearby NOAA defaults, alternatives, saved stations, data-URL phone location, races, offline retry, manual fallback and save.');
}finally{await browser.close();}
