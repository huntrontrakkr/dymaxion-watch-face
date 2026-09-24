#pragma once
#include <stdint.h>
#include <stdbool.h>
#define SETTINGS_SIZE 232
#define ZONE_SIZE 72
#define HEADER_SIZE 16
#define MARKER_COUNT 5
enum { VERSION, THEME, FLAGS, FORMAT, ORIENTATION, TIME_X, TIME_Y, MAP_X, MAP_Y, ZONE_X, ZONE_Y, ZONE2_X, ZONE2_Y, ZONE3_X, ZONE3_Y, ENABLED };
enum { DAY_NIGHT=1, EDGES=2, LIGHTS=4, MOTION=8, SUN=16, STACKED=32 };
int16_t read_i16(const uint8_t *p);
uint32_t read_u32(const uint8_t *p);
int32_t calendar_ordinal(int year, int month, int day);
bool settings_valid(const uint8_t *s, unsigned length);
int16_t zone_offset(const uint8_t *zone, uint32_t epoch);
