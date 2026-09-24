#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "panel_data.h"
#include "settings.h"
static void read_file(const char *path,uint8_t *p,size_t n){FILE *f=fopen(path,"rb");assert(f);assert(fread(p,1,n,f)==n);fclose(f);}
int main(int argc,char **argv){
  if(argc==3&&strcmp(argv[1],"extremes")==0){
    uint8_t t[TIDE_SIZE];read_file(argv[2],t,sizeof(t));uint32_t times[16];bool high[16];
    int n=tide_extremes(t,times,high,16);for(int i=0;i<n;i++)printf("%u %d\n",(unsigned)times[i],high[i]);
    return 0;
  }
  if(argc==5&&strcmp(argv[1],"holidays")==0){
    // Every holiday of a region from 1 January of the first year to the end of
    // the last, read through 14-day calendar windows that start on the day.
    uint8_t config[FOOTER_SIZE]={0};config[F_HOLIDAYS]=atoi(argv[2]);
    int year=atoi(argv[3]),last=atoi(argv[4]),month=1,day=1,weekday=(calendar_ordinal(year,1,1)+1)%7;
    while(year<=last){
      config[F_WEEK_START]=weekday;CalendarCell days[14];panel_calendar(year,month,day,weekday,config,days);
      for(int i=0;i<14;i++)if(days[i].holiday&&days[i].year<=last)printf("%04d-%02d-%02d\n",days[i].year,days[i].month,days[i].day);
      year=days[13].year;month=days[13].month;day=days[13].day;weekday=days[13].weekday;
      // advance one day past the window's end
      config[F_WEEK_START]=weekday;panel_calendar(year,month,day,weekday,config,days);
      year=days[1].year;month=days[1].month;day=days[1].day;weekday=days[1].weekday;
    }
    return 0;
  }
  if(argc==9&&strcmp(argv[1],"calendar")==0){
    uint8_t config[FOOTER_SIZE]={0};config[F_WEEK_START]=atoi(argv[6]);config[F_PREVIOUS]=atoi(argv[7]);config[F_HOLIDAYS]=atoi(argv[8]);
    CalendarCell days[14];panel_calendar(atoi(argv[2]),atoi(argv[3]),atoi(argv[4]),atoi(argv[5]),config,days);
    for(int i=0;i<14;i++)printf("%d,%d,%d,%d,%d,%d\n",days[i].year,days[i].month,days[i].day,days[i].weekday,days[i].today,days[i].holiday);
    return 0;
  }
  assert(argc==4);uint8_t f[FOOTER_SIZE],w[WEATHER_SIZE],t[TIDE_SIZE],copy[WEATHER_SIZE];
  read_file(argv[1],f,sizeof(f));read_file(argv[2],w,sizeof(w));read_file(argv[3],t,sizeof(t));
  assert(footer_valid(f,sizeof(f)));assert(environment_valid(w,sizeof(w),false));assert(environment_valid(t,sizeof(t),true));
  assert(!footer_valid(f,sizeof(f)-1));assert(!environment_valid(w,sizeof(w)-1,false));assert(!environment_valid(t,sizeof(t)-1,true));
  memcpy(copy,f,sizeof(f));copy[F_ORDER+1]=copy[F_ORDER];assert(!footer_valid(copy,sizeof(f)));
  memcpy(copy,f,sizeof(f));copy[F_SHAKE]=2;assert(!footer_valid(copy,sizeof(f)));
  memcpy(copy,f,sizeof(f));copy[F_RAIN_MAX]=copy[F_RAIN_MAX+1]=0;assert(!footer_valid(copy,sizeof(f)));
  memcpy(copy,w,sizeof(w));copy[32+2]=101;assert(!environment_valid(copy,sizeof(w),false));
  memcpy(copy,w,sizeof(w));copy[1]=50;assert(!environment_valid(copy,sizeof(w),false));
  memcpy(copy,t,sizeof(t));copy[48+2]=24;assert(!environment_valid(copy,sizeof(t),true));
  memcpy(copy,t,sizeof(t));copy[48]=0xff;copy[49]=0x7f;assert(!environment_valid(copy,sizeof(t),true));
  assert(environment_start_index(w,0)==-1);assert(environment_start_index(w,0xffffffff)==-1);
  ShakeState shake={0};uint64_t ms=10000;
  assert(!panel_shake(&shake,0,0,1000,ms,false));
  // Normal wrist movement, a single impact, and vibration do not cycle.
  for(int i=0;i<50;i++)assert(!panel_shake(&shake,(i%2?400:-400),0,1000,ms+=100,false));
  assert(!panel_shake(&shake,2400,0,1000,ms+=100,false));
  for(int i=0;i<20;i++)assert(!panel_shake(&shake,0,0,1000,ms+=100,false));
  for(int i=0;i<8;i++)assert(!panel_shake(&shake,(i%2?2400:-2400),0,1000,ms+=100,true));
  for(int i=0;i<20;i++)assert(!panel_shake(&shake,0,0,1000,ms+=100,false));
  assert(!panel_shake(&shake,2400,0,1000,ms+=100,false));
  assert(!panel_shake(&shake,-2400,0,1000,ms+=100,false));
  assert(panel_shake(&shake,2400,0,1000,ms+=100,false));
  for(int i=0;i<20;i++)assert(!panel_shake(&shake,(i%2?2400:-2400),0,1000,ms+=100,false));
  puts("Native panel packets and shake rejection cases passed.");return 0;
}
