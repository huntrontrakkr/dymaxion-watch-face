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
