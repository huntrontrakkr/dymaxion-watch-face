#pragma once
#include <stdbool.h>
#include <stdint.h>
// Place times beside the clock (shared/zone-column.js): the clock shifts left
// and up to three places stack in a column on its right.
#define ZONE_COLUMN_SHIFT (-36)
#define ZONE_COLUMN_X 130
#define ZONE_COLUMN_RIGHT 200
// Display byte 2, bits 2-3.
enum {ZONE_TIMES_PANEL,ZONE_TIMES_BESIDE_HIDDEN,ZONE_TIMES_BESIDE,ZONE_TIMES_COUNT};
typedef struct {char label[8],time[6],suffix[2],day[4];int label_x,time_x,suffix_x,day_x;} ZoneRow;
typedef int (*ZoneMeasure)(const char *text,const void *font);
// Chamfer (4) and the system fonts (5-9) leave room; Broad and Span do not.
bool zone_column_fits(uint8_t style);
bool zones_beside(uint8_t style,bool stacked,uint8_t zone_times,bool panel_shows_zones);
int zone_row_baseline(int index,int count);
void zone_row(ZoneRow *row,const char *label,int hour,int minute,bool clock24,int delta,bool stale,ZoneMeasure measure,const void *font);
