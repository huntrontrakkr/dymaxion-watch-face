#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "chart_axis.h"
// The Health drawer (shared/health.js): today's steps per hour as bars, the
// heart rate as a line and a typical day for this weekday dotted behind them.
#define HEALTH_HOURS 24
typedef struct { uint16_t steps[HEALTH_HOURS],typical[HEALTH_HOURS]; uint8_t heart[HEALTH_HOURS]; int hour,minute,heart_now; } HealthDay;
typedef struct {
  ChartLayout layout; int scale,lo,hi,bar_count;
  int bar_x[HEALTH_HOURS],bar_y[HEALTH_HOURS],bar_w[HEALTH_HOURS],bar_h[HEALTH_HOURS];
  int usual[HEALTH_HOURS],pulse[HEALTH_HOURS]; // y per hour; pulse -1 without a reading
  char upper[12],lower[12],title[40],right[24];
} HealthView;
int health_step_scale(int max);
void health_view(const HealthDay *day,bool range_labels,int hour_width,HealthView *view);
