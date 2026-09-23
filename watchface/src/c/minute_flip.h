#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "generated/broad_clock_sizes.h"
#define CLOCK_WIDTH 200
#define CLOCK_HEIGHT 40
#define CLOCK_PIXELS 8000
#define CLOCK_MASK_BYTES 1000
#define CLOCK_FRAME_BYTES 2000
#define CLOCK_FLIP_MS 400
typedef struct {
  uint8_t before[CLOCK_MASK_BYTES],after[CLOCK_MASK_BYTES];
  uint8_t active[CLOCK_CELL_COUNT],delay[CLOCK_CELL_COUNT],changed_slots;
  uint16_t changed_cells;
} ClockFlip;
void clock_mask(const uint8_t digits[4],uint8_t bits[CLOCK_MASK_BYTES]);
void clock_flip_prepare(ClockFlip *flip,const uint8_t before[4],const uint8_t after[4]);
void clock_flip_sample(const ClockFlip *flip,uint16_t elapsed,uint8_t pixels[CLOCK_FRAME_BYTES]);
static inline uint8_t clock_frame_pixel(const uint8_t *pixels,int i){return (pixels[i>>2]>>((i&3)*2))&3;}
