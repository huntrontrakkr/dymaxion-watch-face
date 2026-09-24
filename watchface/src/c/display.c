#include "display.h"
#include <string.h>
#include "zone_column.h"
// Styles: 0 Span, 2 broad, 4 Chamfer, 5-8 system fonts, 9 Leco Delta. Retired:
// 1 triangular segments (migrates to Chamfer), 3 LCD (migrates to broad).
// Accept saved experimental packets so their display choice can be migrated.
// Version 2 packets carry the map background in byte 3; version 1 used it for
// the retired framing experiment.
bool display_valid(const uint8_t *p,size_t length){
  if(!p||length!=DISPLAY_SIZE||p[1]>9)return false;
  // Version 2 byte 2: bit 1 no leading zero, bits 2-3 where place times go,
  // bit 4 their side.
  if(p[0]==2)return !(p[2]&~0x1e)&&((p[2]>>2)&3)<ZONE_TIMES_COUNT&&p[3]<MAP_BACKGROUND_COUNT;
  return p[0]==1&&p[2]<=3&&p[3]<64&&(p[3]&3)<3&&((p[3]&3)||!p[3]);
}
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length){
  if(!out||!display_valid(data,length))return false;
  memmove(out,data,DISPLAY_SIZE);
  if(out[1]==3)out[1]=2;
  if(out[1]==1)out[1]=4;
  // Version 1: bit 0 (unlit triangles) is retired and byte 3 was framing.
  if(out[0]==1){out[0]=2;out[2]&=2;out[3]=0;}
  return true;
}
