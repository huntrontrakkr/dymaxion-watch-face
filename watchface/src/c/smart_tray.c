#include "smart_tray.h"
#include <stdbool.h>
#include "panel_data.h"
#define RAIN_LIKELY 50
#define TIDE_SOON 45
#define WALKING 600
static bool has(const SmartInputs *in,int page){for(int i=0;i<in->count;i++)if(in->pages[i]==page)return true;return false;}
int smart_page(const SmartInputs *in){
  if(has(in,PANEL_WEATHER)&&in->rain_peak>=RAIN_LIKELY)return PANEL_WEATHER;
  if(has(in,PANEL_TIDE)&&in->tide_minutes>=0&&in->tide_minutes<=TIDE_SOON)return PANEL_TIDE;
  if(has(in,PANEL_HEALTH)&&in->recent_steps>=WALKING)return PANEL_HEALTH;
  if(in->hour>=6&&in->hour<9){if(has(in,PANEL_CALENDAR))return PANEL_CALENDAR;if(has(in,PANEL_WEATHER))return PANEL_WEATHER;}
  return in->home;
}
