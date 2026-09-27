#pragma once
#include <stddef.h>
#include <stdint.h>

// Flip frames store the left pixel in the low pair of bits. Pebble's palette
// bitmaps store it in the high pair. Reorder in place when a new frame is ready;
// the bitmap owns the same buffer, so drawing needs no second copy of the strip.
static inline void clock_bitmap_order(uint8_t *pixels,size_t bytes){
  for(size_t i=0;i<bytes;i++){
    uint8_t v=pixels[i];
    pixels[i]=(uint8_t)((v<<6)|((v&12)<<2)|((v&48)>>2)|(v>>6));
  }
}
