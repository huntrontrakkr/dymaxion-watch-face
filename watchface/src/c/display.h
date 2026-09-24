#pragma once
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#define DISPLAY_SIZE 4
// Byte 3: 0 none, 1 triangle points, 2 triangle lines; background n is flag
// bit 4<<n in the map data.
#define MAP_BACKGROUND_COUNT 3
bool display_valid(const uint8_t *data,size_t length);
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length);
