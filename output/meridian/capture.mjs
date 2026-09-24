// Captures the Meridian redesign from the running workshop (npm run dev) at
// native 1x. previous-atlas-*.png record the old default and are not recaptured.
// node output/meridian/capture.mjs  [PREVIEW_URL=http://127.0.0.1:5173]
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {defaults, presetFor} from '../../shared/settings.js';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const d = defaults();
const shots = {
  'meridian-airocean': [d],
  'meridian-paper': [{...d, theme: 2}],
  'meridian-spaceship-earth': [{...d, theme: 3}],
  'meridian-blueprint': [{...d, theme: 1}],
  'meridian-12h': [{...d, format: 2}],
  'meridian-late': [d, '2026-09-24T03:59:30Z'],
  'meridian-weather': [{...d, footer: {...d.footer, enabled: true, home: 'weather'}}],
  'horizon-chamfer': [{...d, ...presetFor('horizon')}]
};
const browser = await chromium.launch();
try {
  for (const [name, [settings, when = '2026-09-23T16:38:20Z']] of Object.entries(shots)) {
    const page = await browser.newPage({viewport: {width: 1400, height: 1000}, timezoneId: 'America/New_York'}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({time: new Date(when)});
    await page.addInitScript(s => localStorage.setItem('dymaxion-workshop-v1', s), JSON.stringify(settings));
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('#preview-time').textContent.includes('LIVE'));
    const png = await page.evaluate(() => document.getElementById('screen').toDataURL('image/png'));
    writeFileSync(new URL(`${name}.png`, import.meta.url), Buffer.from(png.split(',')[1], 'base64'));
    if (errors.length) throw new Error(`${name}: ${errors.join('; ')}`);
    await page.close();
  }
} finally { await browser.close(); }
console.log(`Captured ${Object.keys(shots).length} native-size workshop renders.`);
