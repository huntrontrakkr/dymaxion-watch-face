#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "panel_data.h"
static void read_file(const char *path,uint8_t *p,size_t n){FILE *f=fopen(path,"rb");assert(f);assert(fread(p,1,n,f)==n);fclose(f);}
int main(int argc,char **argv){
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
