// The phone settings page draws its own watch preview (tools/config-preview.js).
// At the same moment it must match the workshop pixel for pixel.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import moment from 'moment-timezone';
import {defaults,THEMES} from '../shared/settings.js';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
const html=readFileSync('tools/mobile-config.generated.html','utf8');
// The settings page shows a sample 10:08 in the morning.
const when=new Date('2026-09-23T14:08:20Z'),theme=name=>THEMES.findIndex(t=>t.name===name);
const cases={
  'default, 12-hour':{format:2},
  'map Moon beside the independent top-bar Moon':{mapMoon:true},
  'turned map with Moon and map times':{mapRotation:180,mapMoon:true,zoneTimes:'always',zonePosition:'map'},
  'turned map, shading off, only map Moon':{mapRotation:180,mapMoon:true,dayNight:false,moonIndicator:false,mapBackground:'lines'},
  'place icons off':{theme:theme('High Visibility'),format:2,placeIcons:false},
  'tall times beside the clock, 24-hour':{format:1,zoneTimes:'always',zonePosition:'left',zoneTimesTall:true},
  'clock below the map, nameplate on':{format:2,time:[0,134],map:[0,24],nameplate:true},
  'times on the map, largest size, turned':{format:2,zoneTimes:'always',zonePosition:'map',mapTimeSize:'huge',mapTimesTurn:true},
  'times on the map, wide, 24-hour, dotted background':{format:1,zoneTimes:'always',zonePosition:'map',mapTimeSize:'wide',mapBackground:'lines'},
  'times between the clock and the map, 12-hour':{format:2,zoneTimes:'always',zonePosition:'strip'},
  'times between the clock and the map, below the map':{format:1,zoneTimes:'always',zonePosition:'strip',time:[0,134],map:[0,24]},
  'compact strip times, 24-hour':{format:1,zoneTimes:'always',zonePosition:'strip',zoneStripCompact:true},
  'compact strip below the map, 12-hour, independent of tall column':{format:2,zoneTimes:'always',zonePosition:'strip',zoneStripCompact:true,zoneTimesTall:true,time:[0,134],map:[0,24]},
  'icosahedron on the left of Chamfer':{clockArt:'left',zoneTimes:'panel'},
  'icosahedron on the right of Leco, place times take its place':{clockArt:'right',clockDisplay:'leco',zoneTimes:'always',zonePosition:'left'}
};
const browser=await chromium.launch(),errors=[];
try{
  for(const [name,change] of Object.entries(cases)){
    const settings={...defaults(),...change,location:{mode:'manual',name:'Norfolk'}};
    let page=await browser.newPage({timezoneId:'America/New_York'});page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:when});
    await page.addInitScript(s=>localStorage.setItem('dymaxion-workshop-v1',s),JSON.stringify(settings));
    await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));await page.clock.runFor(3000);
    const workshop=await page.locator('#screen').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,200,228).data));await page.close();
    page=await browser.newPage({timezoneId:'America/New_York'});page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:when});
    await page.goto('data:text/html;charset=utf-8,'+encodeURIComponent(html.replace('__CONFIG__',JSON.stringify({settings,zoneNames:moment.tz.names(),city:{name:'Norfolk',lat:36.8,lon:-76.3}}))));
    await page.waitForFunction(()=>document.querySelector('#preview-caption').textContent.includes('Sample readings'));
    const phone=await page.locator('#watch-preview').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,200,228).data));await page.close();
    const off=[];for(let i=0;i<phone.length;i+=4)if(phone[i]!==workshop[i]||phone[i+1]!==workshop[i+1]||phone[i+2]!==workshop[i+2])off.push(`${(i/4)%200},${Math.floor(i/800)}`);
    assert.equal(off.length,0,`${name}: the settings preview differs from the workshop at ${off.slice(0,8).join(' ')}`);
  }
  assert.deepEqual(errors,[]);
  // Rotating the map must be an exact pixel permutation, not a canvas transform
  // that introduces smoothing or changes the clock, status bar or footer.
  const page=await browser.newPage({timezoneId:'America/New_York'});page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:when});
  const plain={...defaults(),sun:false,lights:false,edges:true,mapBackground:'lines',location:{mode:'manual',name:'Norfolk'}};
  plain.places=plain.places.map(p=>({...p,on:false}));
  await page.addInitScript(s=>localStorage.setItem('dymaxion-workshop-v1',JSON.stringify(s)),plain);
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time').textContent.includes('LIVE'));await page.clock.runFor(3000);
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(d=>d.open=true));
  const pixels=()=>page.locator('#screen').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,200,228).data));
  const original=await pixels();await page.locator('#mapRotation').selectOption('180');await page.clock.runFor(100);
  const turned=await pixels(),[mx,my]=plain.map;
  for(let y=0;y<228;y++)for(let x=0;x<200;x++){
    const within=x>=mx&&x<mx+200&&y>=my&&y<my+104;
    const from=within?((my+103-(y-my))*200+mx+199-(x-mx))*4:(y*200+x)*4;
    const to=(y*200+x)*4;assert.deepEqual(turned.slice(to,to+4),original.slice(from,from+4),`${x},${y}`);
  }
  await page.locator('#mapRotation').selectOption('0');await page.clock.runFor(100);assert.deepEqual(await pixels(),original,'turning back leaves no old pixels');
  await page.close();assert.deepEqual(errors,[]);
}finally{await browser.close();}
console.log('settings preview matches the workshop');
