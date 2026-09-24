#include "power.h"
static const uint8_t DAYLIGHT_MINUTES[4]={5,10,15,30};
bool power_night(const uint8_t *p,int hour){
  if(!(p[0]&POWER_NIGHT))return false;
  int s=p[1],e=p[2];
  return s==e?true:s<e?hour>=s&&hour<e:hour>=s||hour<e;
}
int power_daylight_minutes(const uint8_t *p,int hour){return power_night(p,hour)?NIGHT_DAYLIGHT_MINUTES:DAYLIGHT_MINUTES[p[0]&3];}
bool power_relight(const uint8_t *p,bool day_night,int hour,int minute){return day_night&&(hour*60+minute)%power_daylight_minutes(p,hour)==0;}
bool power_minute_animation(const uint8_t *p,bool motion,int hour){return motion&&!(p[0]&POWER_MINUTE_OFF)&&!power_night(p,hour);}
bool power_flourishes(const uint8_t *p,bool motion,int hour){return motion&&!(p[0]&POWER_FLOURISHES_OFF)&&!power_night(p,hour);}
bool power_dark_paused(const uint8_t *p,int hour){return (p[0]&POWER_DARK_PAUSE)&&power_night(p,hour);}
