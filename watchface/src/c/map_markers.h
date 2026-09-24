#pragma once
#include <stdint.h>
// Where each map marker is drawn (shared/map-markers.js): true positions,
// except that markers whose clearings would overlap are drawn side by side,
// west to east, around their group's average position.
#define MAP_MARKERS_MAX 4
typedef struct {int16_t x,y;uint8_t half;} MapMarker; // half: 2 for places, 3 for you
void map_markers_layout(const MapMarker *points,int count,int width,int height,MapMarker *out);
