import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const directory=new URL('./',import.meta.url),browser=await chromium.launch(),results=[];
try{
  for(const [width,scheme]of [[736,'light'],[390,'light'],[320,'dark']]){
    const page=await browser.newPage({viewport:{width,height:1100},colorScheme:scheme}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('preview.html',directory).href);
    const frame=page.frames().find(f=>f!==page.mainFrame());
    await frame.waitForFunction(()=>document.querySelector('#dymaxion-accessible-palettes')?.dataset.view==='normal/zones');
    assert.equal(await frame.locator('figure canvas').count(),6);
    const pixels=()=>frame.locator('figure canvas').evaluateAll(canvases=>canvases.map(c=>c.toDataURL()));
    const original=await pixels();
    for(const mode of ['protan','deutan','tritan','grayscale']){
      await frame.getByLabel('Color-vision preview').selectOption(mode);
      const changed=await pixels();assert.notEqual(changed[0],original[0]);
      assert.equal(changed[1],original[1],'Monochrome stays unchanged in simulations');
    }
    assert(await frame.locator('canvas').evaluateAll(cs=>cs.every(c=>{
      const d=c.getContext('2d').getImageData(0,0,200,228).data;
      for(let i=0;i<d.length;i+=4)if(d[i]!==d[i+1]||d[i]!==d[i+2])return false;return true;
    })));
    await frame.getByLabel('Bottom panel').selectOption('weather');
    assert.equal(await frame.evaluate(()=>window.openai.widgetState.modelContent.panel),'weather');
    assert.equal(await frame.evaluate(()=>window.openai.widgetState.modelContent.vision),'grayscale');
    await frame.evaluate(()=>dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{modelContent:{study:'dymaxion-accessible-palettes-v1',vision:'normal',panel:'zones'}}}}})));
    assert.deepEqual(await pixels(),original,'State restoration returns to original pixels');
    const geometry=await frame.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,height:document.documentElement.scrollHeight}));
    assert(geometry.scroll<=geometry.width,'No horizontal overflow');
    await page.locator('iframe').evaluate((el,height)=>el.style.height=height+'px',geometry.height);
    await page.screenshot({path:new URL(`preview-${width}-${scheme}.png`,directory).pathname,fullPage:true});
    assert.deepEqual(errors,[]);results.push({width,scheme,geometry,checks:'six renders, all simulations, panel switching, saved state, restoration, no errors or overflow'});
    await page.close();
  }
  writeFileSync(new URL('check-results.json',directory),JSON.stringify(results,null,2));
  console.log('Palette comparison passed at 736/light, 390/light and 320/dark, including simulation and saved-state interactions.');
}finally{await browser.close();}
