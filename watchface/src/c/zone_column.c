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
