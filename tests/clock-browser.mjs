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
  // Map backgrounds (triangle points, lines, fine points) fill only the empty map pixels, in the edge colour.
  const mapBlock=()=>screen.evaluate(c=>[...c.getContext('2d').getImageData(0,73,200,104).data]);
  assert.equal(await page.getByLabel('Map background',{exact:true}).inputValue(),'none');
  await page.clock.runFor(3500);const plain=await mapBlock(); // let any marker pulse finish
  const settingsNow=JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))),{paletteFor}=await import('../shared/palette-settings.js'),pal=paletteFor(settingsNow);
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  for(const [id,low,high] of [['points',20,40],['lines',300,494],['fine-points',90,130]]){
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
  // Place times beside the clock: off by default, on while another panel shows
  // (or Quick View covers the band) in when-hidden, always in always.
  await page.getByRole('tab',{name:'Composition',exact:true}).click();await page.getByRole('button',{name:'Meridian',exact:true}).click();
  await page.getByRole('tab',{name:'Character',exact:true}).click();await page.getByLabel('Numerical display',{exact:true}).selectOption('chamfer');
  const beside=()=>screen.getAttribute('data-zones-beside');
  assert.equal(await page.getByLabel('Place times',{exact:true}).inputValue(),'panel');assert.equal(await beside(),'false');
  await page.getByLabel('Place times',{exact:true}).selectOption('when-hidden');
  assert.equal(await page.locator('#panel-preview-label').textContent(),'Time zones');assert.equal(await beside(),'false','zones page: times stay in the panel');
  const column=(x=0)=>screen.evaluate((c,x)=>[...c.getContext('2d').getImageData(x,22,70,40).data],x);const empty=await column();
  assert.equal(await page.getByLabel('Place times position',{exact:true}).inputValue(),'left');
  await page.locator('#next-panel').click();assert.notEqual(await page.locator('#panel-preview-label').textContent(),'Time zones');
  assert.equal(await beside(),'true','another panel: times move beside the clock');
  // Transitions: the tray swipes over and the clock glides aside before the times fade in.
  assert.equal(await screen.getAttribute('data-tray-sliding'),'true');assert(Number(await screen.getAttribute('data-beside-progress'))<200,'just started');
  await page.clock.runFor(150);const glide=Number(await screen.getAttribute('data-beside-progress'));assert(glide>0&&glide<1000,`mid-way: ${glide}`);
  await screen.screenshot({path:'test-results/transition-mid.png'});
  await page.clock.runFor(600);assert.equal(await screen.getAttribute('data-beside-progress'),'1000');assert.equal(await screen.getAttribute('data-tray-sliding'),'false');
  assert.notDeepEqual(await column(),empty);
  assert.match(await screen.getAttribute('data-clock-caption'),/ PM$/,'12-hour AM/PM moves to the status line beside the place times');
  for(let n=0;n<6&&await page.locator('#panel-preview-label').textContent()!=='Time zones';n++)await page.locator('#next-panel').click();
  assert.equal(await beside(),'false');
  await page.locator('#quick-view').check();assert.equal(await beside(),'true','Quick View covers the panel');await page.locator('#quick-view').uncheck();
  await page.getByLabel('Place times',{exact:true}).selectOption('always');assert.equal(await beside(),'true');
  const leftColumn=await column(0),rightEmpty=await column(130);
  await page.getByLabel('Place times position',{exact:true}).selectOption('right');
  assert.notDeepEqual(await column(130),rightEmpty,'the column moves to the right');assert.notDeepEqual(await column(0),leftColumn);
  await screen.screenshot({path:'test-results/place-times-right.png'});
  await page.getByLabel('Place times position',{exact:true}).selectOption('left');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).zonePosition,'left');
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).zoneTimes,'always');
  await screen.screenshot({path:'test-results/place-times-beside.png'});
  await page.getByLabel('Numerical display',{exact:true}).selectOption('broad');assert.equal(await beside(),'false');assert.match(await page.locator('[data-zone-note]').first().textContent(),/On the map/,'Broad fills the width, so the note points to the map');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('leco');assert.equal(await beside(),'true');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('chamfer');await page.getByLabel('Place times',{exact:true}).selectOption('panel');
  // On the map: tiny times in the open gaps, joined to their places; any clock style.
  const mapArea=()=>screen.evaluate(c=>[...c.getContext('2d').getImageData(0,73,200,104).data]);
  await page.clock.runFor(3000);const bare=await mapArea();
  await page.getByLabel('Place times',{exact:true}).selectOption('always');await page.getByLabel('Place times position',{exact:true}).selectOption('map');
  assert.equal(await screen.getAttribute('data-zones-on-map'),'true');assert.equal(await screen.getAttribute('data-zones-beside'),'false');
  await page.clock.runFor(3000);assert.notDeepEqual(await mapArea(),bare,'times drawn on the map');
  assert(!await page.getByLabel('Turn map times to fit',{exact:true}).isDisabled());
  await page.getByLabel('Numerical display',{exact:true}).selectOption('broad');assert.equal(await screen.getAttribute('data-zones-on-map'),'true','map times work with any clock');
  await page.getByLabel('Numerical display',{exact:true}).selectOption('chamfer');
  await screen.screenshot({path:'test-results/place-times-map.png'});
  await page.getByLabel('Place times position',{exact:true}).selectOption('left');await page.getByLabel('Place times',{exact:true}).selectOption('panel');
  // The Dymaxion nameplate: off by default, between the clock and the map in Meridian.
  const gap=()=>screen.evaluate(c=>[...c.getContext('2d').getImageData(0,61,200,18).data]);const bareGap=await gap();
  assert.equal(await page.getByLabel('Dymaxion nameplate',{exact:true}).isChecked(),false);assert.equal(await screen.getAttribute('data-nameplate'),'');
  await page.getByLabel('Dymaxion nameplate',{exact:true}).check();
  assert.equal(await screen.getAttribute('data-nameplate'),'39,62','centred, its last row a pixel above the map');assert.notDeepEqual(await gap(),bareGap);
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('dymaxion-workshop-v1'))).nameplate,true);
  await screen.screenshot({path:'test-results/nameplate.png'});
  await page.getByRole('tab',{name:'Composition',exact:true}).click();await page.getByRole('button',{name:'Horizon',exact:true}).click();
  assert.equal(await screen.getAttribute('data-nameplate'),'39,124','Horizon: under the map');assert.equal(await screen.getAttribute('data-clock-top'),'140','the clock moves down six pixels for it');
  await screen.screenshot({path:'test-results/nameplate-horizon.png'});
  await page.getByRole('button',{name:'Meridian',exact:true}).click();await page.getByRole('tab',{name:'Character',exact:true}).click();
  await page.getByLabel('Dymaxion nameplate',{exact:true}).uncheck();
  await page.getByRole('tab',{name:'Composition',exact:true}).click();await page.getByRole('button',{name:'Horizon',exact:true}).click();
  assert.equal(await screen.getAttribute('data-clock-top'),'134','without it Horizon is unchanged');
  await page.getByRole('button',{name:'Meridian',exact:true}).click();
  assert.deepEqual(errors,[]);console.log('PASS: actual and manual city captions, hourly lookup cache, 12-hour and stacked time, Span persistence, retired triangular display, system fonts, the map background, and place times beside the clock and on the map, and the nameplate.');
}finally{await browser.close();}
