import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const directory=new URL('./',import.meta.url),browser=await chromium.launch(),results=[];
try{
  for(const [width,scheme]of [[736,'light'],[390,'light'],[320,'dark']]){
    const page=await browser.newPage({viewport:{width,height:950},colorScheme:scheme}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('preview.html',directory).href);
    const frame=page.frames().find(f=>f!==page.mainFrame());
    const loaded=()=>frame.waitForFunction(()=>[...document.querySelectorAll('figure img')].every(i=>i.complete&&i.naturalWidth===200));
    await loaded();const root=frame.locator('#dymaxion-chart-refinement');
    for(const id of ['weather12','humidity','tide','tide48','mono','weather']){
      await frame.getByLabel('Panel example').selectOption(id);await loaded();
      assert.equal(await root.getAttribute('data-view'),id+'/chart');
      assert.equal(await frame.evaluate(()=>window.openai.widgetState.modelContent.example),id);
      const [before,after]=await frame.locator('figure img').evaluateAll(images=>images.map(i=>i.src));assert.notEqual(before,after);
    }
    await frame.getByLabel('Enlarge chart detail').uncheck();await loaded();
    assert.equal(await frame.locator('[data-after]').evaluate(i=>i.naturalHeight),228);
    assert.equal(await frame.evaluate(()=>window.openai.widgetState.modelContent.detail),false);
    await frame.evaluate(()=>dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{modelContent:{study:'dymaxion-chart-refinement-v1',example:'weather',detail:true}}}}})));
    await loaded();assert.equal(await root.getAttribute('data-view'),'weather/chart');
    for(const box of await frame.locator('figure img').evaluateAll(images=>images.map(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})))){
      assert.equal(box.width%200,0,'preview uses whole pixel multiples');
      assert.equal(box.height,44*box.width/200);
    }
    const geometry=await frame.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,height:document.documentElement.scrollHeight}));
    assert(geometry.scroll<=geometry.width,'No horizontal overflow');
    await page.locator('iframe').evaluate((el,h)=>el.style.height=h+'px',geometry.height);
    await page.screenshot({path:new URL(`preview-${width}-${scheme}.png`,directory).pathname,fullPage:true});
    assert.deepEqual(errors,[]);results.push({width,scheme,geometry,checks:'six examples, detail/full-watch switch, saved state and restoration, no errors or overflow'});await page.close();
  }
  writeFileSync(new URL('check-results.json',directory),JSON.stringify(results,null,2));
  console.log('Chart comparison passed at 736/light, 390/light and 320/dark.');
}finally{await browser.close();}
