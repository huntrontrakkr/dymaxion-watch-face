#include "chart_axis.h"
#include <stdio.h>
#include <string.h>
int main(int argc,char **argv){
  if(argc>1&&!strcmp(argv[1],"font")){
    const char *text="0123456789-.AP?";
    while(*text){const ChartGlyph *g=chart_glyph(*text++);printf("%c %d",g->ch,g->width);for(int i=0;i<7;i++)printf(" %d",g->rows[i]);puts("");}return 0;
  }
  if(argc>2&&!strcmp(argv[1],"range")){
    // range TEXT...: the narrow range figures, then each text's width.
    const char *text="0123456789-.?";
    while(*text){const ChartGlyph *g=chart_range_glyph(*text++);printf("%c %d",g->ch,g->width);for(int i=0;i<7;i++)printf(" %d",g->rows[i]);puts("");}
    for(int i=2;i<argc;i++)printf("%d\n",chart_range_width(argv[i]));
    return 0;
  }
  int lo,hi,decimal,count,clock24,range,max_width;
  while(scanf("%d %d %d %d %d %d %d",&lo,&hi,&decimal,&count,&clock24,&range,&max_width)==7){
    int hours[49],widths[49];for(int i=0;i<count;i++)if(scanf("%d",&hours[i])!=1)return 1;
    for(int i=0;i<count;i++)if(scanf("%d",&widths[i])!=1)return 1;
    char upper[20],lower[20],hour[8];chart_value_label(upper,sizeof(upper),hi,decimal);chart_value_label(lower,sizeof(lower),lo,decimal);
    ChartLayout layout=chart_layout(upper,lower,count,range,max_width);
    printf("%s %s %d %d %d %d",upper,lower,layout.left,layout.step,chart_y(lo-10,lo,hi),chart_y(hi+10,lo,hi));
    for(int i=0;i<count;i+=layout.step){chart_hour_label(hour,sizeof(hour),hours[i],clock24);printf(" %d,%d,%d,%d,%s",i,chart_x(layout,i),chart_hour_left(layout,i,widths[i]),widths[i],hour);}puts("");
  }
  return 0;
}
