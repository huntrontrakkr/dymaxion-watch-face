// Where each marker is drawn. Glyphs keep their true positions unless their
// clearings would overlap; such markers form a group, drawn side by side
// (west to east, each pair a pixel apart) around the group's average
// position. At this scale a few pixels is below what the map resolves, so
// the shift is honest. Spread groups that touch another marker merge and are
// laid out again. The watch mirrors this in watchface/src/c/map_markers.c.
// Points are {x, y, half}: half the glyph's width (2 for places, 3 for you).
const clearing = p => p.half + 1;
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const roundMean = (sum, n) => Math.floor((2 * sum + n) / (2 * n));
export function layoutMarkers(points, width = 200, height = 104) {
  const n = points.length, group = points.map((_, i) => i), pos = points.map(p => ({x: p.x, y: p.y}));
  const find = i => group[i] === i ? i : (group[i] = find(group[i]));
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) group[Math.max(a, b)] = Math.min(a, b); return a !== b; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (cheb(points[i], points[j]) <= clearing(points[i]) + clearing(points[j])) join(i, j);
  for (let pass = 0; pass < n; pass++) {
    for (let g = 0; g < n; g++) {
      const members = points.map((_, i) => i).filter(i => find(i) === g);
      if (members.length < 2) { if (members.length) pos[members[0]] = {x: points[members[0]].x, y: points[members[0]].y}; continue; }
      members.sort((a, b) => points[a].x - points[b].x || points[a].y - points[b].y || a - b);
      const cx = roundMean(members.reduce((s, i) => s + points[i].x, 0), members.length), cy = roundMean(members.reduce((s, i) => s + points[i].y, 0), members.length);
      const offsets = [0];
      for (let k = 1; k < members.length; k++) offsets.push(offsets[k - 1] + points[members[k - 1]].half + points[members[k]].half + 2);
      let x0 = cx - (offsets.at(-1) >> 1);
      const first = points[members[0]], last = points[members.at(-1)];
      x0 = Math.max(first.half, Math.min(width - 1 - last.half - offsets.at(-1), x0));
      members.forEach((i, k) => { pos[i] = {x: x0 + offsets[k], y: Math.max(points[i].half, Math.min(height - 1 - points[i].half, cy))}; });
    }
    let merged = false;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
      if (find(i) !== find(j) && cheb(pos[i], pos[j]) <= clearing(points[i]) + clearing(points[j])) merged = join(i, j) || merged;
    if (!merged) break;
  }
  return pos;
}
