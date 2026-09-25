#include <stdio.h>
#include <stdlib.h>
#include "health.h"
// health-test range_labels hour_width hour minute heart_now then 24 steps, 24
// typical, 24 heart: prints the drawer's geometry and text.
int main(int argc,char **argv){
  if(argc<6+72)return 1;
  HealthDay d;int a=1;bool labels=atoi(argv[a++]);int width=atoi(argv[a++]);
  d.hour=atoi(argv[a++]);d.minute=atoi(argv[a++]);d.heart_now=atoi(argv[a++]);
  for(int i=0;i<24;i++)d.steps[i]=atoi(argv[a++]);
  for(int i=0;i<24;i++)d.typical[i]=atoi(argv[a++]);
  for(int i=0;i<24;i++)d.heart[i]=atoi(argv[a++]);
  HealthView v;health_view(&d,labels,width,&v);
  printf("%s|%s|%s|%s|%d %d %d %d %d\n",v.title,v.right,v.upper,v.lower,v.scale,v.lo,v.hi,v.layout.left,v.layout.step);
  for(int i=0;i<v.bar_count;i++)printf("%d,%d,%d,%d ",v.bar_x[i],v.bar_y[i],v.bar_w[i],v.bar_h[i]);
  printf("\n");
  for(int i=0;i<24;i++)printf("%d,%d ",v.usual[i],v.pulse[i]);
  printf("\n");
  return 0;
}
