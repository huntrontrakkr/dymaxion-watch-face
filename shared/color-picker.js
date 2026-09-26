// A picker of the watch's 64 colors for every <input type="color">, in place
// of the system picker (which offers millions of colors the watch cannot
// show). The input stays in the page with its label, value and handlers; a
// click opens the grid instead, and a choice sets the value and fires the
// usual input and change events. "As on the watch" shows each color as
// Pebble sampled it on a Pebble Time screen (shared/pebble-colors.js).
import {WATCH_COLOR_LAYOUT, snapToWatch, asOnWatch} from './pebble-colors.js';
import {colorView, setColorView, onColorViewChange} from './watch-view.js';

const STYLE = `
.watch-color-popover{position:absolute;z-index:1000;background:#fbfaf5;color:#1f2a24;border:1px solid #b9c3b6;border-radius:12px;box-shadow:0 8px 28px #1f38222e;padding:10px;width:max-content;max-width:calc(100vw - 16px);box-sizing:border-box;font:13px/1.3 system-ui,sans-serif}
.watch-color-popover[hidden]{display:none}
.watch-color-popover .wcp-view{display:flex;gap:4px;margin:0 0 8px}
.watch-color-popover .wcp-view button{flex:1;font:inherit;padding:5px 8px;border:1px solid #b9c3b6;border-radius:8px;background:transparent;color:inherit;cursor:pointer}
.watch-color-popover .wcp-view button[aria-pressed="true"]{background:#1f2a24;color:#fbfaf5;border-color:#1f2a24}
.watch-color-popover .wcp-grid{display:flex;flex-direction:column;align-items:center;padding:2px 0}
.watch-color-popover .wcp-row{display:flex;gap:2px;filter:drop-shadow(0 0 .6px #0007)}
.watch-color-popover .wcp-row+.wcp-row{margin-top:-7px}
.watch-color-popover .wcp-grid button{position:relative;width:30px;height:34px;padding:0;border:0;cursor:pointer;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
.watch-color-popover .wcp-grid button[aria-checked="true"]::after,.watch-color-popover .wcp-grid button:focus-visible::after{content:"";position:absolute;inset:10px 8px;border-radius:50%;border:3px solid var(--wcp-mark,#fff);box-shadow:0 0 0 1px var(--wcp-edge,#000)}
.watch-color-popover .wcp-grid button:focus-visible{outline:none}
.watch-color-popover .wcp-grid button:focus-visible:not([aria-checked="true"])::after{border-style:dotted}
.watch-color-popover .wcp-note{margin:8px 0 0;font-size:11px;color:#5b665f;max-width:290px}
input[type="color"][data-watch-picker]{cursor:pointer}
`;

export function installWatchColorPicker(doc = document) {
  if (doc.querySelector('.watch-color-popover')) return;
  const style = doc.createElement('style');style.textContent = STYLE;doc.head.append(style);
  const pop = doc.createElement('div');pop.className = 'watch-color-popover';pop.hidden = true;pop.setAttribute('role', 'dialog');
  pop.innerHTML = '<div class="wcp-view" role="group" aria-label="Show colors"><button type="button" data-view="screen">Screen colors</button><button type="button" data-view="watch">As on the watch</button></div><div class="wcp-grid" role="radiogroup" aria-label="Watch colors"></div><p class="wcp-note"></p>';
  doc.body.append(pop);
  const grid = pop.querySelector('.wcp-grid'), note = pop.querySelector('.wcp-note');
  let target = null, view = colorView();
  // The same choice as the watch previews: changing either changes both.
  onColorViewChange(v => { view = v;if (!pop.hidden) paint(); });

  function paint() {
    const current = target ? snapToWatch(target.value) : null;
    pop.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    grid.querySelectorAll('button').forEach(b => {
      b.style.background = view === 'watch' ? asOnWatch(b.dataset.hex) : b.dataset.hex;
      // The ring marking the choice contrasts with the color under it.
      const [r, g, bl] = [1, 3, 5].map(i => parseInt(b.dataset.hex.slice(i, i + 2), 16)), light = r * .3 + g * .59 + bl * .11 > 140;
      b.style.setProperty('--wcp-mark', light ? '#1f2a24' : '#fff');b.style.setProperty('--wcp-edge', light ? '#fff' : '#1f2a24');
      b.setAttribute('aria-checked', String(b.dataset.hex === current));
      b.tabIndex = b.dataset.hex === current ? 0 : -1;
    });
    note.textContent = view === 'watch' ? 'Approximately as the watch shows them, from Pebble’s own sampling of the Pebble Time screen.' : 'The watch shows 64 colors. Switch to “As on the watch” for how they look on its screen.';
  }
  WATCH_COLOR_LAYOUT.forEach((colors, r) => {
    const row = doc.createElement('div');row.className = 'wcp-row';
    colors.forEach((hex, k) => {
      const cell = doc.createElement('button'), h = '#' + hex.toUpperCase();
      cell.type = 'button';cell.dataset.hex = h;cell.dataset.row = r;cell.dataset.x = String(2 * k - colors.length);
      cell.setAttribute('role', 'radio');cell.setAttribute('aria-label', h);cell.title = h;row.append(cell);
    });
    grid.append(row);
  });
  function close(refocus = true) { if (pop.hidden) return;pop.hidden = true;const t = target;target = null;if (refocus && t) t.focus(); }
  function open(input) {
    target = input;pop.setAttribute('aria-label', (input.getAttribute('aria-label') || 'Color') + ': watch colors');
    pop.hidden = false;paint();
    const r = input.getBoundingClientRect(), view = doc.documentElement.clientWidth, w = pop.offsetWidth;
    const left = Math.max(8, Math.min(r.left, view - w - 8));
    pop.style.left = (left + scrollX) + 'px';pop.style.top = (r.bottom + scrollY + 6) + 'px';
    (grid.querySelector('[aria-checked="true"]') || grid.querySelector('button')).focus();
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
    if (b.dataset.hex) choose(b.dataset.hex);
  });
  // Arrow keys move through the honeycomb (a radio group): along a row, or to
  // the nearest cell in the row above or below. Escape closes.
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault();close();return; }
    const cells = [...grid.querySelectorAll('button')], at = cells.indexOf(doc.activeElement);
    if (at < 0 || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const here = cells[at];let next;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') next = cells[at + (e.key === 'ArrowRight' ? 1 : -1)];
    else {
      const row = +here.dataset.row + (e.key === 'ArrowDown' ? 1 : -1), x = +here.dataset.x;
      next = cells.filter(c => +c.dataset.row === row).sort((a, b) => Math.abs(a.dataset.x - x) - Math.abs(b.dataset.x - x))[0];
    }
    next?.focus();
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
