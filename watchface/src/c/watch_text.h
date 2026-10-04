#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "generated/watch_text_data.h"
// The face's words in the chosen language (shared/watch-text.js). Each
// language is a resource from tools/generate-watch-text.mjs holding its words
// and the glyphs they need beyond the Draft capitals. watch_text_use keeps a
// pointer to the resource's bytes, so they must stay loaded. Without one the
// words are empty, or English when built with WATCH_TEXT_ENGLISH (host tests).
bool watch_text_valid(const uint8_t *pack,size_t length);
void watch_text_use(const uint8_t *pack,size_t length);
const char *watch_text(int key);
// One of the resource's glyphs, for a code point the Draft capitals lack.
typedef struct {uint8_t advance;int8_t left;uint8_t top,width,height;const uint8_t *bits;} WatchGlyph;
bool watch_text_glyph(uint32_t code,WatchGlyph *glyph);
// Fills a pattern: {w} weekday, {d} day, {dd} two-digit day, {m} and {m2}
// months, {y} year (fillPattern in shared/watch-text.js).
void watch_text_fill(char *out,size_t size,const char *pattern,const char *weekday,int day,const char *month,const char *month2,int year);
// The next code point of UTF-8 text, advancing *text; 0 at the end.
uint32_t watch_text_next(const char **text);
