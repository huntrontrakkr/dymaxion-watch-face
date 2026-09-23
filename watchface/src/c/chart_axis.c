#include "chart_axis.h"
#include <stdio.h>
#include <stdlib.h>
#include "generated/chart_axis.h"
#define MAX(a,b) ((a)>(b)?(a):(b))
#define MIN(a,b) ((a)<(b)?(a):(b))
const ChartGlyph *chart_glyph(char ch){
  for(unsigned i=0;i<sizeof(CHART_GLYPHS)/sizeof(CHART_GLYPHS[0]);i++)if(CHART_GLYPHS[i].ch==ch)return &CHART_GLYPHS[i];
  return &CHART_GLYPHS[sizeof(CHART_GLYPHS)/sizeof(CHART_GLYPHS[0])-1];
}
int chart_text_width(const char *text){int width=0;while(*text)width+=chart_glyph(*text++)->width+1;return MAX(0,width-1);}
void chart_value_label(char *out,int size,int value,bool decimal){
  int rounded=(value+(value<0?-5:5))/10;
  if(decimal)snprintf(out,size,"%s%d.%d",rounded<0?"-":"",abs(rounded)/10,abs(rounded)%10);else snprintf(out,size,"%d",rounded);
}
void chart_hour_label(char *out,int size,int hour,bool clock24){
  if(clock24)snprintf(out,size,"%02d",hour);else snprintf(out,size,"%d%c",hour%12?hour%12:12,hour<12?'A':'P');
}
ChartLayout chart_layout(const char *upper,const char *lower,int count,bool range_labels,int hour_width){
  ChartLayout layout={.left=range_labels?2+MAX(chart_text_width(upper),chart_text_width(lower))+3:2,.right=CHART_RIGHT,.top=CHART_TOP,.bottom=CHART_BOTTOM,.axis=CHART_AXIS,.daylight=CHART_DAYLIGHT,.label_baseline=CHART_LABEL_BASELINE,.step=24,.count=count};
  int spacing=MAX(20,(hour_width*3+1)/2+2);
  for(unsigned i=0;i<sizeof(CHART_HOUR_STEPS);i++)if(CHART_HOUR_STEPS[i]*(layout.right-layout.left)/(count-1)>=spacing){layout.step=CHART_HOUR_STEPS[i];break;}
  return layout;
}
int chart_x(ChartLayout layout,int index){return layout.left+index*(layout.right-layout.left)/(layout.count-1);}
int chart_y(int value,int lo,int hi){return CHART_BOTTOM-MAX(0,MIN(CHART_BOTTOM-CHART_TOP,(value-lo)*(CHART_BOTTOM-CHART_TOP)/MAX(1,hi-lo)));}
int chart_hour_left(ChartLayout layout,int index,int width){
  return MAX(CHART_LABEL_LEFT,MIN(CHART_LABEL_RIGHT-width,chart_x(layout,index)-width/2));
}
