#pragma once
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
// Version 3 packets are 8 bytes; versions 1 and 2 (4 bytes) still load.
#define DISPLAY_SIZE 8
#define DISPLAY_LEGACY_SIZE 4
// Byte 3: 0 none, 1 triangle points, 2 triangle lines, 3 fine triangle points;
// background n is flag bit 4<<n in the map data.
#define MAP_BACKGROUND_COUNT 4
// Version 3 byte 3 bits 2-4: the map time size, 0 medium (3x6), 1 small
// (3x5), 2 large (3x7), 3 extra large (3x8), 4 wide (4x8); older packets read
// as medium.
#define MAP_TIME_SIZE_CODES 5
#define DISPLAY_MAP_BACKGROUND(d) ((d)[3]&3)
#define DISPLAY_MAP_TIME_CODE(d) (((d)[3]>>2)&7)
// Byte 3 bit 5: tall figures for the place times beside the clock.
#define DISPLAY_ZONE_TALL(d) (((d)[3]&32)!=0)
bool display_valid(const uint8_t *data,size_t length);
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length);
