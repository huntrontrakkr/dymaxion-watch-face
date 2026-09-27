#include "step_cache.h"
int step_cache_width(StepCache *c,int32_t minute,int32_t day,StepRead read,void *context){
  if(c->valid&&c->minute==minute&&c->day==day)return c->width;
  if(c->day!=day)c->typical_valid=false;
  c->minute=minute;c->day=day;c->valid=true;c->width=0;
  if(!read(context,STEP_ACCESSIBLE)){c->typical_valid=false;return 0;}
  if(!c->typical_valid){c->typical=read(context,STEP_TYPICAL);c->typical_valid=true;}
  int steps=read(context,STEP_TODAY);
  if(steps>0){int64_t width=(int64_t)steps*200/(c->typical>0?c->typical:10000);c->width=width>200?200:(int)width;}
  return c->width;
}
