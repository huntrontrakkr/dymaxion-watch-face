#include <stdio.h>
#include "solar.h"
// Reads "epoch lat10 lon10" lines; prints "up next rise" for each.
int main(void){
  unsigned long epoch;int lat,lon;
  while(scanf("%lu %d %d",&epoch,&lat,&lon)==3){
    float place[3];solar_place(lat,lon,place);bool rise=false;
    uint32_t next=solar_next_event((uint32_t)epoch,place,48,&rise);
    printf("%d %lu %d\n",solar_up((uint32_t)epoch,place),(unsigned long)next,rise);
  }
  return 0;
}
