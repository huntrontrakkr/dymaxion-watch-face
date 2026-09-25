#include <stdio.h>
#include <stdlib.h>
#include "power.h"
// power-test bits start end low : for every hour and minute of the day, prints
// night / relight(day&night on) / minute animation / flourishes / dark pause.
int main(int argc,char **argv){
  if(argc<5)return 1;
  uint8_t p[4]={(uint8_t)atoi(argv[1]),(uint8_t)atoi(argv[2]),(uint8_t)atoi(argv[3]),(uint8_t)atoi(argv[4])};
  for(int h=0;h<24;h++){
    printf("%d%d%d%d%d%d:",power_night(p,h),power_minute_animation(p,true,h),power_minute_animation(p,false,h),power_flourishes(p,true,h),power_dark_paused(p,h),power_daylight_minutes(p,h));
    for(int m=0;m<60;m++)printf("%d",power_relight(p,true,h,m)+2*power_relight(p,false,h,m));
    printf("\n");
  }
  for(int b=0;b<=100;b++)printf("%d",power_battery_allows_motion(p,b));
  printf("\n");
  return 0;
}
