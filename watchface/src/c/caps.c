#include "caps.h"
static const uint8_t *glyph(const uint8_t *font, char ch) {
  int code = (unsigned char)ch;
  if (code >= 'a' && code <= 'z') code -= 'a' - 'A';
  const uint8_t *entry = code >= CAPS_FIRST && code < CAPS_FIRST + CAPS_COUNT ? font + (code - CAPS_FIRST) * CAPS_INDEX_BYTES : NULL;
  if (!entry || entry[3] == 0xff) entry = font + ('?' - CAPS_FIRST) * CAPS_INDEX_BYTES;
  return entry;
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
  for (const char *p = text; *p; p++) width += glyph(font, *p)[0];
  return width;
}
void caps_draw(const uint8_t *font, const char *text, int x, int baseline, bool right, CapsSpan span, void *context) {
  if (right) x -= caps_width(font, text);
  for (const char *p = text; *p; p++) {
    const uint8_t *e = glyph(font, *p);
    const uint8_t *run = font + CAPS_RUNS_AT + 3 * (e[4] + (e[5] << 8));
    for (int i = 0; i < e[3]; i++, run += 3)
      span(context, x + (int8_t)e[1] + run[0], baseline - e[2] + run[1], run[2]);
    x += e[0];
  }
}
