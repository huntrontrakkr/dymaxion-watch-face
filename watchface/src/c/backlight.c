#include <pebble.h>
#include "backlight.h"
#include "generated/palette_sizes.h"
bool backlight_valid(const uint8_t *p,size_t length){
  // Each RGB channel is an unrestricted byte (0–255).
  return p&&length==BACKLIGHT_SIZE&&p[0]==1&&p[1]<THEME_COUNT&&p[2]<=1;
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
