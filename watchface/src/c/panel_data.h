#pragma once
#include <stdbool.h>
#include <stdint.h>
#define FOOTER_SIZE 64
#define WEATHER_SIZE 424
#define TIDE_SIZE 244
#define PANEL_COUNT 6
enum { PANEL_ZONES,PANEL_WEATHER,PANEL_CALENDAR,PANEL_HUMIDITY,PANEL_TIDE,PANEL_HEALTH };
enum { F_RAIN_MAX=43,F_TIDE_FIXED=45,F_TIDE_MIN=46,F_TIDE_MAX=48 };
#define HOLIDAY_REGION_COUNT 8
enum { F_ENABLED=1,F_COUNT=2,F_HOME=3,F_ORDER=4,F_ROTATE=9,F_HORIZON=10,F_FAHRENHEIT=11,F_RAIN=12,F_DAYLIGHT=13,F_GRID=14,F_SOLAR=15,F_WEEK_START=16,F_PREVIOUS=17,F_WEEKENDS=18,F_HOLIDAYS=19,F_TODAY_OUTLINE=20,F_TEMP_COLOR=21,F_RAIN_COLOR=22,F_HUMID_COLOR=23,F_TIDE_COLOR=24,F_SAT_COLOR=25,F_SUN_COLOR=26,F_HOLIDAY_COLOR=27,F_TODAY_COLOR=28,F_TEMP_FIXED=29,F_HUMID_AUTO=30,F_TEMP_MIN=31,F_TEMP_MAX=33,F_RAIN_INCH=35,F_TIDE_FEET=36,F_REFRESH=37,F_WEATHER_ON=38,F_RANGE_LABELS=39,F_TIDE_ZERO=40,F_TIDE_ON=41,F_SHAKE=42,F_WEATHER_PLACE=50,F_HUMID_LINE=51,F_FLICKS=52 };
bool footer_valid(const uint8_t *p,unsigned length);
bool environment_valid(const uint8_t *p,unsigned length,bool tide);
int environment_start_index(const uint8_t *p,uint32_t now);
typedef struct {int year,month,day,weekday;bool today,holiday,weekend;} CalendarCell;
void panel_calendar(int year,int month,int day,int weekday,const uint8_t *config,CalendarCell out[14]);
enum { PANEL_GESTURE_LIT=4 };
// Byte F_ROTATE: minutes between pages, or ROTATE_SMART (smart_tray.h).
#define ROTATE_SMART 255
// Motion events change panels. A flick can raise a tap on several axes, so taps
// closer than TAP_SAME_MS are one flick; `required` flicks (1-3), each within
// TAP_GAP_MS of the last, change the page, then TAP_REST_MS passes before the
// next count. One flick alone is also the watch's motion-backlight gesture.
#define TAP_SAME_MS 250
#define TAP_GAP_MS 2000
#define TAP_REST_MS 1000
typedef struct {uint64_t last,rest;uint8_t count;} TapState;
bool panel_tap(TapState *state,uint64_t now_ms,int required);
// Ignore the motion which woke the backlight, including events delivered before
// its on-callback. No timer or sampling loop is needed to arm the next gesture.
#define PANEL_LIGHT_SETTLE_MS 400
typedef struct {uint64_t since;bool on;} PanelLightState;
void panel_light_update(PanelLightState *state,bool on,uint64_t now_ms);
bool panel_light_ready(PanelLightState *state,bool on,uint64_t now_ms);
