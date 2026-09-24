#pragma once
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#define DISPLAY_SIZE 4
bool display_valid(const uint8_t *data,size_t length);
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length);
