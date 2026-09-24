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
bool display_valid(const uint8_t *data,size_t length);
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length);
