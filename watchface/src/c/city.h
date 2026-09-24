#pragma once
#include <stdbool.h>
#include <stdint.h>
#define CITY_SIZE 52
bool city_valid(const uint8_t *packet,unsigned length);
bool city_usable(const uint8_t *packet,uint32_t now);
bool city_stale(const uint8_t *packet,uint32_t now);
// The wearer's position in tenths of a degree, when the phone sent one.
bool city_position(const uint8_t *packet,int *lat10,int *lon10);
// Where the wearer is on the map, when the phone sent it (flag 8).
bool city_map_pixel(const uint8_t *packet,int *x,int *y);
