#pragma once
#include <stdbool.h>
#include <stdint.h>
typedef struct { char ch; uint8_t width,rows[7]; } ChartGlyph;
typedef struct { int left,right,top,bottom,axis,daylight,label_baseline,step,count; } ChartLayout;
const ChartGlyph *chart_glyph(char ch);
int chart_text_width(const char *text);
// The narrow range-label figures, and where a label's first column goes.
const ChartGlyph *chart_range_glyph(char ch);
int chart_range_width(const char *text);
int chart_range_left(ChartLayout layout,const char *text);
void chart_value_label(char *out,int size,int value,bool decimal);
void chart_hour_label(char *out,int size,int hour,bool clock24);
ChartLayout chart_layout(const char *upper,const char *lower,int count,bool range_labels,int hour_width);
int chart_x(ChartLayout layout,int index);
int chart_y(int value,int lo,int hi);
int chart_hour_left(ChartLayout layout,int index,int width);
// High and low tides on the tide chart (shared/chart-axis.js tideMarks).
typedef struct { int16_t x,y,label_x,label_y;bool high;char label[8]; } TideMark;
typedef struct { int32_t seconds;int16_t value;bool high; } TideEvent;
int chart_tide_marks(ChartLayout layout,int lo,int hi,const TideEvent *events,int n,TideMark *out);
// Header glyphs, five rows of five pixels (shared/chart-axis.js HEADER_GLYPHS).
enum { GLYPH_HIGH,GLYPH_LOW,GLYPH_RISE,GLYPH_SET };
const uint8_t *chart_header_glyph(int which);
// Where a value label `width` wide goes for a point (labelSpot); false if nowhere.
bool chart_label_spot(ChartLayout layout,int x,int y,int width,bool above_first,int *lx,int *ly);
// The warmest and coolest readings' labels (chartExtremes); returns how many.
typedef struct { int16_t x,y,width;char text[8]; } ChartLabel;
int chart_extremes(ChartLayout layout,int lo,int hi,const int16_t *values,int count,ChartLabel out[2]);
