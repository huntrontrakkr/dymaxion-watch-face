// "Screen colors" or "As on the watch": one choice, shared by the color picker
// and the watch previews, remembered per viewer. The watch view shows each of
// the 64 colors as Pebble sampled it on a Pebble Time screen
// (shared/pebble-colors.js).
import {SUNLIGHT} from './pebble-colors.js';

const KEY = 'dymaxion-color-view', EVENT = 'dymaxion-color-view';
// Kept in memory, and saved where the page may store it (the phone settings
// page, opened from a data: URL, cannot).
let current = (() => { try { return localStorage.getItem(KEY) === 'watch' ? 'watch' : 'screen'; } catch { return 'screen'; } })();
export const colorView = () => current;
export function setColorView(view) {
  current = view === 'watch' ? 'watch' : 'screen';
  try { localStorage.setItem(KEY, current); } catch { /* a per-viewer convenience only */ }
  dispatchEvent(new CustomEvent(EVENT, {detail: current}));
}
export const onColorViewChange = fn => addEventListener(EVENT, e => fn(e.detail));

// Packed RGB of each watch color to its sunlight RGB; anything else snaps first.
const LUT = new Map(Object.entries(SUNLIGHT).map(([k, v]) => [parseInt(k, 16), parseInt(v, 16)]));
const snap = c => Math.round(c / 85) * 85;
function sunlit(r, g, b) { return LUT.get((r << 16) | (g << 8) | b) ?? LUT.get((snap(r) << 16) | (snap(g) << 8) | snap(b)); }

// Lays a canvas over `canvas` that, while the watch view is on, repaints every
// frame from it with each color as on the watch. The preview underneath keeps
// its real pixels, events and layout; the overlay ignores the pointer.
export function watchViewOverlay(canvas) {
  const overlay = document.createElement('canvas');
  overlay.width = canvas.width;overlay.height = canvas.height;overlay.className = canvas.className;
  overlay.setAttribute('aria-hidden', 'true');overlay.dataset.watchView = '';
  Object.assign(overlay.style, {position: 'absolute', pointerEvents: 'none', imageRendering: 'pixelated', display: 'none', margin: '0'});
  canvas.after(overlay);
  const src = canvas.getContext('2d', {willReadFrequently: true}), dst = overlay.getContext('2d');
  let frame = 0;
  function paint() {
    frame = 0;if (colorView() !== 'watch') { overlay.style.display = 'none';return; }
    // Follow the preview's size and place (it can be scaled or moved).
    Object.assign(overlay.style, {display: 'block', left: canvas.offsetLeft + 'px', top: canvas.offsetTop + 'px', width: canvas.offsetWidth + 'px', height: canvas.offsetHeight + 'px'});
    const img = src.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const c = sunlit(d[i], d[i + 1], d[i + 2]);d[i] = c >> 16;d[i + 1] = (c >> 8) & 255;d[i + 2] = c & 255; }
    dst.putImageData(img, 0, 0);
    frame = requestAnimationFrame(paint);
  }
  // Switching back hides the overlay at once; switching on paints at once
  // and then keeps up a frame at a time.
  const update = () => {
    if (colorView() !== 'watch') { cancelAnimationFrame(frame);frame = 0;overlay.style.display = 'none';return; }
    cancelAnimationFrame(frame);paint();
  };
  onColorViewChange(update);update();
  return overlay;
}
