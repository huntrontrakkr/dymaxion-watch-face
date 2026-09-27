#pragma once
#include <stdbool.h>
#include <stdint.h>
typedef enum { STEP_ACCESSIBLE, STEP_TODAY, STEP_TYPICAL } StepQuery;
typedef int (*StepRead)(void *context,StepQuery query);
typedef struct {int32_t minute,day;int width,typical;bool valid,typical_valid;} StepCache;
// Availability is checked each minute; loss of permission discards the daily
// baseline as well, so granting permission within the same day refreshes it.
int step_cache_width(StepCache *cache,int32_t minute,int32_t day,StepRead read,void *context);
