#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "caps.h"
#include "zone_column.h"
static int measure(const char *text,const void *font){return caps_width(font,text);}
// zone-column-test caps.bin label hour minute clock24 delta stale ...
// Prints each row's strings and positions, then baselines and placement rules.
int main(int argc,char **argv){
  static uint8_t font[CAPS_BYTES];FILE *f=fopen(argv[1],"rb");assert(f);assert(fread(font,1,sizeof(font),f)==CAPS_BYTES);fclose(f);
  for(int i=2;i+5<argc;i+=6){
    ZoneRow r;zone_row(&r,argv[i],atoi(argv[i+1]),atoi(argv[i+2]),atoi(argv[i+3]),atoi(argv[i+4]),atoi(argv[i+5]),measure,font);
    printf("%s|%d|%s|%d|%s|%d|%s|%d\n",r.label,r.label_x,r.time,r.time_x,r.suffix,r.suffix_x,r.day,r.day_x);
  }
  for(int count=1;count<=3;count++)for(int i=0;i<count;i++)printf("%d ",zone_row_baseline(i,count));
  printf("\n");
  for(int style=0;style<=9;style++)for(int stacked=0;stacked<2;stacked++)for(int mode=0;mode<3;mode++)for(int shown=0;shown<2;shown++)
    printf("%d",zones_beside(style,stacked,mode,shown));
  printf("\n");
  return 0;
}
