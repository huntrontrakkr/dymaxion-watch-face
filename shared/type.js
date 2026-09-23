// Bitmap proofs use the same monochrome FreeType loading flags as the Pebble SDK.
export function textWidth(font, text) {
  return [...text].reduce((width, char) => width + (font[char] || font['?']).a, 0);
}
export function fitLabel(font, text, width = 34) {
  let label = text.slice(0, 5);
  while (label && textWidth(font, label) > width) label = label.slice(0, -1);
  return label;
}
export function drawBitmapText(ctx, font, text, x, baseline, color, align = 'left') {
  const width = textWidth(font, text);
  x = Math.floor(x - (align === 'center' ? width / 2 : align === 'right' ? width : 0));
  baseline = Math.round(baseline);
  ctx.fillStyle = color;
  for (const char of text) {
    const glyph = font[char] || font['?'];
    for (const [rx, ry, length] of glyph.r) ctx.fillRect(x + glyph.l + rx, baseline - glyph.t + ry, length, 1);
    x += glyph.a;
  }
}
export function drawIdentity(ctx, rows, x, y, ink) {
  ctx.fillStyle = ink;
  rows.forEach((row, ry) => row.forEach((alpha, rx) => {
    if (alpha) ctx.fillRect(x + rx, y + ry, 1, 1);
  }));
}
