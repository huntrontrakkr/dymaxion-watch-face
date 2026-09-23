#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "minute_flip.h"
int main(int argc,char **argv){
  assert(argc>=4);uint8_t from[4],to[4];const int positions[4]={0,1,3,4};
  for(int s=0;s<4;s++){from[s]=argv[1][positions[s]]-'0';to[s]=argv[2][positions[s]]-'0';assert(from[s]<10&&to[s]<10);}
  ClockFlip flip;clock_flip_prepare(&flip,from,to);
  uint8_t packed[CLOCK_FRAME_BYTES],pixels[CLOCK_PIXELS];
  for(int i=3;i<argc;i++){
    clock_flip_sample(&flip,(uint16_t)atoi(argv[i]),packed);
    for(int p=0;p<CLOCK_PIXELS;p++)pixels[p]=clock_frame_pixel(packed,p);
    assert(fwrite(pixels,1,sizeof(pixels),stdout)==sizeof(pixels));
  }
  return 0;
}
