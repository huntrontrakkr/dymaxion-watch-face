#pragma once
#include <stdint.h>
// Where each map marker is drawn (shared/map-markers.js): true positions,
// except that markers whose clearings would overlap are drawn side by side,
// west to east, around their group's average position.
#define MAP_MARKERS_MAX 4
typedef struct {int16_t x,y;uint8_t half;} MapMarker; // half: 2 for places, 3 for you
// `group` (may be NULL) receives each marker's group: the lowest index in it.
void map_markers_layout(const MapMarker *points,int count,int width,int height,MapMarker *out,uint8_t *group);
// A group of two or more sits on a hull: a 7-pixel band whose outline runs
// where each glyph's 1-pixel clearing ring would be, from the first glyph's
// ring to the last one's, corners cut and cleared inside: it takes the place
// of the rings. `glyphs`/`inner`: the band; `outer`: every member's clearing.
#define HULL_HALF 3
typedef struct {int16_t x0,y0,x1,y1;} MapRect;
typedef struct {uint8_t members;MapRect glyphs,inner,outer;} MapHull;
int map_markers_hulls(const MapMarker *points,const MapMarker *layout,const uint8_t *group,int count,MapHull *hulls);
// Each marker's own area: its clearing, or its group's hull with its ring.
void map_markers_own(const MapMarker *points,const MapMarker *layout,const uint8_t *group,int count,const MapHull *hulls,int hull_count,MapRect *own);
typedef void (*MapHullPixel)(void *context,int x,int y);
void map_hull_ground(const MapHull *hull,MapHullPixel pixel,void *context);
void map_hull_outline(const MapHull *hull,MapHullPixel pixel,void *context);
