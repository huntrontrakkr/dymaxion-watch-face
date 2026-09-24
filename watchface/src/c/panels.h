#pragma once
#include <pebble.h>
#include "panel_data.h"
void panels_init(void);
bool panels_receive(DictionaryIterator *iter);
// Whether the bottom band shows the place times (the zones page, or no panels).
bool panels_showing_zones(void);
bool panels_draw(GContext *ctx,time_t now,const struct tm *local,GFont font,const uint8_t *caps,const uint8_t *palette,bool clock24,const float *daylight);
int panels_weather_place(void);
bool panels_tick(time_t now);
bool panels_cycle(time_t now);
bool panels_shake_enabled(void);
int panels_flicks(void);
int panels_refresh_minutes(void);
