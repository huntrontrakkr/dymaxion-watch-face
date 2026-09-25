#pragma once
#include <stdbool.h>
#include <stdint.h>
// Power and motion (shared/power.js), from DISPLAY bytes 4-6: bits 0-1 of
// byte 4 pick the daylight interval, bit 2 turns the minute animation off,
// bit 3 the pulse and swipes, bit 4 is the night saver's hours, bit 5 pauses
// redraws in the dark, bit 6 makes the watch's Quiet Time night too; bytes 5 and 6 are the night's first hour and its end; byte 7
// is the low-battery level (5, 10, 20 or 30%).
#define POWER_MINUTE_OFF 4
#define POWER_FLOURISHES_OFF 8
#define POWER_NIGHT 16
#define POWER_DARK_PAUSE 32
#define POWER_QUIET_TIME 64
#define NIGHT_DAYLIGHT_MINUTES 120
// quiet: whether the watch's Quiet Time is on now.
bool power_night(const uint8_t *power,int hour,bool quiet);
int power_daylight_minutes(const uint8_t *power,int hour,bool quiet);
bool power_relight(const uint8_t *power,bool day_night,int hour,int minute,bool quiet);
bool power_minute_animation(const uint8_t *power,bool motion,int hour,bool quiet);
bool power_flourishes(const uint8_t *power,bool motion,int hour,bool quiet);
// In the dark the minute tick redraws only while the backlight is on.
bool power_dark_paused(const uint8_t *power,int hour,bool quiet);
// Byte 7 (power[3]): animations stop at or below this battery percentage.
bool power_battery_allows_motion(const uint8_t *power,int percent);
