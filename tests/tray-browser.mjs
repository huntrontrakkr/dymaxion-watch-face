import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch();
mkdirSync('test-results/tray-glitch',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,timezoneId:'America/New_York'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-09-24T16:34:10Z')});
  await page.clock.pauseAt(new Date('2026-09-24T16:34:10Z'));
  // Count actual paints, independent of how the animation scheduler is built.
  await page.addInitScript(()=>{
    window.watchPaints=0;const clear=CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect=function(...args){
      if(this.canvas.id==='screen')window.watchPaints++;
      return clear.apply(this,args);
    };
  });
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#preview-time')?.textContent.includes('LIVE'));
  const screen=page.locator('#screen'),next=()=>page.locator('#next-panel').click();
  const paints=()=>page.evaluate(()=>watchPaints);
  const reduced=async value=>{
    // Media changes are browser events, not part of Playwright's paused JS clock.
    await page.evaluate(value=>{
      const media=matchMedia('(prefers-reduced-motion: reduce)');
      window.mediaChanged=media.matches===value?Promise.resolve():new Promise(resolve=>media.addEventListener('change',resolve,{once:true}));
    },value);
    await page.emulateMedia({reducedMotion:value?'reduce':'no-preference'});
    await page.evaluate(()=>window.mediaChanged);
  };
  const pixels=()=>screen.evaluate(c=>[...c.getContext('2d').getImageData(0,0,200,228).data]);
  const start=await paints();
  for(let cycle=0;cycle<3;cycle++)for(let n=0;n<4;n++){await next();await page.clock.runFor(70);}
  await page.clock.runFor(1700);
  const burstPaints=await paints()-start;
  assert(burstPaints<200,`rapid tray changes must not multiply redraw timers (${burstPaints} paints)`);
  assert.equal(await page.locator('#panel-preview-label').textContent(),'Time zones');
  assert.equal(await screen.getAttribute('data-tray-sliding'),'false');
  const settled=await pixels(),idle=await paints();await page.clock.runFor(800);
  assert.equal(await paints(),idle,'the settled face has no animation callbacks');
  assert.deepEqual(await pixels(),settled);
  await reduced(true);
  assert.deepEqual(await pixels(),settled,'the settled tray matches a clean, non-animated repaint');
  await reduced(false);

  // Quick View interrupts a swipe; the old tray must not reappear over its card.
  await next();await page.clock.runFor(70);await page.locator('#quick-view').check();await page.clock.runFor(500);
  assert.equal(await screen.getAttribute('data-tray-sliding'),'false');
  const card=await pixels();await page.clock.runFor(500);assert.deepEqual(await pixels(),card);
  await page.locator('#quick-view').uncheck();await page.clock.runFor(600);
  const uncovered=await pixels();await reduced(true);assert.deepEqual(await pixels(),uncovered);
  await reduced(false);

  // Stopping motion also stops a running marker pulse immediately.
  await page.locator('#pulse').click();await page.clock.runFor(80);
  await reduced(true);const still=await pixels(),stopped=await paints();
  await page.clock.runFor(1000);assert.equal(await paints(),stopped,'reduced motion cancels pulse callbacks');assert.deepEqual(await pixels(),still);
  await reduced(false);

  // Mobile browsers hide the page when switching apps. Cancel both animation
  // drivers and redraw the selected page cleanly when visibility returns.
  for(const swipe of [false,true]){
    await page.locator('#pulse').click();if(swipe)await next();await page.clock.runFor(70);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
    const hiddenPaints=await paints();await page.clock.runFor(1000);assert.equal(await paints(),hiddenPaints,'hidden page stops animation work');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await screen.getAttribute('data-tray-sliding'),'false');
    const resumed=await pixels();await reduced(true);assert.deepEqual(await pixels(),resumed);await reduced(false);
  }

  // The minute flip supplies its own frames; tray/pulse work must hand off cleanly.
  await page.clock.runFor(await page.evaluate(()=>60000-Date.now()%60000)+2);
  assert.equal(await screen.getAttribute('data-clock-animating'),'true');
  const overlapStart=await paints();
  for(let n=0;n<4;n++){await next();await page.clock.runFor(70);}
  await page.clock.runFor(1700);
  assert(await paints()-overlapStart<180,'minute overlap stays within one display-frame stream');
  assert.equal(await screen.getAttribute('data-clock-animating'),'false');assert.equal(await screen.getAttribute('data-tray-sliding'),'false');
  const final=await pixels();await reduced(true);assert.deepEqual(await pixels(),final);
  await screen.screenshot({path:'test-results/tray-glitch/verified.png'});
  assert.deepEqual(errors,[]);
  console.log(`PASS: rapid tray switching (${burstPaints} paints), idle, clean final pixels, Quick View, reduced motion, background/resume and minute-flip overlap.`);
}finally{await browser.close();}
