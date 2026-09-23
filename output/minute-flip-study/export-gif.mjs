import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const directory = new URL('./gif-frames/', import.meta.url);
mkdirSync(directory, {recursive: true});
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(new URL('./preview.html', import.meta.url).href);
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  await frame.waitForSelector('[data-watch]');
  await frame.waitForFunction(() => performance.getEntriesByType('resource').every(entry => entry.responseEnd > 0));
  // The preview uses bundled data-URI watch images; wait for those image tasks.
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await frame.locator('[data-change]').selectOption('12:33');
  await frame.locator('[data-palette]').selectOption('paper');
  await frame.locator('[data-guides]').uncheck();
  for (let elapsed = 0; elapsed <= 400; elapsed += 20) {
    await frame.locator('[data-progress]').fill(String(elapsed));
    const png = await frame.locator('[data-watch]').evaluate(canvas => canvas.toDataURL('image/png'));
    writeFileSync(new URL(String(elapsed).padStart(3, '0') + '.png', directory), Buffer.from(png.split(',')[1], 'base64'));
  }
  console.log('Exported 21 native-resolution frames to ' + fileURLToPath(directory));
} finally {
  await browser.close();
}
