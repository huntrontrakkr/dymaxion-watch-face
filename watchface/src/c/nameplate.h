#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "generated/wordmark.h"
// The Dymaxion nameplate (shared/nameplate.js): centred between the clock and
// the map, its last row a pixel above the map net's top edge, shown only when
// it clears the status line and the clock's figures.
bool nameplate_spot(int map_y,int clock_top,bool stacked,int *x,int *y);
typedef void (*NameplatePixel)(void *context,int x,int y);
void nameplate_pixels(int x,int y,NameplatePixel pixel,void *context);
