#pragma once
#include <stdbool.h>
#include <stdint.h>
#define FOOTER_SIZE 64
#define WEATHER_SIZE 424
#define TIDE_SIZE 244
#define PANEL_COUNT 5
enum { PANEL_ZONES,PANEL_WEATHER,PANEL_CALENDAR,PANEL_HUMIDITY,PANEL_TIDE };
enum { F_RAIN_MAX=43,F_TIDE_FIXED=45,F_TIDE_MIN=46,F_TIDE_MAX=48 };
#define HOLIDAY_REGION_COUNT 8
enum { F_ENABLED=1,F_COUNT=2,F_HOME=3,F_ORDER=4,F_ROTATE=9,F_HORIZON=10,F_FAHRENHEIT=11,F_RAIN=12,F_DAYLIGHT=13,F_GRID=14,F_SOLAR=15,F_WEEK_START=16,F_PREVIOUS=17,F_WEEKENDS=18,F_HOLIDAYS=19,F_TODAY_OUTLINE=20,F_TEMP_COLOR=21,F_RAIN_COLOR=22,F_HUMID_COLOR=23,F_TIDE_COLOR=24,F_SAT_COLOR=25,F_SUN_COLOR=26,F_HOLIDAY_COLOR=27,F_TODAY_COLOR=28,F_TEMP_FIXED=29,F_HUMID_AUTO=30,F_TEMP_MIN=31,F_TEMP_MAX=33,F_RAIN_INCH=35,F_TIDE_FEET=36,F_REFRESH=37,F_WEATHER_ON=38,F_RANGE_LABELS=39,F_TIDE_ZERO=40,F_TIDE_ON=41,F_SHAKE=42,F_WEATHER_PLACE=50,F_HUMID_LINE=51 };
bool footer_valid(const uint8_t *p,unsigned length);
bool environment_valid(const uint8_t *p,unsigned length,bool tide);
int environment_start_index(const uint8_t *p,uint32_t now);
typedef struct {int year,month,day,weekday;bool today,holiday,weekend;} CalendarCell;
void panel_calendar(int year,int month,int day,int weekday,const uint8_t *config,CalendarCell out[14]);
// One wrist flick can raise several tap events (one per axis); a short guard
// keeps a single flick to a single panel change.
#define TAP_GUARD_MS 1500
typedef struct {uint64_t cooldown;} TapState;
bool panel_tap(TapState *state,uint64_t now_ms);
