#pragma once
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#define PALETTE_SIZE 18
// PAL_ZONE_GLYPHS is still validated but no longer read: place icons are display byte 3 bit 6.
enum { PAL_VERSION, PAL_THEME, PAL_ENABLED, PAL_ZONE_GLYPHS, PAL_COLORS, PAL_MOON_SHADOW=15, PAL_INACTIVE=16 };
bool palette_valid(const uint8_t *p,size_t length);
bool palette_applies(const uint8_t *p,uint8_t theme);
// One RGB222 step per channel from c toward `toward` (GColor argb bytes).
uint8_t palette_step(uint8_t c,uint8_t toward);
