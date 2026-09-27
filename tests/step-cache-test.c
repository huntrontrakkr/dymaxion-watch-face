#include <assert.h>
#include <stdio.h>
#include "step_cache.h"
typedef struct {int calls[3],available,steps,typical;} Data;
static int read_steps(void *context,StepQuery query){Data *d=context;d->calls[query]++;return query==STEP_ACCESSIBLE?d->available:query==STEP_TODAY?d->steps:d->typical;}
int main(void){
  Data d={{0},1,3000,12000};StepCache c={0};
  for(int i=0;i<100;i++)assert(step_cache_width(&c,500,10,read_steps,&d)==50);
  assert(d.calls[0]==1&&d.calls[1]==1&&d.calls[2]==1);
  d.steps=6000;assert(step_cache_width(&c,501,10,read_steps,&d)==100);
  assert(d.calls[1]==2&&d.calls[2]==1);
  d.typical=10000;assert(step_cache_width(&c,502,11,read_steps,&d)==120);assert(d.calls[2]==2);
  d.available=0;assert(step_cache_width(&c,503,11,read_steps,&d)==0);assert(d.calls[1]==3&&d.calls[2]==2);
  d.available=1;d.typical=0;assert(step_cache_width(&c,504,11,read_steps,&d)==120);assert(d.calls[2]==3);
  d.steps=15000;assert(step_cache_width(&c,499,11,read_steps,&d)==200);assert(d.calls[2]==3);
  // A timezone/day change refreshes even within the same absolute minute.
  d.typical=30000;assert(step_cache_width(&c,499,12,read_steps,&d)==100);assert(d.calls[2]==4);
  d.steps=-1;assert(step_cache_width(&c,500,12,read_steps,&d)==0);
  puts("Step cache: repeat paints, minute/day changes, permissions and backward time passed.");
}
