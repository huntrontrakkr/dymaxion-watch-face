#include "zone_column.h"
#include <stdio.h>
#include <string.h>
bool zone_column_fits(uint8_t style){return style>=4&&style<=9;}
static bool elsewhere(uint8_t zone_times,bool panel_shows_zones){return zone_times==ZONE_TIMES_ALWAYS||(zone_times==ZONE_TIMES_WHEN_HIDDEN&&!panel_shows_zones);}
bool zones_beside(uint8_t style,uint8_t zone_times,uint8_t position,bool panel_shows_zones){
  if(position==ZONE_POSITION_MAP||!zone_column_fits(style))return false;
  return elsewhere(zone_times,panel_shows_zones);
}
bool zones_on_map(uint8_t zone_times,uint8_t position,bool panel_shows_zones){return position==ZONE_POSITION_MAP&&elsewhere(zone_times,panel_shows_zones);}
// Rows 14 pixels apart, centred on the figures (y 2-37 of the strip); tall
// rows 13 apart, centred in y 2-38.
int zone_row_baseline(int index,int count,bool tall){
  int pitch=tall?13:14,glyph=tall?ZONE_TALL_HEIGHT:7,block=glyph+pitch*(count-1);
  return 2+((tall?36:35)-block)/2+index*pitch+glyph;
}
// Tall figures, one byte per row, bit 5 the leftmost column (shared/zone-column.js).
static const uint8_t TALL[10][ZONE_TALL_HEIGHT]={
  {0x1e,0x21,0x21,0x21,0x21,0x21,0x21,0x21,0x21,0x1e},
  {0x04,0x0c,0x14,0x04,0x04,0x04,0x04,0x04,0x04,0x0e},
  {0x1e,0x21,0x01,0x01,0x02,0x04,0x08,0x10,0x20,0x3f},
  {0x3e,0x01,0x01,0x01,0x1e,0x01,0x01,0x01,0x01,0x3e},
  {0x02,0x06,0x0a,0x12,0x22,0x22,0x3f,0x02,0x02,0x02},
  {0x3f,0x20,0x20,0x20,0x3e,0x01,0x01,0x01,0x01,0x3e},
  {0x1e,0x20,0x20,0x20,0x3e,0x21,0x21,0x21,0x21,0x1e},
  {0x3f,0x01,0x01,0x02,0x02,0x04,0x04,0x08,0x08,0x08},
  {0x1e,0x21,0x21,0x21,0x1e,0x21,0x21,0x21,0x21,0x1e},
  {0x1e,0x21,0x21,0x21,0x21,0x1f,0x01,0x01,0x01,0x1e}};
int zone_tall_width(const char *text){int w=0;for(;*text;text++)w+=*text==':'?2:7;return w;}
int zone_tall_draw(const char *text,int x,int baseline,ZoneTallPlot plot,void *context){
  int start=x;
  for(;*text;text++){
    if(*text==':'){plot(x,baseline-8,context);plot(x,baseline-3,context);x+=2;continue;}
    if(*text>='0'&&*text<='9')for(int y=0;y<ZONE_TALL_HEIGHT;y++)for(int b=0;b<6;b++)if(TALL[*text-'0'][y]&(32>>b))plot(x+b,baseline-ZONE_TALL_HEIGHT+y,context);
    x+=7;
  }
  return x-start;
}
// The label with its day offset right after it; time and A/P in fixed slots
// flush right, so the times line up in one column.
// Tall rows drop the pixel after A/P at the edge, a pixel of the gap before
// the time and the extra pixel between label and day offset.
void zone_row(ZoneRow *row,const char *label,int hour,int minute,bool clock24,int delta,bool stale,bool right,bool tall,ZoneMeasure measure,const void *font){
  int x=right?200-ZONE_COLUMN_WIDTH:ZONE_COLUMN_INSET,end=right?200-ZONE_COLUMN_INSET:ZONE_COLUMN_WIDTH;
  int h=clock24?hour:(hour%12?hour%12:12);
  unsigned hh=(unsigned)h%100,mm=(unsigned)minute%60;
  row->time[0]='0'+hh/10;row->time[1]='0'+hh%10;row->time[2]=':';row->time[3]='0'+mm/10;row->time[4]='0'+mm%10;row->time[5]=0;
  snprintf(row->suffix,sizeof(row->suffix),"%s",clock24?"":hour<12?"A":"P");
  if(stale)snprintf(row->day,sizeof(row->day),"?");
  else if(delta)snprintf(row->day,sizeof(row->day),"%+d",delta>9?9:delta<-9?-9:delta);
  else row->day[0]=0;
  int trim=tall?1:0;
  row->suffix_x=end-(clock24?0:measure("P",font)-trim);
  row->time_x=row->suffix_x-(tall?zone_tall_width(row->time):measure(row->time,font));
  int room=row->time_x-ZONE_COLUMN_GAP+trim-x-(row->day[0]?measure(row->day,font)+1-trim:0);
  size_t n=0;
  for(;n<7&&label[n];n++)row->label[n]=(label[n]>='a'&&label[n]<='z')?label[n]-'a'+'A':label[n];
  row->label[n]=0;
  while(n&&measure(row->label,font)>room)row->label[--n]=0;
  row->label_x=x;row->day_x=x+measure(row->label,font)+1-trim;
}
