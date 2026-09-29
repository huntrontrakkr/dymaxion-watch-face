#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "generated/map_light_sizes.h"
// Day, a checkerboard through civil twilight, then night: sin(-0.833 degrees)
// and sin(-6 degrees) in the light's units (stored direction to 127 x the
// Sun to 1024). mapNight() in shared/solar.js.
#define MAP_SUNRISE -1891
#define MAP_CIVIL_TWILIGHT -13594
static inline bool map_night(int32_t light,int x,int y){return light<MAP_CIVIL_TWILIGHT||(light<MAP_SUNRISE&&((x+y)&1));}
// Relighting only what can change (tools/generate-map-light.mjs writes the
// bounds). `classes` remembers each tile's shading between calls. With `paint`
// NULL it only records the classes, after a full rebuild has painted the map.
// Otherwise it repaints every map pixel of each tile whose shading may differ
// from `classes`, with exactly the per-pixel rule, and updates `classes`.
// `paint` receives map coordinates (before rotation), the pixel's flags
// (bits 0-1 kind, 1 sea, 2 land; bit 2 edge) and whether it is night.
typedef bool (*MapLightRead)(void *context,uint32_t offset,void *buffer,uint32_t length);
typedef void (*MapLightPaint)(void *context,int x,int y,uint8_t flags,bool night);
typedef struct {uint32_t reads,bytes,dots,painted;} MapLightStats; // for measurement; may be NULL
bool map_light_update(const int16_t sun[3],MapLightRead read,void *read_context,MapLightPaint paint,void *paint_context,uint8_t classes[MAP_LIGHT_TILES],MapLightStats *stats);
