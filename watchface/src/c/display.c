#include "display.h"
#include <string.h>
#include "generated/triangle_display.h"
// Styles: 0 Span, 1 triangles, 2 broad, 3 retired LCD (migrates to broad), 4 Chamfer.
// Accept saved experimental packets so their display choice can be migrated.
bool display_valid(const uint8_t *p,size_t length){return p&&length==DISPLAY_SIZE&&p[0]==1&&p[1]<=9&&p[2]<=3&&p[3]<64&&(p[3]&3)<3&&((p[3]&3)||!p[3]);}
bool display_normalize(uint8_t out[DISPLAY_SIZE],const uint8_t *data,size_t length){
  if(!out||!display_valid(data,length))return false;
  memmove(out,data,DISPLAY_SIZE);
  if(out[1]==3)out[1]=2;
  out[3]=0;
  return true;
}
bool display_group_lit(uint8_t group,const uint8_t digits[4]){
  if(group==29)return true;
  if(!group||group>29)return false;
  uint8_t digit=digits[(group-1)/7];
  return digit<10&&(TRIANGLE_DIGIT_MASKS[digit]&(1u<<((group-1)%7)));
}
