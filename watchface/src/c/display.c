#include "display.h"
#include <string.h>
#include "zone_column.h"
// Styles: 0 Span, 2 broad, 4 Chamfer, 5-8 system fonts, 9 Leco Delta. Retired:
// 1 triangular segments (migrates to Chamfer), 3 LCD (migrates to broad).
// Accept saved experimental packets so their display choice can be migrated.
// Version 2 packets carry the map background in byte 3; version 1 used it for
// the retired framing experiment.
static bool options_valid(const uint8_t *p){
  return !(p[2]&~0xfe)&&((p[2]>>2)&3)<ZONE_TIMES_COUNT&&((p[2]>>4)&3)<ZONE_POSITION_COUNT&&p[3]<MAP_BACKGROUND_COUNT;
}
// Version 3 byte 3 also carries the map time size (bits 2-4).
static bool v3_options_valid(const uint8_t *p){
  return !(p[2]&~0xfe)&&((p[2]>>2)&3)<ZONE_TIMES_COUNT&&((p[2]>>4)&3)<ZONE_POSITION_COUNT&&
    (p[3]&3)<MAP_BACKGROUND_COUNT&&((p[3]>>2)&7)<MAP_TIME_SIZE_CODES&&!(p[3]&~0x7f);
}
bool display_valid(const uint8_t *p,size_t length){
  if(!p||p[1]>9)return false;
  // Version 3 adds power and motion (power.h) in bytes 4-7.
  if(length==DISPLAY_SIZE)return p[0]==3&&v3_options_valid(p)&&!(p[4]&~0x7f)&&p[5]<24&&p[6]<24&&(p[7]==5||p[7]==10||p[7]==20||p[7]==30);
  if(length!=DISPLAY_LEGACY_SIZE)return false;
  // Version 2 byte 2: bit 1 no leading zero, bits 2-3 when place times also
  // show outside the panel, bits 4-5 where, bit 6 map times may turn, bit 7 the nameplate.
  if(p[0]==2)return options_valid(p);
  return p[0]==1&&p[2]<=3&&p[3]<64&&(p[3]&3)<3&&((p[3]&3)||!p[3]);
}
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length){
  if(!out||!display_valid(data,length))return false;
  uint8_t in[DISPLAY_SIZE]={0,0,0,0,0,22,7,10}; // older packets: default power and motion
  memcpy(in,data,length);memcpy(out,in,DISPLAY_SIZE);
  if(out[1]==3)out[1]=2;
  if(out[1]==1)out[1]=4;
  // Version 1: bit 0 (unlit triangles) is retired and byte 3 was framing.
  if(out[0]==1){out[2]&=2;out[3]=0;}
  out[0]=3;
  return true;
}
