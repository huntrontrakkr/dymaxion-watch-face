// A picker of the watch's 64 colors for every <input type="color">, in place
// of the system picker (which offers millions of colors the watch cannot
// show). The input stays in the page with its label, value and handlers; a
// click opens the grid instead, and a choice sets the value and fires the
// usual input and change events. "As on the watch" shows each color as
// Pebble sampled it on a Pebble Time screen (shared/pebble-colors.js). The
// colors can be laid out four ways (shared/color-science.js): Pebble's
// honeycomb, the RGB cube in four slices, CIELAB lightness by hue, and the
// CIE 1931 chromaticity diagram.
import {snapToWatch, asOnWatch} from './pebble-colors.js';
import {colorLayout, COLOR_LAYOUTS, COLOR_LAYOUT_NAMES} from './color-science.js';
import {colorView, setColorView, onColorViewChange} from './watch-view.js';

const STYLE = `
.watch-color-popover{position:absolute;z-index:1000;background:#fbfaf5;color:#1f2a24;border:1px solid #b9c3b6;border-radius:12px;box-shadow:0 8px 28px #1f38222e;padding:10px;width:max-content;max-width:calc(100vw - 16px);box-sizing:border-box;font:13px/1.3 system-ui,sans-serif}
.watch-color-popover[hidden]{display:none}
.watch-color-popover .wcp-view{display:flex;gap:4px;margin:0 0 8px}
.watch-color-popover .wcp-view button{flex:1;font:inherit;padding:5px 8px;min-height:0;border:1px solid #b9c3b6;border-radius:8px;background:transparent;color:inherit;cursor:pointer}
.watch-color-popover .wcp-view button[aria-pressed="true"]{background:#1f2a24;color:#fbfaf5;border-color:#1f2a24}
.watch-color-popover .wcp-layout{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:0 0 8px}
.watch-color-popover .wcp-layout button{font:inherit;font-size:12px;padding:5px 4px;min-height:0;border:1px solid #b9c3b6;border-radius:8px;background:transparent;color:inherit;cursor:pointer}
.watch-color-popover .wcp-layout button[aria-pressed="true"]{background:#1f2a24;color:#fbfaf5;border-color:#1f2a24}
.watch-color-popover .wcp-grid{position:relative;margin:4px auto 2px}
.watch-color-popover .wcp-grid svg{position:absolute;left:0;top:0}
.watch-color-popover .wcp-grid .wcp-label{position:absolute;font-size:11px;color:#5b665f;white-space:nowrap}
.watch-color-popover .wcp-grid button{position:absolute;min-height:0;min-width:0;padding:0;margin:0;border:0;border-radius:0;cursor:pointer;box-shadow:0 0 0 .6px #0006}
.watch-color-popover .wcp-grid button[data-shape="hex"]{clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);box-shadow:none}
.watch-color-popover .wcp-grid button[data-shape="square"]{border-radius:3px}
.watch-color-popover .wcp-grid button[data-shape="dot"]{border-radius:50%;box-shadow:0 0 0 1px #0008}
.watch-color-popover .wcp-grid button[aria-checked="true"]::after,.watch-color-popover .wcp-grid button:focus-visible::after{content:"";position:absolute;inset:18%;border-radius:50%;border:3px solid var(--wcp-mark,#fff);box-shadow:0 0 0 1px var(--wcp-edge,#000)}
.watch-color-popover .wcp-grid button[data-shape="dot"][aria-checked="true"]::after,.watch-color-popover .wcp-grid button[data-shape="dot"]:focus-visible::after{inset:-4px;border-width:2px}
.watch-color-popover .wcp-grid button:focus-visible{outline:none}
.watch-color-popover .wcp-grid button:focus-visible:not([aria-checked="true"])::after{border-style:dotted}
.watch-color-popover .wcp-note{margin:8px 0 0;font-size:11px;color:#5b665f;max-width:300px}
input[type="color"][data-watch-picker]{cursor:pointer}
`;

export function installWatchColorPicker(doc = document) {
  if (doc.querySelector('.watch-color-popover')) return;
  const style = doc.createElement('style');style.textContent = STYLE;doc.head.append(style);
  const pop = doc.createElement('div');pop.className = 'watch-color-popover';pop.hidden = true;pop.setAttribute('role', 'dialog');
  pop.innerHTML = '<div class="wcp-layout" role="group" aria-label="Arrange colors">' + COLOR_LAYOUTS.map(m => `<button type="button" data-layout="${m}">${COLOR_LAYOUT_NAMES[m]}</button>`).join('') + '</div><div class="wcp-view" role="group" aria-label="Show colors"><button type="button" data-view="screen">Screen colors</button><button type="button" data-view="watch">As on the watch</button></div><div class="wcp-grid" role="radiogroup" aria-label="Watch colors"></div><p class="wcp-note"></p>';
  doc.body.append(pop);
  const grid = pop.querySelector('.wcp-grid'), note = pop.querySelector('.wcp-note');
  let target = null, view = colorView(), layout = (() => { try { const v = localStorage.getItem('dymaxion-color-layout');return COLOR_LAYOUTS.includes(v) ? v : 'honeycomb'; } catch { return 'honeycomb'; } })();
  // The same choice as the watch previews: changing either changes both.
  onColorViewChange(v => { view = v;if (!pop.hidden) paint(); });

  // Places every color for the chosen layout (in the watch view the CIELAB and
  // chromaticity layouts follow the colors as the screen shows them).
  function build() {
    const l = colorLayout(layout, view);
    grid.replaceChildren();grid.style.width = l.width + 'px';grid.style.height = l.height + 'px';
    if (l.svg) grid.insertAdjacentHTML('afterbegin', l.svg);
    for (const t of l.labels) { const e = doc.createElement('span');e.className = 'wcp-label';e.textContent = t.text;e.style.left = t.x + 'px';e.style.top = t.y + 'px';grid.append(e); }
    for (const c of l.cells) {
      const cell = doc.createElement('button');cell.type = 'button';cell.dataset.hex = c.hex;cell.dataset.shape = c.shape;
      cell.style.cssText = `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px`;
      cell.setAttribute('role', 'radio');cell.setAttribute('aria-label', c.hex);cell.title = c.hex;grid.append(cell);
    }
  }
  function paint() {
    const current = target ? snapToWatch(target.value) : null;
    build();
    pop.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    pop.querySelectorAll('[data-layout]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layout === layout)));
    grid.querySelectorAll('button').forEach(b => {
      b.style.background = view === 'watch' ? asOnWatch(b.dataset.hex) : b.dataset.hex;
      // The ring marking the choice contrasts with the color under it.
      const [r, g, bl] = [1, 3, 5].map(i => parseInt(b.dataset.hex.slice(i, i + 2), 16)), light = r * .3 + g * .59 + bl * .11 > 140;
      b.style.setProperty('--wcp-mark', light ? '#1f2a24' : '#fff');b.style.setProperty('--wcp-edge', light ? '#fff' : '#1f2a24');
      b.setAttribute('aria-checked', String(b.dataset.hex === current));
      b.tabIndex = b.dataset.hex === current ? 0 : -1;
    });
    note.textContent = (layout === 'xy' ? 'CIE 1931 chromaticity: the horseshoe is every pure spectral color, the solid triangle sRGB, the dashed one the watch screen’s own primaries. ' : layout === 'lab' ? 'CIELAB: greys first, then hue from red round to purple, lightest at the top of each column. ' : layout === 'rgb' ? 'Red across, green down, one square for each level of blue. ' : '')
      + (view === 'watch' ? 'Colors approximately as the watch shows them, from Pebble’s own sampling of the Pebble Time screen.' : 'The watch shows 64 colors. Switch to “As on the watch” for how they look on its screen.');
  }
  function close(refocus = true) { if (pop.hidden) return;pop.hidden = true;const t = target;target = null;if (refocus && t) t.focus(); }
  function open(input) {
    target = input;pop.setAttribute('aria-label', (input.getAttribute('aria-label') || 'Color') + ': watch colors');
    pop.hidden = false;paint();reposition();
    (grid.querySelector('[aria-checked="true"]') || grid.querySelector('button')).focus();
  }
  function reposition() {
    if (!target) return;
    const r = target.getBoundingClientRect(), width = doc.documentElement.clientWidth, w = pop.offsetWidth;
    const left = Math.max(8, Math.min(r.left, width - w - 8));
    pop.style.left = (left + scrollX) + 'px';pop.style.top = (r.bottom + scrollY + 6) + 'px';
  }
  function choose(hex) {
    const input = target;close();
    if (!input) return;
    input.value = hex.toLowerCase();
    input.dispatchEvent(new Event('input', {bubbles: true}));input.dispatchEvent(new Event('change', {bubbles: true}));
  }
  pop.addEventListener('click', e => {
    const b = e.target.closest('button');if (!b) return;
    if (b.dataset.view) { setColorView(b.dataset.view);return; }
    if (b.dataset.layout) { layout = b.dataset.layout;try { localStorage.setItem('dymaxion-color-layout', layout); } catch { /* per-viewer convenience */ }paint();(grid.querySelector('[aria-checked="true"]') || grid.querySelector('button')).focus();reposition();return; }
    if (b.dataset.hex) choose(b.dataset.hex);
  });
  // Arrow keys move to the nearest color in that direction, in any layout (a
  // radio group). Escape closes.
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault();close();return; }
    const cells = [...grid.querySelectorAll('button')], here = doc.activeElement;
    const dir = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1]}[e.key];
    if (!dir || !cells.includes(here)) return;
    e.preventDefault();
    const at = c => [c.offsetLeft + c.offsetWidth / 2, c.offsetTop + c.offsetHeight / 2], [hx, hy] = at(here);
    let best = null, score = Infinity;
    for (const c of cells) {
      if (c === here) continue;
      const [x, y] = at(c), along = (x - hx) * dir[0] + (y - hy) * dir[1], across = Math.abs((x - hx) * dir[1] - (y - hy) * dir[0]);
      if (along <= 0.5) continue;
      const d = along + 2 * across;if (d < score) { score = d;best = c; }
    }
    best?.focus();
  });
  doc.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== target) close(false); });
  addEventListener('resize', () => close(false));
  // Every color input, now and later, opens the grid instead of the system picker.
  const claim = root => root.querySelectorAll?.('input[type="color"]:not([data-watch-picker])').forEach(input => {
    input.dataset.watchPicker = '';
    input.addEventListener('click', e => { e.preventDefault();if (target === input && !pop.hidden) close();else open(input); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();open(input); } });
  });
  claim(doc);
  new MutationObserver(records => { for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) { if (n.matches?.('input[type="color"]')) claim(n.parentNode);else claim(n); } })
    .observe(doc.body, {childList: true, subtree: true});
}
