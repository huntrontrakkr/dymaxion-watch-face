#pragma once
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#define DISPLAY_SIZE 4
typedef struct {uint8_t x,y,length,group;} TriangleRun;
extern const uint16_t TRIANGLE_RUN_COUNT;
extern const TriangleRun TRIANGLE_RUNS[];
extern const uint8_t TRIANGLE_DIGIT_MASKS[10],TRIANGLE_INACTIVE[];
bool display_valid(const uint8_t *data,size_t length);
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length);
bool display_group_lit(uint8_t group,const uint8_t digits[4]);
