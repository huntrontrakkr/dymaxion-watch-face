import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const browser = await chromium.launch(), reports = [];
try {
  for (const [width, scheme] of [[736, 'light'], [390, 'light'], [320, 'dark']]) {
    const page = await browser.newPage({viewport: {width, height: 1000}, colorScheme: scheme});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + resolve('output/broad-numeral-study/preview.html'));
    const frame = page.frames().find(f => f !== page.mainFrame());
    await frame.waitForSelector('[data-status]');
    await frame.waitForTimeout(150);
    const png = name => frame.locator('[data-strip="' + name + '"]').evaluate(c => c.toDataURL());
    const initial = await png('rounded');
    assert.notEqual(initial, await png('trimmed'), 'The default proof must show actual outline cuts.');
    assert.equal(await frame.locator('[data-joined]').count(), 0);
    assert.equal(await frame.getByLabel('Watch lettering', {exact: true}).inputValue(), 'rounded');
    await frame.getByLabel('Readout', {exact: true}).selectOption('08:08');
    assert.notEqual(initial, await png('rounded'));
    const beforeShift = await png('construction');
    await frame.getByLabel('Grid row spacing', {exact: true}).selectOption('6');
    await frame.getByLabel('Horizontal alignment', {exact: true}).selectOption('0.5');
    assert.notEqual(beforeShift, await png('construction'));
    await frame.getByLabel('Maximum corner trim', {exact: true}).fill('0');
    assert.equal(await png('rounded'), await png('trimmed'), 'Zero trim must leave the original mask intact.');
    await frame.getByLabel('Maximum corner trim', {exact: true}).fill('3');
    await frame.getByLabel('Watch lettering', {exact: true}).selectOption('trimmed');
    const paper = await frame.locator('[data-watch]').evaluate(c => c.toDataURL());
    await frame.getByLabel('Watch colors', {exact: true}).selectOption('dark');
    assert.notEqual(paper, await frame.locator('[data-watch]').evaluate(c => c.toDataURL()));
    const bounds = await frame.evaluate(() => ({
      viewport: innerWidth, scroll: document.documentElement.scrollWidth,
      overflows: [...document.querySelectorAll('select,button,canvas,input')].filter(el => {
        const r = el.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1;
      }).map(el => el.outerHTML.slice(0, 100)),
      height: document.body.scrollHeight
    }));
    assert.equal(bounds.scroll, bounds.viewport); assert.deepEqual(bounds.overflows, []); assert.deepEqual(errors, []);
    await frame.getByLabel('Readout', {exact: true}).selectOption('12:33');
    await frame.getByLabel('Grid row spacing', {exact: true}).selectOption('8');
    await frame.getByLabel('Horizontal alignment', {exact: true}).selectOption('0');
    await frame.getByLabel('Maximum corner trim', {exact: true}).fill('2');
    await frame.getByLabel('Watch lettering', {exact: true}).selectOption('rounded');
    await frame.getByLabel('Watch colors', {exact: true}).selectOption('paper');
    await page.locator('iframe').evaluate((el, h) => el.style.height = h + 'px', bounds.height + 30);
    await page.screenshot({path: `output/broad-numeral-study/rounded-${width}-${scheme}.png`, fullPage: true});
    reports.push({width, scheme, ...bounds, errors}); await page.close();
  }
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4174/');
  const geometry = await page.evaluate(async moduleURL => {
    const {broadTimeMask, broadTimeGeometry, broadTriangleGrid, trimBroadGeometry} = await import(moduleURL);
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    let maxError = 0, maxLineError = 0, range = [200, 0], readouts = 0, trimmedPixels = 0;
    const cellEdgeDistance = (p, a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    };
    for (const pitch of [6, 8, 10]) for (const phase of [0, .5, 1]) {
      const grid = broadTriangleGrid(pitch, phase);
      assert([...grid.membership].every(x => x >= 0), 'Grid must cover the entire strip.');
      for (const cell of grid.cells) for (let i = 0; i < 3; i++) {
        const a = cell.vertices[i], b = cell.vertices[(i + 1) % 3];
        maxError = Math.max(maxError, Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - grid.edge));
      }
      for (const time of ['12:33', '08:08', '23:32', '06:57']) {
        const proof = trimBroadGeometry(broadTimeGeometry(time), {pitch, phase, depth: 3});
        for (const cut of proof.cuts) {
          assert(cut.points.length === 2, 'Each highlighted cut needs a visible line segment.');
          const middle = cut.points[0].map((v, i) => (v + cut.points[1][i]) / 2);
          const distance = Math.min(...grid.cells.flatMap(cell => cell.vertices.map((v, i) => cellEdgeDistance(middle, v, cell.vertices[(i + 1) % 3]))));
          maxLineError = Math.max(maxLineError, distance);
        }
      }
    }
    // Check clock bounds, numeral spacing and colon integrity over the full day.
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) {
      const time = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      const source = broadTimeGeometry(time), proof = trimBroadGeometry(source);
      readouts++;
      for (let i = 0; i < source.mask.length; i++) {
        if (source.mask[i]) {
          const x = i % 200, y = Math.floor(i / 200);
          range = [Math.min(range[0], x), Math.max(range[1], x)];
          assert(x >= 2 && x <= 197 && y >= 4 && y <= 35, 'Clock ink outside the intended band.');
        }
        assert(!proof.mask[i] || source.mask[i], 'Trimming may only subtract ink.');
        if ([47, 48, 151, 152].includes(i % 200)) assert(source.mask[i] === 0, 'Numerals must remain separated.');
        if (i % 200 >= 94 && i % 200 <= 105) assert(source.mask[i] === proof.mask[i], 'Trimming changed the colon or its gutters.');
        trimmedPixels += proof.removed[i];
      }
    }
    // Direct pixel measurements of the specific faults raised in the review.
    const cap = broadTimeMask('67:00');
    for (let y = 4; y < 12; y++) for (const x of [22, 64]) assert(cap[y * 200 + x] === 1, '6/7 must retain equal eight-pixel caps.');
    for (const x of [22, 64]) assert(cap[12 * 200 + x] === 0, '6/7 cap weights differ.');
    const colon = broadTimeMask('00:00'), colonPoints = [];
    for (let y = 0; y < 40; y++) for (let x = 94; x < 106; x++) if (colon[y * 200 + x]) colonPoints.push([x, y]);
    assert(colonPoints.length === 104, 'Colon should contain two substantial clipped blocks.');
    for (const [top, bottom] of [[9, 16], [23, 30]]) {
      const points = colonPoints.filter(p => p[1] >= top && p[1] <= bottom);
      assert(Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])) + 1 === 8, 'Colon width must match the stroke.');
      assert(Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1])) + 1 === 8, 'Colon height must match the stroke.');
    }
    assert(maxError < 1e-10, 'Triangles must be equilateral.');
    assert(maxLineError < 1e-8, 'Every cut must lie on an actual construction-grid edge.');
    return {readouts, range, equilateralError: maxError, cutGridError: maxLineError, trimmedPixels, minimumNumeralGap: 2, capHeight: 8, colonBlock: [8, 8]};
  }, '/@fs' + resolve('shared/broad-numerals.js'));
  reports.push(geometry); await page.close();
} finally { await browser.close(); }
writeFileSync('output/broad-numeral-study/check-results.json', JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
