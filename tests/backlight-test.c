#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "backlight.h"
#include "generated/palette_sizes.h"
static uint32_t rgb;
static int sets,resets;
void light_set_color_rgb888(uint32_t color){rgb=color;sets++;}
void light_set_system_color(void){resets++;}
int main(int argc,char **argv){
  assert(argc==2);uint8_t p[BACKLIGHT_SIZE],bad[BACKLIGHT_SIZE];
  FILE *f=fopen(argv[1],"rb");assert(f);assert(fread(p,1,sizeof p,f)==sizeof p);fclose(f);
  assert(backlight_valid(p,sizeof p));assert(!backlight_valid(NULL,sizeof p));
  for(size_t n=0;n<BACKLIGHT_SIZE;n++)assert(!backlight_valid(p,n));
  assert(!backlight_valid(p,BACKLIGHT_SIZE+1));
  for(int i=0;i<6;i++){
    memcpy(bad,p,sizeof p);bad[i]=i==0?2:i==1?THEME_COUNT:i==2?2:223;
    assert(!backlight_valid(bad,sizeof bad));
  }
  memcpy(bad,p,sizeof p);bad[3]=254;assert(!backlight_valid(bad,sizeof bad));
  backlight_apply(p,0,true);backlight_apply(p,0,false);backlight_apply(p,0,true);
  backlight_apply(p,1,true);p[2]=0;backlight_apply(p,0,true);
  memset(p,0,sizeof p);backlight_apply(p,0,true);
#ifdef PBL_RGB_BACKLIGHT
  assert(rgb==0xfff1e7);assert(sets==2);assert(resets==4);
#else
  assert(!rgb&&!sets&&!resets);
#endif
}
