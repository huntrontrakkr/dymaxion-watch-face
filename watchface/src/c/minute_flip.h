#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#define CLOCK_WIDTH 200
#define CLOCK_FLIP_MS 400
// A tile's centroid in Q8 pixels: tiles shrink toward it.
typedef struct {int32_t cx,cy;} ClockCell;
// A 200-pixel strip with four fixed numeral slots and one equilateral lattice.
// Broad reads static tables; Chamfer reads a resource loaded into the heap.
typedef struct ClockFace ClockFace;
struct ClockFace {
  uint8_t height,cap_top,cap_height,digit_width,starts[4];
  uint16_t cell_count;
  const uint8_t *(*glyph)(const ClockFace *face,int digit);
  uint16_t (*owner)(const ClockFace *face,int x,int y);
  void (*cell)(const ClockFace *face,int id,ClockCell *out);
  void (*colon)(uint8_t *bits);
  const uint8_t *data;
};
typedef struct {
  const ClockFace *face;
  uint8_t *before,*after,*active,*delay;
  uint16_t changed_cells;uint8_t changed_slots;
} ClockFlip;
extern const ClockFace BROAD_FACE;
bool chamfer_face_init(ClockFace *face,const uint8_t *data,size_t length);
static inline int clock_pixels(const ClockFace *face){return CLOCK_WIDTH*face->height;}
static inline size_t clock_frame_bytes(const ClockFace *face){return (size_t)clock_pixels(face)/4;}
// Heap bytes for a flip's working state: both masks, then per-tile flags and delays.
static inline size_t clock_flip_bytes(const ClockFace *face){return (size_t)clock_pixels(face)/4+2u*face->cell_count;}
void clock_flip_attach(ClockFlip *flip,const ClockFace *face,uint8_t *memory);
void clock_mask(const ClockFace *face,const uint8_t digits[4],uint8_t *bits);
void clock_flip_prepare(ClockFlip *flip,const uint8_t before[4],const uint8_t after[4]);
void clock_flip_sample(const ClockFlip *flip,uint16_t elapsed,uint8_t *pixels);
static inline uint8_t clock_frame_pixel(const uint8_t *pixels,int i){return (pixels[i>>2]>>((i&3)*2))&3;}
