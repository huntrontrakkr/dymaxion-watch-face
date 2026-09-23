#pragma once
#include <stdbool.h>
#include <stdint.h>
#define CITY_SIZE 48
bool city_valid(const uint8_t *packet,unsigned length);
bool city_usable(const uint8_t *packet,uint32_t now);
bool city_stale(const uint8_t *packet,uint32_t now);
