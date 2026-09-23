#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "palette.h"
#include "generated/palette_sizes.h"
static void read_packet(const char *path,uint8_t *p){
  FILE *f=fopen(path,"rb");assert(f);assert(fread(p,1,PALETTE_SIZE,f)==PALETTE_SIZE);fclose(f);
}
int main(int argc,char **argv){
  assert(argc==3);uint8_t custom[PALETTE_SIZE],preset[PALETTE_SIZE],bad[PALETTE_SIZE];
  read_packet(argv[1],custom);read_packet(argv[2],preset);
  assert(palette_valid(custom,sizeof custom));assert(palette_valid(preset,sizeof preset));
  assert(palette_applies(custom,5));assert(!palette_applies(custom,4));assert(!palette_applies(preset,0));
  assert(!palette_valid(NULL,PALETTE_SIZE));
  for(size_t n=0;n<PALETTE_SIZE;n++)assert(!palette_valid(custom,n));
  assert(!palette_valid(custom,PALETTE_SIZE+1));
  const int fields[]={PAL_VERSION,PAL_THEME,PAL_ENABLED,PAL_ZONE_GLYPHS,17};
  const int values[]={2,THEME_COUNT,2,2,1};
  for(int i=0;i<5;i++){memcpy(bad,custom,sizeof bad);bad[fields[i]]=values[i];assert(!palette_valid(bad,sizeof bad));}
  for(int i=PAL_COLORS;i<=PAL_INACTIVE;i++){
    memcpy(bad,custom,sizeof bad);bad[i]=0xbf;assert(!palette_valid(bad,sizeof bad));
    bad[i]=0xc0;assert(palette_valid(bad,sizeof bad));bad[i]=0xff;assert(palette_valid(bad,sizeof bad));
  }
  return 0;
}
