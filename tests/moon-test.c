#include <stdint.h>
#include <stdio.h>
#include "solar.h"
int main(void){
  uint32_t epoch;while(scanf("%u",&epoch)==1){
    float d[3];lunar_direction(epoch,d);printf("%.9f %.9f %.9f\n",d[0],d[1],d[2]);
  }
  return 0;
}
