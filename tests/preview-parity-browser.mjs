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
  'place icons off':{theme:theme('High Visibility'),format:2,placeIcons:false},
  'tall times beside the clock, 24-hour':{format:1,zoneTimes:'always',zonePosition:'left',zoneTimesTall:true},
  'stacked':{format:2,stacked:true}
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
}finally{await browser.close();}
console.log('settings preview matches the workshop');
