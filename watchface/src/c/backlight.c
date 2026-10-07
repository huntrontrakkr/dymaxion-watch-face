#include <pebble.h>
#include "backlight.h"
#include "generated/palette_sizes.h"
bool backlight_valid(const uint8_t *p,size_t length){
  return p&&length==BACKLIGHT_SIZE&&p[0]==1&&p[1]<THEME_COUNT&&p[2]<=1
    &&p[3]>=224&&p[4]>=224&&p[5]>=224&&(p[3]==255||p[4]==255||p[5]==255);
}
void backlight_apply(const uint8_t *p,uint8_t theme,bool focused){
#ifdef PBL_RGB_BACKLIGHT
  if(focused&&p[0]==1&&p[1]==theme&&p[2])
    light_set_color_rgb888(((uint32_t)p[3]<<16)|((uint32_t)p[4]<<8)|p[5]);
  else light_set_system_color();
#else
  (void)p;(void)theme;(void)focused;
#endif
}
