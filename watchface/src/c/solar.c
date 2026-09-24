#include "solar.h"
// Portable single-precision trig, so host tests run the same code as the watch.
#define PI 3.14159265f
#define SUNRISE_SINE -0.014538f /* sin(-0.833 degrees): refraction plus the solar radius */
static float solar_sin(float r){
  while(r>PI)r-=2*PI;
  while(r< -PI)r+=2*PI;
  if(r>PI/2)r=PI-r;else if(r< -PI/2)r=-PI-r;
  float q=r*r;return r*(1-q/6*(1-q/20*(1-q/42*(1-q/72*(1-q/110)))));
}
static float solar_cos(float r){return solar_sin(r+PI/2);}
static float solar_sqrt(float v){if(v<=0)return 0;float x=v>1?v:1;for(int i=0;i<20;i++)x=.5f*(x+v/x);return x;}
void solar_place(int lat10,int lon10,float out[3]){
  float la=lat10*PI/1800,lo=lon10*PI/1800;
  out[0]=solar_cos(la)*solar_cos(lo);out[1]=solar_cos(la)*solar_sin(lo);out[2]=solar_sin(la);
}
void solar_place_vector(const int8_t v[3],float out[3]){
  float n=solar_sqrt((float)(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]));
  for(int i=0;i<3;i++)out[i]=n>0?v[i]/n:0;
}
// NOAA fractional-year approximation, as sunDirection() in shared/solar.js.
void solar_direction(uint32_t epoch,float out[3]){
  int32_t day=(int32_t)(epoch/86400);int year=1970;
  for(;;){int length=365+(year%4==0&&(year%100!=0||year%400==0));if(day<length)break;day-=length;year++;}
  int days=365+(year%4==0&&(year%100!=0||year%400==0));
  float minutes=(float)(epoch%86400)/60;
  float g=2*PI/days*(day+(minutes/60-12)/24);
  float eq=229.18f*(.000075f+.001868f*solar_cos(g)-.032077f*solar_sin(g)-.014615f*solar_cos(2*g)-.040849f*solar_sin(2*g));
  float dec=.006918f-.399912f*solar_cos(g)+.070257f*solar_sin(g)-.006758f*solar_cos(2*g)+.000907f*solar_sin(2*g)-.002697f*solar_cos(3*g)+.00148f*solar_sin(3*g);
  float lon=(720-minutes-eq)*PI/720;
  out[0]=solar_cos(dec)*solar_cos(lon);out[1]=solar_cos(dec)*solar_sin(lon);out[2]=solar_sin(dec);
}
bool solar_up(uint32_t epoch,const float place[3]){
  float s[3];solar_direction(epoch,s);
  return s[0]*place[0]+s[1]*place[1]+s[2]*place[2]>=SUNRISE_SINE;
}
uint32_t solar_next_event(uint32_t now,const float place[3],int hours,bool *rise){
  bool up=solar_up(now,place);
  for(uint32_t t=now+600;t<=now+(uint32_t)hours*3600;t+=600){
    if(solar_up(t,place)==up)continue;
    uint32_t lo=t-600,hi=t;
    while(hi-lo>30){uint32_t mid=lo+(hi-lo)/2;if(solar_up(mid,place)==up)lo=mid;else hi=mid;}
    *rise=!up;return hi;
  }
  return 0;
}
