#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "caps.h"
#include "zone_column.h"
static void plot(int x,int y,void *context){(void)context;printf("%d,%d ",x,y);}
static int measure(const char *text,const void *font){return caps_width(font,text);}
// zone-column-test caps.bin label hour minute clock24 delta stale right ...
// Prints each row's strings and positions, then baselines and placement rules.
int main(int argc,char **argv){
  static uint8_t font[CAPS_BYTES];FILE *f=fopen(argv[1],"rb");assert(f);assert(fread(font,1,sizeof(font),f)==CAPS_BYTES);fclose(f);
  for(int i=2;i+7<argc;i+=8){
    ZoneRow r;zone_row(&r,argv[i],atoi(argv[i+1]),atoi(argv[i+2]),atoi(argv[i+3]),atoi(argv[i+4]),atoi(argv[i+5]),atoi(argv[i+6]),atoi(argv[i+7]),measure,font);
    printf("%s|%d|%s|%d|%s|%d|%s|%d\n",r.label,r.label_x,r.time,r.time_x,r.suffix,r.suffix_x,r.day,r.day_x);
  }
  for(int count=1;count<=3;count++)for(int i=0;i<count;i++)printf("%d ",zone_row_baseline(i,count,false));
  printf("\n");
  for(int style=0;style<=9;style++)for(int mode=0;mode<3;mode++)for(int position=0;position<3;position++)for(int shown=0;shown<2;shown++)
    printf("%d%d",zones_beside(style,mode,position,shown),zones_on_map(mode,position,shown));
  printf("\n%d %d\n",zone_clock_shift(false),zone_clock_shift(true));
  for(int count=1;count<=3;count++)for(int i=0;i<count;i++)printf("%d ",zone_row_baseline(i,count,true));
  printf("\n");
  const char *times[]={"01:23","45:67","89:00"};
  for(int i=0;i<3;i++){int advance=zone_tall_draw(times[i],0,0,plot,NULL);printf("|%d\n",advance);}
  return 0;
}
