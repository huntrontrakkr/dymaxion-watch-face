#include <assert.h>
#include <string.h>
#include "display.h"
int main(void){
  uint8_t p[4]={1,4,1,0};assert(display_valid(p,4));assert(!display_valid(NULL,4));assert(!display_valid(p,3));
  p[0]=3;assert(!display_valid(p,4));p[0]=0;assert(!display_valid(p,4));p[0]=1;
  for(int style=0;style<=10;style++){p[1]=style;assert(display_valid(p,4)==(style<=9));}
  p[1]=4;p[2]=3;assert(display_valid(p,4));p[2]=4;assert(!display_valid(p,4));p[2]=1;
  p[3]=1;assert(display_valid(p,4));p[3]=3;assert(!display_valid(p,4));p[3]=64;assert(!display_valid(p,4));p[3]=4;assert(!display_valid(p,4));
  uint8_t normalized[4]={9,9,9,9};
  assert(!display_normalize(normalized,p,4));assert(!memcmp(normalized,(uint8_t[]){9,9,9,9},4));
  assert(!display_normalize(normalized,NULL,4));assert(!display_normalize(NULL,p,4));
  // Version 1 packets become version 2: retired styles migrate (1 triangles to
  // Chamfer, 3 LCD to broad), the unlit-grid bit and legacy byte 3 are dropped.
  for(int style=0;style<=9;style++)for(int grid=0;grid<=3;grid++)for(int flags=0;flags<64;flags++){
    uint8_t legacy[4]={1,style,grid,flags};
    bool valid=!flags||(flags&3)==1||(flags&3)==2;
    assert(display_normalize(normalized,legacy,4)==valid);
    if(valid){
      uint8_t expected[4]={2,style==1?4:style==3?2:style,grid&2,0};
      assert(!memcmp(normalized,expected,4));
      assert(display_normalize(normalized,normalized,4));assert(!memcmp(normalized,expected,4));
    }
  }
  // Version 2 byte 2: bit 1 leading zero, bits 2-3 when place times show
  // (0-2), bits 4-5 where (0-2), bit 6 map turning, bit 7 the nameplate; bit 0 stays clear.
  for(int options=0;options<256;options++){
    uint8_t current[4]={2,4,options,0};
    bool valid=!(options&~0xfe)&&((options>>2)&3)<3&&((options>>4)&3)<3;
    assert(display_valid(current,4)==valid);
    if(valid){assert(display_normalize(normalized,current,4));assert(!memcmp(normalized,current,4));}
  }
  // Version 2 carries the map background in byte 3.
  for(int background=0;background<8;background++){
    uint8_t current[4]={2,4,2,background};
    assert(display_normalize(normalized,current,4)==(background<MAP_BACKGROUND_COUNT));
    if(background<MAP_BACKGROUND_COUNT)assert(!memcmp(normalized,current,4));
  }
  return 0;
}
