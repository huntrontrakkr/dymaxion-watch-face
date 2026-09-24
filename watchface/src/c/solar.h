#pragma once
#include <stdbool.h>
#include <stdint.h>
// Daylight at one place for the panel charts; mirrors shared/solar.js.
// A place is a unit vector with x toward 0N 0E, y toward 0N 90E, z toward the pole.
void solar_place(int lat10,int lon10,float out[3]);
void solar_place_vector(const int8_t v[3],float out[3]);
void solar_direction(uint32_t epoch,float out[3]);
bool solar_up(uint32_t epoch,const float place[3]);
// Next sunrise or sunset after `now` within `hours`, to 30 seconds; 0 when the
// sun neither rises nor sets (polar day or night).
uint32_t solar_next_event(uint32_t now,const float place[3],int hours,bool *rise);
