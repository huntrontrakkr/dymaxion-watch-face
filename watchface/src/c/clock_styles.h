#pragma once
#include "minute_flip.h"
// Numeral styles without fixed slots, drawn as horizontal runs in the 200 x 40
// clock strip exactly as shared/clock-styles.js does: 0 Span, 1 triangles,
// 5-9 the Pebble system fonts and Leco Delta (glyphs from clock-glyphs.bin).
typedef void (*ClockSpan)(void *context,int x,int y,int length);
#define CLOCK_STYLE_HEIGHT 40
// The glyph block for a display code, or NULL if the resource lacks it or is malformed.
const uint8_t *clock_glyph_font(const uint8_t *data,size_t length,uint8_t code,int8_t *box_top);
// Runs for digits (10 = blank first slot), clipped to the strip. Font styles need their block.
void clock_style_runs(uint8_t style,const uint8_t *font,int8_t box_top,const uint8_t digits[4],ClockSpan span,void *context);
// A transition face for a style: Chamfer's lattice with the style's own mask.
bool clock_style_face(ClockFace *face,const ClockFace *lattice,uint8_t style,const uint8_t *font,int8_t box_top);
