#include "chart_axis.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define TIDE_LABEL_GAP 2
#include "generated/chart_axis.h"
#define MAX(a,b) ((a)>(b)?(a):(b))
#define MIN(a,b) ((a)<(b)?(a):(b))
const ChartGlyph *chart_glyph(char ch){
  for(unsigned i=0;i<sizeof(CHART_GLYPHS)/sizeof(CHART_GLYPHS[0]);i++)if(CHART_GLYPHS[i].ch==ch)return &CHART_GLYPHS[i];
  return &CHART_GLYPHS[sizeof(CHART_GLYPHS)/sizeof(CHART_GLYPHS[0])-1];
}
int chart_text_width(const char *text){int width=0;while(*text)width+=chart_glyph(*text++)->width+1;return MAX(0,width-1);}
const ChartGlyph *chart_range_glyph(char ch){
  for(unsigned i=0;i<sizeof(CHART_RANGE_GLYPHS)/sizeof(CHART_RANGE_GLYPHS[0]);i++)if(CHART_RANGE_GLYPHS[i].ch==ch)return &CHART_RANGE_GLYPHS[i];
  return &CHART_RANGE_GLYPHS[sizeof(CHART_RANGE_GLYPHS)/sizeof(CHART_RANGE_GLYPHS[0])-1];
}
int chart_range_width(const char *text){int width=0;while(*text)width+=chart_range_glyph(*text++)->width+1;return MAX(0,width-1);}
int chart_range_left(ChartLayout layout,const char *text){return layout.left-CHART_RANGE_GAP-chart_range_width(text);}
void chart_value_label(char *out,int size,int value,bool decimal){
  int rounded=(value+(value<0?-5:5))/10;
  if(decimal)snprintf(out,size,"%s%d.%d",rounded<0?"-":"",abs(rounded)/10,abs(rounded)%10);else snprintf(out,size,"%d",rounded);
}
void chart_hour_label(char *out,int size,int hour,bool clock24){
  if(clock24)snprintf(out,size,"%02d",hour);else snprintf(out,size,"%d%c",hour%12?hour%12:12,hour<12?'A':'P');
}
ChartLayout chart_layout(const char *upper,const char *lower,int count,bool range_labels,int hour_width){
  ChartLayout layout={.left=range_labels?1+MAX(chart_range_width(upper),chart_range_width(lower))+CHART_RANGE_GAP:2,.right=CHART_RIGHT,.top=CHART_TOP,.bottom=CHART_BOTTOM,.axis=CHART_AXIS,.daylight=CHART_DAYLIGHT,.label_baseline=CHART_LABEL_BASELINE,.step=24,.count=count};
  int spacing=MAX(20,(hour_width*3+1)/2+2);
  for(unsigned i=0;i<sizeof(CHART_HOUR_STEPS);i++)if(CHART_HOUR_STEPS[i]*(layout.right-layout.left)/(count-1)>=spacing){layout.step=CHART_HOUR_STEPS[i];break;}
  return layout;
}
int chart_x(ChartLayout layout,int index){return layout.left+index*(layout.right-layout.left)/(layout.count-1);}
int chart_y(int value,int lo,int hi){return CHART_BOTTOM-MAX(0,MIN(CHART_BOTTOM-CHART_TOP,(value-lo)*(CHART_BOTTOM-CHART_TOP)/MAX(1,hi-lo)));}
int chart_hour_left(ChartLayout layout,int index,int width){
  return MAX(CHART_LABEL_LEFT,MIN(CHART_LABEL_RIGHT-width,chart_x(layout,index)-width/2));
}
int chart_tide_marks(ChartLayout layout,int lo,int hi,const TideEvent *events,int n,TideMark *out){
  int32_t span=(layout.count-1)*3600;int count=0,last=-99;
  for(int i=0;i<n;i++){
    const TideEvent *e=&events[i];if(e->seconds<0||e->seconds>span)continue;
    TideMark *m=&out[count++];
    m->x=layout.left+e->seconds*(layout.right-layout.left)/span;m->y=chart_y(e->value,lo,hi);m->high=e->high;m->label[0]=0;m->label_x=m->label_y=0;
    if(!e->high)continue;
    char text[8];chart_value_label(text,sizeof(text),e->value,true);
    int width=chart_range_width(text),lx,ly;
    if(!chart_label_spot(layout,m->x,m->y,width,true,&lx,&ly)||lx<=last+1)continue;
    memcpy(m->label,text,sizeof(text));m->label_x=lx;m->label_y=ly;last=lx+width-1;
  }
  return count;
}
const uint8_t *chart_header_glyph(int which){return HEADER_GLYPHS[which];}
bool chart_label_spot(ChartLayout layout,int x,int y,int width,bool above_first,int *lx,int *ly){
  *lx=MAX(layout.left,MIN(layout.right-width+1,x-width/2));
  bool above=y-7-TIDE_LABEL_GAP>=layout.top-1,below=y+TIDE_LABEL_GAP+7<=layout.bottom;
  if(!above&&!below)return false;
  *ly=(above_first?above:!below)?y-7-TIDE_LABEL_GAP:y+TIDE_LABEL_GAP+1;
  return true;
}
int chart_extremes(ChartLayout layout,int lo,int hi,const int16_t *values,int count,ChartLabel out[2]){
  int max=0,min=0,n=0;
  for(int i=1;i<count;i++){if(values[i]>values[max])max=i;if(values[i]<values[min])min=i;}
  for(int k=0;k<(min==max?1:2);k++){
    int i=k?min:max,lx,ly;char text[8];chart_value_label(text,sizeof(text),values[i],false);int width=chart_range_width(text);
    if(!chart_label_spot(layout,chart_x(layout,i),chart_y(values[i],lo,hi),width,!k,&lx,&ly))continue;
    if(n&&lx<=out[0].x+out[0].width&&out[0].x<=lx+width&&ly<=out[0].y+7&&out[0].y<=ly+7)continue;
    out[n]=(ChartLabel){(int16_t)lx,(int16_t)ly,(int16_t)width,{0}};memcpy(out[n].text,text,sizeof(text));n++;
  }
  return n;
}
