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
// Degrees into [0,360).
static float solar_reduce(float degrees){int turns=(int)(degrees/360);if(degrees<0)turns--;return degrees-360.0f*turns;}
// The Astronomical Almanac's low-precision solar coordinates, as sunDirection()
// in shared/solar.js: whole days and seconds since J2000.0 keep every angle
// within single precision.
#define J2000 946728000
void solar_direction(uint32_t epoch,float out[3]){
  int32_t s=(int32_t)(epoch-J2000),day=s/86400,second=s%86400;
  if(second<0){second+=86400;day--;}
  float n=day+second/86400.0f,rad=PI/180;
  float g=solar_reduce(357.528f+0.9856003f*n)*rad,L=solar_reduce(280.460f+0.9856474f*n);
  float lambda=(L+1.915f*solar_sin(g)+0.020f*solar_sin(2*g))*rad,tilt=(23.439f-0.0000004f*n)*rad;
  float theta=solar_reduce(280.46061837f+solar_reduce(0.98564736629f*day)+0.98564736629f*second/86400+second/240.0f)*rad;
  float X=solar_cos(lambda),Y=solar_cos(tilt)*solar_sin(lambda),Z=solar_sin(tilt)*solar_sin(lambda);
  out[0]=X*solar_cos(theta)+Y*solar_sin(theta);out[1]=Y*solar_cos(theta)-X*solar_sin(theta);out[2]=Z;
}
bool solar_up(uint32_t epoch,const float place[3]){
  float s[3];solar_direction(epoch,s);
  return s[0]*place[0]+s[1]*place[1]+s[2]*place[2]>=SUNRISE_SINE;
}
static float lunar_sin_deg(float d){return solar_sin(solar_reduce(d)*(PI/180));}
static float lunar_cos_deg(float d){return lunar_sin_deg(d+90);}
void lunar_direction(uint32_t epoch,float out[3]){
  int32_t s=(int32_t)(epoch-J2000),day=s/86400,second=s%86400;
  if(second<0){second+=86400;day--;}
  float n=day+second/86400.0f;
  float L=solar_reduce(218.3164477f+13.17639648f*n),D=solar_reduce(297.8501921f+12.19074912f*n);
  float M=solar_reduce(134.9633964f+13.06499295f*n),S=solar_reduce(357.5291092f+.98560028f*n),F=solar_reduce(93.272095f+13.22935024f*n);
  float lon=L+6.289f*lunar_sin_deg(M)+1.274f*lunar_sin_deg(2*D-M)+.658f*lunar_sin_deg(2*D)+.214f*lunar_sin_deg(2*M)-.186f*lunar_sin_deg(S)-.114f*lunar_sin_deg(2*F);
  float lat=5.128f*lunar_sin_deg(F)+.280f*lunar_sin_deg(M+F)+.277f*lunar_sin_deg(M-F)+.173f*lunar_sin_deg(2*D-F)+.055f*lunar_sin_deg(2*D-M+F)+.046f*lunar_sin_deg(2*D-M-F)+.033f*lunar_sin_deg(2*D+F)+.017f*lunar_sin_deg(2*M+F);
  float tilt=23.439f-.0000004f*n,theta=solar_reduce(280.46061837f+solar_reduce(.98564736629f*day)+.98564736629f*second/86400+second/240.0f);
  float a=lunar_cos_deg(lat),b=lunar_sin_deg(lat),c=lunar_cos_deg(tilt),d=lunar_sin_deg(tilt),e=lunar_sin_deg(lon);
  float x=a*lunar_cos_deg(lon),y=a*e*c-b*d,z=a*e*d+b*c;
  out[0]=x*lunar_cos_deg(theta)+y*lunar_sin_deg(theta);out[1]=y*lunar_cos_deg(theta)-x*lunar_sin_deg(theta);out[2]=z;
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
