#pragma once
#include <stdbool.h>
#include <stdint.h>
// Place times beside the clock (shared/zone-column.js): the clock shifts 36
// pixels aside and up to three places stack in a column on the other side:
// [4, 70) on the left (the default) or [130, 196) on the right, inset to line
// up with the status line.
#define ZONE_COLUMN_SHIFT 36
#define ZONE_COLUMN_WIDTH 70
#define ZONE_COLUMN_INSET 4
#define ZONE_COLUMN_GAP 2
// Display byte 2: bits 2-3 when place times also show outside the panel,
// bits 4-5 where, bit 6 lets map times turn 90 degrees.
enum {ZONE_TIMES_PANEL,ZONE_TIMES_WHEN_HIDDEN,ZONE_TIMES_ALWAYS,ZONE_TIMES_COUNT};
enum {ZONE_POSITION_LEFT,ZONE_POSITION_RIGHT,ZONE_POSITION_MAP,ZONE_POSITION_COUNT};
#define ZONE_TIMES_TURN 64
#define DISPLAY_NAMEPLATE 128
typedef struct {char label[8],time[6],suffix[2],day[4];int label_x,time_x,suffix_x,day_x;} ZoneRow;
typedef int (*ZoneMeasure)(const char *text,const void *font);
// Chamfer (4) and the system fonts (5-9) leave room; Broad and Span do not.
bool zone_column_fits(uint8_t style);
bool zones_beside(uint8_t style,bool stacked,uint8_t zone_times,uint8_t position,bool panel_shows_zones);
bool zones_on_map(uint8_t zone_times,uint8_t position,bool panel_shows_zones);
// How far the clock strip moves: right for a left column, left for a right one.
static inline int zone_clock_shift(bool right){return right?-ZONE_COLUMN_SHIFT:ZONE_COLUMN_SHIFT;}
int zone_row_baseline(int index,int count,bool tall);
// Tall figures (Tall place times): 10 pixels high, same advances as the
// capitals (6, the colon 3). Calls plot for each lit pixel of a time drawn
// from (x, baseline); returns the advance.
#define ZONE_TALL_HEIGHT 10
typedef void (*ZoneTallPlot)(int x,int y,void *context);
int zone_tall_draw(const char *text,int x,int baseline,ZoneTallPlot plot,void *context);
void zone_row(ZoneRow *row,const char *label,int hour,int minute,bool clock24,int delta,bool stale,bool right,ZoneMeasure measure,const void *font);
