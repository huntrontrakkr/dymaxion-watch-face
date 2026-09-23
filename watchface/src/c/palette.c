#include "palette.h"
#include "generated/palette_sizes.h"
bool palette_valid(const uint8_t *p,size_t length){
  if(!p||length!=PALETTE_SIZE||p[PAL_VERSION]!=1||p[PAL_THEME]>=THEME_COUNT||p[PAL_ENABLED]>1||p[PAL_ZONE_GLYPHS]>1||p[17])return false;
  for(int i=PAL_COLORS;i<=PAL_INACTIVE;i++)if(p[i]<0xc0)return false;
  return true;
}
bool palette_applies(const uint8_t *p,uint8_t theme){return p[PAL_ENABLED]&&p[PAL_THEME]==theme;}
