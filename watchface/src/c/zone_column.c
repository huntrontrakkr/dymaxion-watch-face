#include "zone_column.h"
#include <stdio.h>
#include <string.h>
bool zone_column_fits(uint8_t style){return style>=4&&style<=9;}
bool zones_beside(uint8_t style,bool stacked,uint8_t zone_times,bool panel_shows_zones){
  if(stacked||!zone_column_fits(style))return false;
  return zone_times==ZONE_TIMES_BESIDE||(zone_times==ZONE_TIMES_BESIDE_HIDDEN&&!panel_shows_zones);
}
// Rows 14 pixels apart, centred on the figures (y 2-37 of the strip).
int zone_row_baseline(int index,int count){
  int block=7+14*(count-1);
  return 2+(35-block)/2+index*14+7;
}
void zone_row(ZoneRow *row,const char *label,int hour,int minute,bool clock24,int delta,bool stale,ZoneMeasure measure,const void *font){
  int h=clock24?hour:(hour%12?hour%12:12);
  unsigned hh=(unsigned)h%100,mm=(unsigned)minute%60;
  row->time[0]='0'+hh/10;row->time[1]='0'+hh%10;row->time[2]=':';row->time[3]='0'+mm/10;row->time[4]='0'+mm%10;row->time[5]=0;
  snprintf(row->suffix,sizeof(row->suffix),"%s",clock24?"":hour<12?"A":"P");
  if(stale)snprintf(row->day,sizeof(row->day),"?");
  else if(delta)snprintf(row->day,sizeof(row->day),"%+d",delta>9?9:delta<-9?-9:delta);
  else row->day[0]=0;
  // Fixed slots for the day offset and A/P keep the times in one column.
  row->day_x=ZONE_COLUMN_RIGHT-measure(row->day,font);
  int group_end=ZONE_COLUMN_RIGHT-measure("+1",font)-2;
  row->suffix_x=group_end-(clock24?0:measure("P",font));
  row->time_x=row->suffix_x-measure(row->time,font);
  size_t n=0;
  for(;n<7&&label[n];n++)row->label[n]=(label[n]>='a'&&label[n]<='z')?label[n]-'a'+'A':label[n];
  row->label[n]=0;
  while(n&&measure(row->label,font)>row->time_x-3-ZONE_COLUMN_X)row->label[--n]=0;
  row->label_x=ZONE_COLUMN_X;
}
