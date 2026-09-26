// The icosahedron beside a narrow clock: a wireframe seen straight onto one
// face, the facing triangle in the middle with the nine around it inside a
// hexagon outline. The ten visible faces' edges, drawn as pixel lines on the
// left half and mirrored, so the figure is exactly symmetric. The watch draws
// the same rows (generated/clock_art.h, from tools/generate-status-glyphs.mjs).
// R and A: the hexagon's half height and half width. T: the facing
// triangle's apex above the centre, B and W its base below the centre and
// half width. Points, left half: hexagon top, upper and lower corners and
// bottom; the triangle's apex and base corner.
const R = 18, A = 16, T = 11, B = 6, W = 9;
function icosahedron() {
  const rows = Array.from({length: 2 * R + 1}, () => Array(2 * A + 1).fill('.'));
  const put = (x, y) => {rows[y + R][x + A] = '#';rows[y + R][A - x] = '#';};
  const line = (x0, y0, x1, y1) => {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;let e = dx + dy;
    for (;;) {put(x0, y0);if (x0 === x1 && y0 === y1) break;const e2 = 2 * e;if (e2 >= dy) {e += dy;x0 += sx;}if (e2 <= dx) {e += dx;y0 += sy;}}
  };
  const P = {top: [0, -R], upper: [-A, -R >> 1], lower: [-A, R >> 1], bottom: [0, R], apex: [0, -T], corner: [-W, B]};
  for (const [u, v] of [['top', 'upper'], ['upper', 'lower'], ['lower', 'bottom'], ['apex', 'corner'], ['apex', 'top'], ['apex', 'upper'], ['corner', 'upper'], ['corner', 'lower'], ['corner', 'bottom']]) line(...P[u], ...P[v]);
  line(-W, B, 0, B);
  return rows.map(r => r.join(''));
}
export const ICOSAHEDRON_ROWS = Object.freeze(icosahedron());
export const ICOSAHEDRON_WIDTH = 2 * A + 1, ICOSAHEDRON_HEIGHT = 2 * R + 1;
// Where it sits relative to the clock strip: centred in the 73 pixels the
// shifted clock leaves on its side, a pixel below the strip's top.
export const clockArtSpot = side => ({x: side === 'right' ? 127 + ((73 - ICOSAHEDRON_WIDTH) >> 1) : (73 - ICOSAHEDRON_WIDTH) >> 1, y: 1});
