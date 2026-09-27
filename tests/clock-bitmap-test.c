#include <assert.h>
#include <string.h>
#include "clock_bitmap.h"

int main(void){
  uint8_t pixels[258],original[258];
  pixels[0]=0xa5;pixels[257]=0x5a;
  for(int i=0;i<256;i++)pixels[i+1]=(uint8_t)i;
  memcpy(original,pixels,sizeof(pixels));
  clock_bitmap_order(pixels+1,256);
  assert(pixels[0]==0xa5&&pixels[257]==0x5a);
  // Decode using Pebble's left-to-right, high-bit-first palette format.
  // Every possible group of four 2-bit colors must retain its pixel order.
  for(int i=0;i<256;i++)for(int x=0;x<4;x++)
    assert(((pixels[i+1]>>(6-2*x))&3)==((original[i+1]>>(2*x))&3));
  assert(pixels[0xe4+1]==0x1b); // 0,1,2,3 stays 0,1,2,3.
  clock_bitmap_order(pixels+1,256);
  assert(!memcmp(pixels,original,sizeof(pixels)));
  clock_bitmap_order(pixels,0);
  assert(!memcmp(pixels,original,sizeof(pixels)));
  return 0;
}
