#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
// The GLYPHS packet (shared/glyph-protocol.js): version 1, options, then each
// place's drawn glyph as five row bytes, bit 4 the leftmost pixel. A place
// whose glyph ID is MARKER_CUSTOM (one past the built-in set) draws these.
#define GLYPHS_SIZE 17
#define GLYPH_ROWS 5
#define GLYPHS_BESIDE 1 // byte 1: icons beside the place times next to the clock
bool glyphs_valid(const uint8_t *p,size_t length);
static inline bool glyphs_beside(const uint8_t *g){return (g[1]&GLYPHS_BESIDE)!=0;}
// The five rows of place `place`'s glyph, bit 4 the leftmost pixel.
void place_glyph_rows(const uint8_t *glyphs,int place,uint8_t icon,uint8_t rows[GLYPH_ROWS]);
