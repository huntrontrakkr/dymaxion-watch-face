import {FLIP_DURATION, planMinuteFlip, sampleMinuteFlip, drawFlipPixels} from '../../shared/minute-flip.js';
const root = document.getElementById('dymaxion-minute-flip-study');
const find = name => root.querySelector('[data-' + name + ']');
const state = {from: '12:33', palette: 'paper', guides: false};
const choices = ['12:33', '12:59', '23:59', '09:09', '11:11', '08:08'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)'), bases = {};
let plan, elapsed = 0, request = null, started = 0;
const nextMinute = from => {
  const [h, m] = from.split(':').map(Number), n = (h * 60 + m + 1) % 1440;
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
};
function stop() { if (request !== null) cancelAnimationFrame(request); request = null; }
function paint() {
  const pixels = sampleMinuteFlip(plan, elapsed), paper = state.palette === 'paper';
  const colors = {ink: paper ? '#000000' : '#FFFFFF', background: paper ? '#FFFFFF' : '#000000'};
  const canvas = find('animation'), ctx = canvas.getContext('2d');
  drawFlipPixels(ctx, pixels, 0, 0, colors);
  if (state.guides) {
    ctx.strokeStyle = paper ? '#0055AA' : '#55AAFF'; ctx.lineWidth = .5; ctx.beginPath();
    for (const cell of plan.grid.cells) if (plan.active[cell.id]) {
      cell.vertices.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
    }
    ctx.stroke();
  }
  canvas.setAttribute('aria-label', plan.from + ' to ' + plan.to + ', animation at ' + Math.round(elapsed) + ' milliseconds');
  const watch = find('watch'), g = watch.getContext('2d');
  if (bases[state.palette]) g.drawImage(bases[state.palette], 0, 0);
  else { g.fillStyle = colors.background; g.fillRect(0, 0, 200, 228); }
  drawFlipPixels(g, pixels, 0, 18, colors);
  drawFlipPixels(find('before').getContext('2d'), plan.before, 0, 0, colors);
  drawFlipPixels(find('after').getContext('2d'), plan.after, 0, 0, colors);
  find('before-label').textContent = 'Before · ' + plan.from;
  find('after-label').textContent = 'After · ' + plan.to;
  find('before').setAttribute('aria-label', 'Before: ' + plan.from);
  find('after').setAttribute('aria-label', 'After: ' + plan.to);
  find('progress').value = Math.round(elapsed);
  find('position').textContent = Math.round(elapsed) + ' ms';
  root.dataset.elapsed = Math.round(elapsed);
  root.dataset.running = String(request !== null);
}
function prepare() {
  stop(); elapsed = 0; plan = planMinuteFlip(state.from, nextMinute(state.from));
  find('change').value = state.from; find('palette').value = state.palette; find('guides').checked = state.guides;
  find('status').textContent = plan.changedCells + ' changing triangles · ' + (reduced.matches ? 'Reduced motion: instant change' : '400 ms total');
  paint();
}
function animate(timestamp) {
  request = null; elapsed = Math.min(FLIP_DURATION, Math.max(0, timestamp - started));
  if (elapsed < FLIP_DURATION) request = requestAnimationFrame(animate);
  paint();
}
find('replay').addEventListener('click', () => {
  stop();
  if (reduced.matches) { elapsed = FLIP_DURATION; paint(); return; }
  elapsed = 0; started = performance.now(); request = requestAnimationFrame(animate); paint();
});
find('progress').addEventListener('input', () => { stop(); elapsed = Number(find('progress').value); paint(); });
function save() {
  if (window.openai?.setWidgetState) Promise.resolve(window.openai.setWidgetState({
    modelContent: {study: 'dymaxion-minute-flip-v1', settings: {...state}}, privateContent: null
  })).catch(() => {});
}
find('change').addEventListener('change', () => { state.from = find('change').value; prepare(); save(); });
find('palette').addEventListener('change', () => { state.palette = find('palette').value; paint(); save(); });
find('guides').addEventListener('change', () => { state.guides = find('guides').checked; paint(); save(); });
function restore(saved) {
  if (saved?.modelContent?.study !== 'dymaxion-minute-flip-v1') return;
  const settings = saved.modelContent.settings || {};
  if (choices.includes(settings.from)) state.from = settings.from;
  if (['paper', 'dark'].includes(settings.palette)) state.palette = settings.palette;
  if (typeof settings.guides === 'boolean') state.guides = settings.guides;
  prepare();
}
prepare(); restore(window.openai?.widgetState);
window.addEventListener('openai:set_globals', event => restore(event.detail?.globals?.widgetState));
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); elapsed = FLIP_DURATION; paint(); } });
reduced.addEventListener('change', () => { prepare(); elapsed = FLIP_DURATION; paint(); });
for (const [key, src] of Object.entries(JSON.parse(find('watch-bases').textContent))) {
  const image = new Image(); image.onload = () => { bases[key] = image; paint(); }; image.src = src;
}
