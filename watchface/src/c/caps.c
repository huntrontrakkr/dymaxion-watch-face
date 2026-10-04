#include "caps.h"
#include "watch_text.h"
// A Draft capital (ASCII, lower case drawn as upper), or NULL if it has none.
static const uint8_t *capital(const uint8_t *font, uint32_t code) {
  if (code >= 'a' && code <= 'z') code -= 'a' - 'A';
  const uint8_t *entry = code >= CAPS_FIRST && code < CAPS_FIRST + CAPS_COUNT ? font + (code - CAPS_FIRST) * CAPS_INDEX_BYTES : NULL;
  return entry && entry[3] != 0xff ? entry : NULL;
}
// The language's own glyph comes first, then the Draft capital, then '?'.
typedef struct {const uint8_t *caps;WatchGlyph own;bool is_own;} Glyph;
static Glyph glyph(const uint8_t *font, uint32_t code) {
  Glyph g = {NULL, {0}, false};
  if (watch_text_glyph(code, &g.own)) { g.is_own = true; return g; }
  g.caps = capital(font, code);
  if (!g.caps) g.caps = font + ('?' - CAPS_FIRST) * CAPS_INDEX_BYTES;
  return g;
}
bool caps_valid(const uint8_t *font, size_t length) {
  if (!font || length != CAPS_BYTES) return false;
  for (int i = 0; i < CAPS_COUNT; i++) {
    const uint8_t *e = font + i * CAPS_INDEX_BYTES;
    if (e[3] == 0xff) continue;
    unsigned end = CAPS_RUNS_AT + 3u * ((unsigned)e[4] + ((unsigned)e[5] << 8) + e[3]);
    if (end > length) return false;
  }
  return font[('?' - CAPS_FIRST) * CAPS_INDEX_BYTES + 3] != 0xff;
}
int caps_width(const uint8_t *font, const char *text) {
  int width = 0;
  for (uint32_t code; (code = watch_text_next(&text));) { Glyph g = glyph(font, code); width += g.is_own ? g.own.advance : g.caps[0]; }
  return width;
}
void caps_draw(const uint8_t *font, const char *text, int x, int baseline, bool right, CapsSpan span, void *context) {
  if (right) x -= caps_width(font, text);
  for (uint32_t code; (code = watch_text_next(&text));) {
    Glyph g = glyph(font, code);
    if (g.is_own) {
      // Bitmap rows, drawn as runs of lit pixels.
      int stride = (g.own.width + 7) / 8, top = baseline - g.own.top, left = x + g.own.left;
      for (int row = 0; row < g.own.height; row++)
        for (int col = 0; col < g.own.width;) {
          if (!(g.own.bits[row * stride + col / 8] & (0x80 >> (col & 7)))) { col++; continue; }
          int start = col;
          while (col < g.own.width && (g.own.bits[row * stride + col / 8] & (0x80 >> (col & 7)))) col++;
          span(context, left + start, top + row, col - start);
        }
      x += g.own.advance;
      continue;
    }
    const uint8_t *e = g.caps, *run = font + CAPS_RUNS_AT + 3 * (e[4] + (e[5] << 8));
    for (int i = 0; i < e[3]; i++, run += 3)
      span(context, x + (int8_t)e[1] + run[0], baseline - e[2] + run[1], run[2]);
    x += e[0];
  }
}
