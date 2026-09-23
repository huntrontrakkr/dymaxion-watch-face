import {drawBroadTime, drawBroadDigit} from '../../shared/broad-numerals.js';
const root = document.getElementById('dymaxion-refined-type-study');
const find = name => root.querySelector('[data-' + name + ']');
const state = {time: '12:33', watchStyle: 'rounded', palette: 'paper', pitch: 8, phase: 0, depth: 2};
const choices = {
  time: ['12:33', '12:34', '23:32', '11:11', '06:57', '07:36', '08:08', '23:59', '00:00', '20:26'],
  watchStyle: ['rounded', 'trimmed'], palette: ['paper', 'dark'], pitch: [6, 8, 10], phase: [0, .5, 1]
};
const controls = {
  time: find('time'), watchStyle: find('watch-style'), palette: find('palette'),
  pitch: find('pitch'), phase: find('phase'), depth: find('depth')
};
const bases = {};
function paint() {
  find('depth-value').textContent = state.depth + ' px';
  for (const [key, control] of Object.entries(controls)) control.value = state[key];
  let proof;
  for (const canvas of root.querySelectorAll('[data-strip]')) {
    const style = canvas.dataset.strip, ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / 200, 0, 0, canvas.height / 40, 0, 0);
    proof = drawBroadTime(ctx, state.time, 0, 0, {
      ...state, trimmed: style === 'trimmed', showGrid: style === 'construction'
    });
    canvas.setAttribute('aria-label', state.time + ', ' + ({
      rounded: 'separate numerals with softly rounded terminals and a bold colon',
      construction: 'equilateral construction grid with selected outline cuts',
      trimmed: 'clean pixel outline after trimming'
    }[style]));
  }
  const canvas = find('watch'), ctx = canvas.getContext('2d'), paper = state.palette === 'paper';
  if (bases[state.palette]) ctx.drawImage(bases[state.palette], 0, 0);
  else { ctx.fillStyle = paper ? '#FFFFFF' : '#000000'; ctx.fillRect(0, 0, 200, 228); }
  drawBroadTime(ctx, state.time, 0, 18, {
    ...state, ink: paper ? '#000000' : '#FFFFFF', background: paper ? '#FFFFFF' : '#000000',
    trimmed: state.watchStyle === 'trimmed'
  });
  canvas.setAttribute('aria-label', state.time + ' with ' + state.watchStyle + ' lettering on the 200 by 228 pixel watch');
  for (const canvas of root.querySelectorAll('[data-pair]')) {
    drawBroadTime(canvas.getContext('2d'), canvas.dataset.pair + ':00');
  }
  for (const canvas of root.querySelectorAll('[data-digits]')) {
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 250, 40);
    [...canvas.dataset.digits].forEach((digit, index) => drawBroadDigit(ctx, digit, 2 + index * 50, 4));
  }
  find('status').textContent = '8 px strokes + colon · 2 px minimum spacing · ' + proof.cuts.length + ' corner cuts';
}
function restore(saved) {
  if (saved?.modelContent?.study !== 'dymaxion-broad-v3') return;
  const values = saved.modelContent.settings;
  if (!values || typeof values !== 'object') return;
  for (const key of Object.keys(state)) {
    if (choices[key]?.includes(values[key])) state[key] = values[key];
    else if (key === 'depth' && Number.isFinite(values.depth) && values.depth >= 0 && values.depth <= 3) state.depth = values.depth;
  }
  paint();
}
function save() {
  if (window.openai?.setWidgetState) Promise.resolve(window.openai.setWidgetState({
    modelContent: {study: 'dymaxion-broad-v3', settings: {...state}}, privateContent: null
  })).catch(() => {});
}
for (const [key, control] of Object.entries(controls)) control.addEventListener(key === 'depth' ? 'input' : 'change', () => {
  state[key] = ['pitch', 'phase', 'depth'].includes(key) ? Number(control.value) : control.value;
  paint(); save();
});
paint(); restore(window.openai?.widgetState);
window.addEventListener('openai:set_globals', event => restore(event.detail?.globals?.widgetState));
for (const [key, src] of Object.entries(JSON.parse(find('watch-bases').textContent))) {
  const image = new Image(); image.onload = () => { bases[key] = image; paint(); }; image.src = src;
}
