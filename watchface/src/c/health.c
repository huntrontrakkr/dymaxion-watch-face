#include "health.h"
#include <stdio.h>
static const int SCALES[]={500,1000,1500,2000,3000,4000,5000,6000,8000,10000};
int health_step_scale(int max){
  for(unsigned i=0;i<sizeof(SCALES)/sizeof(SCALES[0]);i++)if(max<=SCALES[i])return SCALES[i];
  return (max+4999)/5000*5000;
}
static int round_div(int a,int b){return a>=0?(a+b/2)/b:-((-a+b/2)/b);}
static int imin(int a,int b){return a<b?a:b;}
static int imax(int a,int b){return a>b?a:b;}
void health_view(const HealthDay *h,bool range_labels,int hour_width,HealthView *v){
  int total=0,typical=0,busiest=100,lo=0,hi=0;
  for(int i=0;i<=h->hour;i++)total+=h->steps[i];
  for(int i=0;i<h->hour;i++)typical+=h->typical[i];
  typical+=h->typical[h->hour]*h->minute/60;
  for(int i=0;i<HEALTH_HOURS;i++)busiest=imax(busiest,imax(h->typical[i],i<=h->hour?h->steps[i]:0));
  for(int i=0;i<=h->hour;i++)if(h->heart[i]>0){lo=lo?imin(lo,h->heart[i]):h->heart[i];hi=imax(hi,h->heart[i]);}
  int scale=health_step_scale(busiest);bool heart=hi>0;
  if(heart){int pad=imax(5,(hi-lo)/8);lo-=pad;hi+=pad;}
  if(heart){snprintf(v->upper,sizeof(v->upper),"%d",hi);snprintf(v->lower,sizeof(v->lower),"%d",lo);}
  else{snprintf(v->upper,sizeof(v->upper),"%d",scale);snprintf(v->lower,sizeof(v->lower),"0");}
  ChartLayout l=chart_layout(v->upper,v->lower,HEALTH_HOURS,range_labels,hour_width);
  int plot=l.bottom-l.top+1;
  v->layout=l;v->scale=scale;v->lo=lo;v->hi=hi;v->bar_count=h->hour+1;
  for(int i=0;i<=h->hour;i++){
    int x=chart_x(l,i),height=imin(plot,h->steps[i]*plot/scale);
    v->bar_x[i]=x;v->bar_y[i]=l.bottom+1-height;v->bar_h[i]=height;
    v->bar_w[i]=imin(imin(3,imax(1,chart_x(l,imin(i+1,HEALTH_HOURS-1))-x-1)),l.right-x+1);
  }
  for(int i=0;i<HEALTH_HOURS;i++){
    v->usual[i]=chart_y(h->typical[i],0,scale);
    v->pulse[i]=i<=h->hour&&h->heart[i]>0?chart_y(h->heart[i],lo,hi):-1;
  }
  if(h->heart_now>0)snprintf(v->title,sizeof(v->title),"STEPS %d HR %d",total,h->heart_now);
  else snprintf(v->title,sizeof(v->title),"STEPS %d",total);
  if(typical>0){int d=round_div((total-typical)*100,typical);snprintf(v->right,sizeof(v->right),"TYPICAL %s%d%%",d>0?"+":"",d);}
  else v->right[0]=0;
}
