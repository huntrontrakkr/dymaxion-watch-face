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
// Strip: between the clock and the map, in the nameplate's place.
enum {ZONE_POSITION_LEFT,ZONE_POSITION_RIGHT,ZONE_POSITION_MAP,ZONE_POSITION_STRIP,ZONE_POSITION_COUNT};
#define ZONE_TIMES_TURN 64
#define DISPLAY_NAMEPLATE 128
typedef struct {char label[8],time[6],suffix[2],day[4];int glyph_x,label_x,time_x,suffix_x,day_x;} ZoneRow;
// With icons, the place glyph leads the row: glyph_x is its centre, and the
// label starts ZONE_ROW_GLYPH_ADVANCE (the glyph and 2) later.
#define ZONE_ROW_GLYPH_ADVANCE 7
typedef int (*ZoneMeasure)(const char *text,const void *font);
// Chamfer (4) and the system fonts (5-9) leave room; Broad and Span do not.
bool zone_column_fits(uint8_t style);
bool zones_beside(uint8_t style,uint8_t zone_times,uint8_t position,bool panel_shows_zones);
bool zones_on_map(uint8_t zone_times,uint8_t position,bool panel_shows_zones);
bool zones_on_strip(uint8_t zone_times,uint8_t position,bool panel_shows_zones);
// How far the clock strip moves: right for a left column, left for a right one.
static inline int zone_clock_shift(bool right){return right?-ZONE_COLUMN_SHIFT:ZONE_COLUMN_SHIFT;}
int zone_row_baseline(int index,int count,bool tall);
// Tall figures (Tall place times): 6×10 on an advance of 7, the colon 2.
// zone_tall_width measures a time; zone_tall_draw calls plot for each lit pixel of a time drawn
// from (x, baseline); returns the advance.
#define ZONE_TALL_HEIGHT 10
typedef void (*ZoneTallPlot)(int x,int y,void *context);
int zone_tall_width(const char *text);
int zone_tall_draw(const char *text,int x,int baseline,ZoneTallPlot plot,void *context);
void zone_row(ZoneRow *row,const char *label,int hour,int minute,bool clock24,int delta,bool stale,bool right,bool tall,bool icon,ZoneMeasure measure,const void *font);
// Place times between the clock and the map (shared/zone-column.js zoneStrip):
// one line of glyph, label, time (tall by default, small capitals if compact), A/P and day offset per place, spread
// evenly across the width; labels shorten to three letters, then drop, to fit.
// Offsets from the slot's top left; the glyph's is its centre.
#define ZONE_STRIP_HEIGHT 16
#define ZONE_STRIP_BASELINE 13
#define ZONE_STRIP_GLYPH_Y 9
#define ZONE_STRIP_COMPACT_BASELINE 11
#define ZONE_STRIP_COMPACT_GLYPH_Y 7
typedef struct {char label[8],time[6],suffix[2],day[4];int glyph_x,label_x,time_x,suffix_x,day_x;} ZoneStripItem;
void zone_strip_entry(ZoneStripItem *item,const char *label,int hour,int minute,bool clock24,int delta,bool stale);
void zone_strip(ZoneStripItem *items,int n,bool compact,ZoneMeasure measure,const void *font);
