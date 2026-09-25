#include "zone_column.h"
#include <stdio.h>
#include <string.h>
bool zone_column_fits(uint8_t style){return style>=4&&style<=9;}
static bool elsewhere(uint8_t zone_times,bool panel_shows_zones){return zone_times==ZONE_TIMES_ALWAYS||(zone_times==ZONE_TIMES_WHEN_HIDDEN&&!panel_shows_zones);}
bool zones_beside(uint8_t style,bool stacked,uint8_t zone_times,uint8_t position,bool panel_shows_zones){
  if(position==ZONE_POSITION_MAP||stacked||!zone_column_fits(style))return false;
  return elsewhere(zone_times,panel_shows_zones);
}
bool zones_on_map(uint8_t zone_times,uint8_t position,bool panel_shows_zones){return position==ZONE_POSITION_MAP&&elsewhere(zone_times,panel_shows_zones);}
// Rows 14 pixels apart, centred on the figures (y 2-37 of the strip); tall
// rows 13 apart, centred in y 2-38.
int zone_row_baseline(int index,int count,bool tall){
  int pitch=tall?13:14,glyph=tall?ZONE_TALL_HEIGHT:7,block=glyph+pitch*(count-1);
  return 2+((tall?36:35)-block)/2+index*pitch+glyph;
}
// Tall figures, one byte per row, bit 4 the leftmost column (shared/zone-column.js).
static const uint8_t TALL[10][ZONE_TALL_HEIGHT]={
  {0x0e,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x11,0x0e},
  {0x04,0x0c,0x14,0x04,0x04,0x04,0x04,0x04,0x04,0x0e},
  {0x0e,0x11,0x01,0x01,0x02,0x04,0x08,0x10,0x10,0x1f},
  {0x1e,0x01,0x01,0x01,0x0e,0x01,0x01,0x01,0x01,0x1e},
  {0x02,0x06,0x0a,0x0a,0x12,0x12,0x1f,0x02,0x02,0x02},
  {0x1f,0x10,0x10,0x10,0x1e,0x01,0x01,0x01,0x01,0x1e},
  {0x0e,0x10,0x10,0x10,0x1e,0x11,0x11,0x11,0x11,0x0e},
  {0x1f,0x01,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x08},
  {0x0e,0x11,0x11,0x11,0x0e,0x11,0x11,0x11,0x11,0x0e},
  {0x0e,0x11,0x11,0x11,0x11,0x0f,0x01,0x01,0x01,0x0e}};
int zone_tall_draw(const char *text,int x,int baseline,ZoneTallPlot plot,void *context){
  int start=x;
  for(;*text;text++){
    if(*text==':'){plot(x,baseline-8,context);plot(x,baseline-3,context);x+=3;continue;}
    if(*text>='0'&&*text<='9')for(int y=0;y<ZONE_TALL_HEIGHT;y++)for(int b=0;b<5;b++)if(TALL[*text-'0'][y]&(16>>b))plot(x+b,baseline-ZONE_TALL_HEIGHT+y,context);
    x+=6;
  }
  return x-start;
}
// The label with its day offset right after it; time and A/P in fixed slots
// flush right, so the times line up in one column.
void zone_row(ZoneRow *row,const char *label,int hour,int minute,bool clock24,int delta,bool stale,bool right,ZoneMeasure measure,const void *font){
  int x=right?200-ZONE_COLUMN_WIDTH:ZONE_COLUMN_INSET,end=right?200-ZONE_COLUMN_INSET:ZONE_COLUMN_WIDTH;
  int h=clock24?hour:(hour%12?hour%12:12);
  unsigned hh=(unsigned)h%100,mm=(unsigned)minute%60;
  row->time[0]='0'+hh/10;row->time[1]='0'+hh%10;row->time[2]=':';row->time[3]='0'+mm/10;row->time[4]='0'+mm%10;row->time[5]=0;
  snprintf(row->suffix,sizeof(row->suffix),"%s",clock24?"":hour<12?"A":"P");
  if(stale)snprintf(row->day,sizeof(row->day),"?");
  else if(delta)snprintf(row->day,sizeof(row->day),"%+d",delta>9?9:delta<-9?-9:delta);
  else row->day[0]=0;
  row->suffix_x=end-(clock24?0:measure("P",font));
  row->time_x=row->suffix_x-measure(row->time,font);
  int room=row->time_x-ZONE_COLUMN_GAP-x-(row->day[0]?measure(row->day,font)+1:0);
  size_t n=0;
  for(;n<7&&label[n];n++)row->label[n]=(label[n]>='a'&&label[n]<='z')?label[n]-'a'+'A':label[n];
  row->label[n]=0;
  while(n&&measure(row->label,font)>room)row->label[--n]=0;
  row->label_x=x;row->day_x=x+measure(row->label,font)+1;
}
