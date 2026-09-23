import {GEODESIC_METRICS, GEODESIC_DESIGN, geodesicSkeleton, drawGeodesicTime, geodesicTimeMask} from '../shared/geodesic-numerals.js';
const $ = id => document.getElementById(id);
const {width, height, capHeight, capTop, digitWidth} = GEODESIC_METRICS;
function strip() {
  const canvas = $('strip'), scale = Number($('study-scale').value), g = canvas.getContext('2d');
  canvas.style.width = width * scale + 'px'; canvas.style.height = height * scale + 'px';
  g.fillStyle = '#000'; g.fillRect(0, 0, width, height);
  drawGeodesicTime(g, $('study-time').value, 0, 0, '#fff');
}
// Each figure's master comes from the full-strip mask so the study shows
// exactly what the watch draws; the skeleton is redrawn on top in design units.
function construction() {
  const S = 6, pad = 10, cell = digitWidth * S + pad * 2, canvas = $('construction'), g = canvas.getContext('2d');
  canvas.width = cell * 5; canvas.height = (capHeight * S + pad * 2) * 2;
  g.fillStyle = '#071a20'; g.fillRect(0, 0, canvas.width, canvas.height);
  for (let d = 0; d < 10; d++) {
    const ox = (d % 5) * cell + pad, oy = Math.floor(d / 5) * (capHeight * S + pad * 2) + pad;
    const mask = geodesicTimeMask(`${d}${d}:00`), start = GEODESIC_METRICS.starts[0];
    g.fillStyle = '#3c5a5f';
    for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++)
      if (mask[(y + capTop) * width + start + x]) g.fillRect(ox + x * S, oy + y * S, S - 1, S - 1);
    // Find the ink's left edge so the skeleton lines up with the centred master.
    let left = digitWidth;
    for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++) if (mask[(y + capTop) * width + start + x]) left = Math.min(left, x);
    const unit = capHeight / 100 * S, design = GEODESIC_DESIGN;
    const inkLeft = d === 1 ? design.w - design.s / 2 - design.flag / 2 : 0;
    g.save(); g.beginPath(); g.rect(ox, oy, digitWidth * S, capHeight * S); g.clip();
    g.translate(ox + left * S, oy); g.scale(unit, unit); g.translate(-inkLeft, 0);
    if (d === 9) { g.translate(design.w, 100); g.rotate(Math.PI); }
    g.strokeStyle = '#ff8a3d'; g.lineWidth = 1.1 / unit * 2; g.stroke(geodesicSkeleton(d === 9 ? '6' : String(d)));
    g.restore();
    g.save(); g.beginPath(); g.rect(ox, oy, digitWidth * S, capHeight * S); g.clip();
    g.strokeStyle = 'rgba(160,210,200,.18)'; g.lineWidth = 1;
    for (let k = -12; k < 14; k++) {
      const x0 = ox + k * 30; g.beginPath(); g.moveTo(x0, oy + capHeight * S); g.lineTo(x0 + capHeight * S / Math.tan(Math.PI / 3), oy); g.stroke();
    }
    g.restore();
  }
  canvas.style.width = canvas.width / 2 + 'px'; canvas.style.maxWidth = '100%'; canvas.style.height = 'auto';
}
$('study-time').onchange = strip; $('study-scale').onchange = strip;
strip(); construction();
