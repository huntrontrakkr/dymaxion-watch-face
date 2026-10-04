// The settings page and the previews in other languages: the page follows the
// phone's language or the one chosen, Arabic reads right to left, every
// string the page shows has a translation, and the previews draw the face's
// words in the watch's own lettering.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import moment from 'moment-timezone';
import {defaults} from '../shared/settings.js';
import {LANGUAGES,WATCH_TEXT,watchDate} from '../shared/watch-text.js';
mkdirSync('test-results/languages',{recursive:true});
const template=readFileSync('tools/mobile-config.generated.html','utf8'),keys=new Set(JSON.parse(readFileSync('i18n/ui/source.json','utf8')));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
// The page opens as a data: URL; browsers and phones cap those near 2 MB.
const encoded=encodeURIComponent(template).length;
assert(encoded<1800000,`the settings page is ${encoded} bytes as a data: URL; keep it under 1.8 MB`);
const browser=await chromium.launch(),errors=[];
async function phone(settings={},locale='en-US'){
  const page=await browser.newPage({viewport:{width:390,height:844},locale});page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**',route=>route.abort());
  const html=template.replace('__CONFIG__',JSON.stringify({settings:{...defaults(),...settings},zoneNames:moment.tz.names(),city:{name:'Norfolk',lat:36.8,lon:-76.3}}));
  await page.goto('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  await page.waitForFunction(()=>document.querySelector('#preview-caption').textContent.length>0);
  return page;
}
// Strings still in English: exact source strings the page shows.
const english=page=>page.evaluate(keys=>{
  const out=new Set(),w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let n;n=w.nextNode();){const t=n.nodeValue.trim();if(keys.includes(t))out.add(t);}
  for(const el of document.querySelectorAll('[aria-label],[placeholder],[title]'))for(const a of ['aria-label','placeholder','title']){const v=el.getAttribute(a);if(v&&keys.includes(v))out.add(v);}
  return [...out];
},[...keys].filter(k=>!/^(Celsius|Fahrenheit|Plus|Latitude|Longitude|Canada|France|Australia|Weekend|Mexico|Composition|Palette|Ring|Triangle|Point|Check|Meridian · clock above the map|Leco Delta — 60° corners|0° · Original|Map X|Map Y|Local time X|Local time Y)$/.test(k)));
try{
  // The phone's language, with no choice made.
  let page=await phone({},'ja-JP');
  assert.equal(await page.locator('h1').textContent(),'文字盤の設定');
  assert.equal(await page.locator('#language').inputValue(),'auto');
  assert.equal(await page.locator('html').getAttribute('lang'),'ja');
  // Every string, in every section, open.
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(d=>d.open=true));
  assert.deepEqual(await english(page),[],'every string on the page has a Japanese translation');
  // Patterns translate their numbers and names too.
  assert.equal(await page.locator('[data-panel="rotationMinutes"] option[value="5"]').textContent(),'5分ごと');
  assert.equal(await page.getByLabel('場所 2 の街',{exact:true}).count(),1);
  await page.screenshot({path:'test-results/languages/ja.png'});
  // Choosing a language changes the page at once, and travels with the settings.
  await page.locator('#language').selectOption('de');
  assert.equal(await page.locator('h1').textContent(),'Zifferblatt-Einstellungen');
  assert.equal(await page.locator('#save-status').textContent(),'Änderungen bereit zum Speichern');
  assert.deepEqual(await english(page),[],'every string on the page has a German translation');
  await page.locator('#language').selectOption('en');
  assert.equal(await page.locator('h1').textContent(),'Watch face settings','English comes back from the remembered source');
  await page.close();
  // Arabic reads right to left; the face itself stays in English.
  page=await phone({language:'ar'});
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  assert.equal(await page.locator('h1').textContent(),'إعدادات واجهة الساعة');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'the right-to-left page fits');
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(d=>d.open=true));
  assert.deepEqual(await english(page),[],'every string on the page has an Arabic translation');
  await page.screenshot({path:'test-results/languages/ar.png'});await page.close();
  // Every language fits at a phone's width.
  for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){
    page=await phone({language:code});
    await page.locator('details').evaluateAll(nodes=>nodes.forEach(d=>d.open=true));
    for(const width of [320,390])
      {await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code} fits ${width}px`);}
    assert.deepEqual(await english(page),[],`every string on the page has a ${code} translation`);
    await page.close();
  }
  // The workshop draws the face's words in the chosen language.
  const workshop=await browser.newPage({timezoneId:'UTC'});workshop.on('pageerror',e=>errors.push(e.message));
  await workshop.clock.install({time:new Date('2026-10-07T12:00:00Z')});
  await workshop.addInitScript(s=>localStorage.setItem('dymaxion-workshop-v1',s),JSON.stringify({...defaults(),language:'ko'}));
  await workshop.goto(base);await workshop.waitForFunction(()=>document.querySelector('#screen').dataset.clockCaption);
  assert(String(await workshop.locator('#screen').getAttribute('data-clock-caption')).startsWith(watchDate(WATCH_TEXT.ko,new Date(2026,9,7))));
  assert.equal(await workshop.locator('#language').inputValue(),'ko');
  await workshop.locator('#screen').screenshot({path:'test-results/languages/workshop-ko.png'});await workshop.close();
  assert.deepEqual(errors,[]);
  console.log(`PASS: settings page in ${LANGUAGES.length-1} languages, right to left, ${encoded} bytes as a data: URL; workshop face language.`);
}finally{await browser.close();}
