#pragma once
#include <stdint.h>
// Smart rotation (shared/smart-tray.js): the page that matters now. Page ids
// as in panel_data.h; -1 for any unknown input.
#define SMART_HOLD 600
#define SMART_HOURS 3
typedef struct { const uint8_t *pages; int count,home,hour,rain_peak,tide_minutes,recent_steps; } SmartInputs;
int smart_page(const SmartInputs *in);
