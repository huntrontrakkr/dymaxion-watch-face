#pragma once
#include <stdbool.h>
#include <stdint.h>
// Power and motion (shared/power.js), from DISPLAY bytes 4-6: bits 0-1 of
// byte 4 pick the daylight interval, bit 2 turns the minute animation off,
// bit 3 the pulse and swipes, bit 4 is the night saver, bit 5 pauses redraws
// in the dark; bytes 5 and 6 are the night's first hour and its end.
#define POWER_MINUTE_OFF 4
#define POWER_FLOURISHES_OFF 8
#define POWER_NIGHT 16
#define POWER_DARK_PAUSE 32
#define NIGHT_DAYLIGHT_MINUTES 120
bool power_night(const uint8_t *power,int hour);
int power_daylight_minutes(const uint8_t *power,int hour);
bool power_relight(const uint8_t *power,bool day_night,int hour,int minute);
bool power_minute_animation(const uint8_t *power,bool motion,int hour);
bool power_flourishes(const uint8_t *power,bool motion,int hour);
bool power_dark_paused(const uint8_t *power,int hour);
