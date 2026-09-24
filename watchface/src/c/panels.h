#pragma once
#include <pebble.h>
#include "panel_data.h"
void panels_init(void);
bool panels_receive(DictionaryIterator *iter);
bool panels_draw(GContext *ctx,time_t now,const struct tm *local,GFont font,const uint8_t *caps,const uint8_t *palette,bool clock24);
bool panels_tick(time_t now);
bool panels_cycle(time_t now);
bool panels_shake_enabled(void);
int panels_refresh_minutes(void);
