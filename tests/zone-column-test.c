#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "caps.h"
#include "zone_column.h"
static void plot(int x,int y,void *context){(void)context;printf("%d,%d ",x,y);}
static int measure(const char *text,const void *font){return caps_width(font,text);}
// zone-column-test caps.bin label hour minute clock24 delta stale right ...
// Prints each row's strings and positions, then baselines and placement rules.
int main(int argc,char **argv){
  static uint8_t font[CAPS_BYTES];FILE *f=fopen(argv[1],"rb");assert(f);assert(fread(font,1,sizeof(font),f)==CAPS_BYTES);fclose(f);
  if(argc>2&&!strcmp(argv[2],"strip")){
    // strip: lines of "n compact" then n × "label hour minute clock24 delta stale".
    int n,compact;
    while(scanf("%d %d",&n,&compact)==2){
      ZoneStripItem items[3];
      for(int i=0;i<n;i++){char label[16];int hour,minute,clock24,delta,stale;if(scanf("%15s %d %d %d %d %d",label,&hour,&minute,&clock24,&delta,&stale)!=6)return 1;zone_strip_entry(&items[i],label,hour,minute,clock24,delta,stale);}
      zone_strip(items,n,compact,measure,font);
      for(int i=0;i<n;i++)printf("%s%s|%s|%s|%s|%d|%d|%d|%d|%d",i?" ":"",items[i].label,items[i].time,items[i].suffix,items[i].day,items[i].glyph_x,items[i].label_x,items[i].time_x,items[i].suffix_x,items[i].day_x);
      puts("");
    }
    return 0;
  }
  for(int i=2;i+8<argc;i+=9){
    ZoneRow r;zone_row(&r,argv[i],atoi(argv[i+1]),atoi(argv[i+2]),atoi(argv[i+3]),atoi(argv[i+4]),atoi(argv[i+5]),atoi(argv[i+6]),atoi(argv[i+7]),atoi(argv[i+8]),measure,font);
    printf("%d|%s|%d|%s|%d|%s|%d|%s|%d\n",r.glyph_x,r.label,r.label_x,r.time,r.time_x,r.suffix,r.suffix_x,r.day,r.day_x);
  }
  for(int count=1;count<=3;count++)for(int i=0;i<count;i++)printf("%d ",zone_row_baseline(i,count,false));
  printf("\n");
  for(int style=0;style<=9;style++)for(int mode=0;mode<3;mode++)for(int position=0;position<ZONE_POSITION_COUNT;position++)for(int shown=0;shown<2;shown++)
    printf("%d%d%d",zones_beside(style,mode,position,shown),zones_on_map(mode,position,shown),zones_on_strip(mode,position,shown));
  printf("\n%d %d\n",zone_clock_shift(false),zone_clock_shift(true));
  for(int count=1;count<=3;count++)for(int i=0;i<count;i++)printf("%d ",zone_row_baseline(i,count,true));
  printf("\n");
  const char *times[]={"01:23","45:67","89:00"};
  for(int i=0;i<3;i++){int advance=zone_tall_draw(times[i],0,0,plot,NULL);printf("|%d\n",advance);}
  return 0;
}
