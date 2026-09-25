#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "generated/wordmark.h"
// The Dymaxion nameplate (shared/nameplate.js): centred between the clock and
// the map. Returns where the clock goes; *shown says whether the nameplate
// fits, at (*x,*y). A clock below the map moves down to make room.
int nameplate_layout(int map_y,int time_y,int height,int visible,bool *shown,int *x,int *y);
typedef void (*NameplatePixel)(void *context,int x,int y);
void nameplate_pixels(int x,int y,NameplatePixel pixel,void *context);
