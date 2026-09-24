#include "panels.h"
#include "settings.h"
#include "chart_axis.h"
#include "caps.h"
#include "solar.h"
#include "generated/footer_defaults.h"
#define MIN(a,b) ((a)<(b)?(a):(b))
#define MAX(a,b) ((a)>(b)?(a):(b))
static uint8_t s_footer[FOOTER_SIZE],s_weather[WEATHER_SIZE],s_tide[TIDE_SIZE],s_page;
static time_t s_changed;
static GFont s_font;
static const uint8_t *s_caps;
static const float *s_daylight;
static const uint8_t *s_palette;
static bool s_clock24;
static GColor color(int i){return (GColor){.argb=s_palette[i]};}
static GColor custom(int i){return (GColor){.argb=s_footer[i]};}
static void rect(GContext *ctx,int x,int y,int w,int h,GColor c){graphics_context_set_fill_color(ctx,c);graphics_fill_rect(ctx,GRect(x,y,w,h),0,GCornerNone);}
static void line(GContext *ctx,int x,int y,int xx,int yy,GColor c){graphics_context_set_stroke_color(ctx,c);graphics_draw_line(ctx,GPoint(x,y),GPoint(xx,yy));}
typedef struct {GContext *ctx;GColor color;} PanelPen;
static void panel_span(void *context,int x,int y,int length){PanelPen *pen=context;line(pen->ctx,x,y,x+length-1,y,pen->color);}
// Panel text uses the status line's lining capitals (Draft Micro text only if
// the caps resource failed to load). Alignment matches drawBitmapText.
static void label(GContext *ctx,const char *t,int x,int baseline,int width,GTextAlignment align,GColor c){
  if(!s_caps){graphics_context_set_text_color(ctx,c);graphics_draw_text(ctx,t,s_font,GRect(x,baseline-12,width,15),GTextOverflowModeFill,align,NULL);return;}
  int w=caps_width(s_caps,t);PanelPen pen={ctx,c};
  if(align==GTextAlignmentCenter)x+=width/2-(w+1)/2;else if(align==GTextAlignmentRight)x+=width-w;
  caps_draw(s_caps,t,x,baseline,false,panel_span,&pen);
}
// One RGB222 step per channel toward the ground: rain sits dimmed behind the line.
static GColor dim(GColor c,GColor ground){
  uint8_t out=0xc0;for(int shift=0;shift<6;shift+=2){int a=(c.argb>>shift)&3,b=(ground.argb>>shift)&3;out|=(a+(b>a)-(b<a))<<shift;}
  return (GColor){.argb=out};
}
static void axis_label(GContext *ctx,const char *text,int x,int y,GColor ink){
  graphics_context_set_stroke_color(ctx,ink);
  while(*text){const ChartGlyph *glyph=chart_glyph(*text++);
    for(int row=0;row<7;row++)for(int col=0;col<glyph->width;col++)if(glyph->rows[row]&(1u<<(glyph->width-1-col)))graphics_draw_pixel(ctx,GPoint(x+col,y+row));
    x+=glyph->width+1;
  }
}
static void storage_write(int key,const uint8_t *p,int n){for(int i=0;i<n;i+=240)persist_write_data(key+i/240,p+i,MIN(240,n-i));}
static bool storage_read(int key,uint8_t *p,int n){for(int i=0;i<n;i+=240)if(persist_read_data(key+i/240,p+i,MIN(240,n-i))!=MIN(240,n-i))return false;return true;}
void panels_init(void){
  memcpy(s_footer,DEFAULT_FOOTER,FOOTER_SIZE);uint8_t stored[FOOTER_SIZE];
  if(storage_read(100,stored,FOOTER_SIZE)&&footer_valid(stored,FOOTER_SIZE))memcpy(s_footer,stored,FOOTER_SIZE);
  if(!storage_read(110,s_weather,WEATHER_SIZE)||!environment_valid(s_weather,WEATHER_SIZE,false))memset(s_weather,0,WEATHER_SIZE);
  if(!storage_read(120,s_tide,TIDE_SIZE)||!environment_valid(s_tide,TIDE_SIZE,true))memset(s_tide,0,TIDE_SIZE);
  s_page=s_footer[F_HOME];s_changed=time(NULL);
}
bool panels_receive(DictionaryIterator *iter){
  bool changed=false;Tuple *t=dict_find(iter,MESSAGE_KEY_FOOTER);
  if(t&&t->type==TUPLE_BYTE_ARRAY&&footer_valid(t->value->data,t->length)&&memcmp(t->value->data,s_footer,FOOTER_SIZE)){
    memcpy(s_footer,t->value->data,FOOTER_SIZE);storage_write(100,s_footer,FOOTER_SIZE);s_page=s_footer[F_HOME];s_changed=time(NULL);changed=true;
  }
  for(int i=0;i<2;i++){
    t=dict_find(iter,i?MESSAGE_KEY_TIDE:MESSAGE_KEY_WEATHER);int n=i?TIDE_SIZE:WEATHER_SIZE;
    if(t&&t->type==TUPLE_BYTE_ARRAY&&environment_valid(t->value->data,t->length,i)){
      uint8_t *dest=i?s_tide:s_weather;
      if(memcmp(dest,t->value->data,n)){memcpy(dest,t->value->data,n);storage_write(i?120:110,dest,n);}
    }
  }
  return changed;
}
bool panels_cycle(time_t now){
  if(!s_footer[F_ENABLED]||s_footer[F_COUNT]<2)return false;
  int index=0;for(int i=0;i<s_footer[F_COUNT];i++)if(s_footer[F_ORDER+i]==s_page)index=i;
  s_page=s_footer[F_ORDER+(index+1)%s_footer[F_COUNT]];s_changed=now;return true;
}
bool panels_tick(time_t now){return s_footer[F_ROTATE]&&now-s_changed>=s_footer[F_ROTATE]*60?panels_cycle(now):false;}
int panels_weather_place(void){return s_footer[F_WEATHER_PLACE];}
bool panels_shake_enabled(void){return s_footer[F_ENABLED]&&s_footer[F_SHAKE]&&s_footer[F_COUNT]>1;}
int panels_refresh_minutes(void){
  if(s_footer[F_ENABLED]&&s_footer[F_WEATHER_ON])for(int i=0;i<s_footer[F_COUNT];i++)
    if(s_footer[F_ORDER+i]==PANEL_WEATHER||s_footer[F_ORDER+i]==PANEL_HUMIDITY)return s_footer[F_REFRESH];
  return 360;
}
static void clock_label(char *out,int size,int minute){int h=minute/60;if(s_clock24)snprintf(out,size,"%02d:%02d",h,minute%60);else snprintf(out,size,"%d:%02d%c",h%12?h%12:12,minute%60,h<12?'A':'P');}
static void decimal(char *out,int size,int tenth){tenth=MAX(-100000,MIN(100000,tenth));snprintf(out,size,"%s%d.%d",tenth<0?"-":"",abs(tenth)/10,abs(tenth)%10);}
static void page_dots(GContext *ctx){for(int i=0;i<s_footer[F_COUNT];i++)rect(ctx,196-4*(s_footer[F_COUNT]-i),227,s_footer[F_ORDER+i]==s_page?3:1,1,s_footer[F_ORDER+i]==s_page?color(6):color(5));}
static void calendar_draw(GContext *ctx,const struct tm *local){
  CalendarCell cells[14];panel_calendar(local->tm_year+1900,local->tm_mon+1,local->tm_mday,local->tm_wday,s_footer,cells);
  static const char *months[]={"JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"};
  static const char *weekdays[]={"S","M","T","W","T","F","S"};char title[24];
  if(cells[0].month!=cells[13].month)snprintf(title,sizeof(title),"%s / %s",months[cells[0].month-1],months[cells[13].month-1]);else snprintf(title,sizeof(title),"%s %d",months[local->tm_mon],local->tm_year+1900);
  label(ctx,title,4,191,160,GTextAlignmentLeft,color(7));
  for(int col=0;col<7;col++)label(ctx,weekdays[(col+s_footer[F_WEEK_START])%7],4+col*28,201,24,GTextAlignmentCenter,color(5));
  for(int i=0;i<14;i++){
    CalendarCell d=cells[i];int x=4+(i%7)*28,y=i<7?212:224;char day[3];snprintf(day,sizeof(day),"%d",d.day);
    GColor ink=d.holiday?custom(F_HOLIDAY_COLOR):d.weekend?custom(F_SAT_COLOR):color(6);
    if(d.today){
      if(s_footer[F_TODAY_OUTLINE]){graphics_context_set_stroke_color(ctx,custom(F_TODAY_COLOR));graphics_draw_rect(ctx,GRect(x+1,y-9,22,11));}
      else{rect(ctx,x+1,y-9,22,11,custom(F_TODAY_COLOR));ink=gcolor_legible_over(custom(F_TODAY_COLOR));}
    }
    label(ctx,day,x,y,24,GTextAlignmentCenter,ink);
  }
}
static int metric(const uint8_t *p,int i,bool tide,bool humidity){
  const uint8_t *sample=p+(tide?48+i*4:32+i*8);int v=read_i16(sample);
  if(tide)return s_footer[F_TIDE_FEET]?v*328/100:v; // hundredths of m or ft
  if(humidity)return sample[2]*10;
  return s_footer[F_FAHRENHEIT]?v*9/5+320:v;
}
static void graph_draw(GContext *ctx,time_t now){
  bool tide=s_page==PANEL_TIDE,humidity=s_page==PANEL_HUMIDITY;const uint8_t *p=tide?s_tide:s_weather;
  const char *kind=tide?"TIDE":humidity?"HUMIDITY":"WEATHER";
  int start=environment_start_index(p,now);char title[32],right[24],value[12];
  if((tide&&!s_footer[F_TIDE_ON])||(!tide&&!s_footer[F_WEATHER_ON])||start<0){
    label(ctx,kind,4,193,190,GTextAlignmentLeft,color(7));
    const char *message=tide&&!s_footer[F_TIDE_ON]?"CHOOSE A NOAA STATION":!tide&&!s_footer[F_WEATHER_ON]?"ENABLE WEATHER IN SETTINGS":p[1]?"FORECAST EXPIRED":p[2]&2?"DATA UNAVAILABLE":"WAITING FOR PHONE";
    label(ctx,message,4,214,192,GTextAlignmentLeft,color(6));return;
  }
  int count=MIN(s_footer[F_HORIZON]+1,p[1]-start),lo=32767,hi=-32768;
  for(int i=0;i<count;i++){int n=metric(p,start+i,tide,humidity);lo=MIN(lo,n);hi=MAX(hi,n);}
  if(tide&&s_footer[F_TIDE_FIXED]){lo=read_i16(s_footer+F_TIDE_MIN);hi=read_i16(s_footer+F_TIDE_MAX);}
  else if(humidity&&!s_footer[F_HUMID_AUTO]){lo=0;hi=1000;}
  else if(!tide&&!humidity&&s_footer[F_TEMP_FIXED]){lo=read_i16(s_footer+F_TEMP_MIN);hi=read_i16(s_footer+F_TEMP_MAX);}
  else{int pad=MAX(tide?10:10,(hi-lo)/8);lo-=pad;hi+=pad;if(humidity){lo=MAX(0,lo);hi=MIN(1000,hi);}}
  int n=metric(p,start,tide,humidity);
  if(tide){decimal(value,sizeof(value),(n+(n<0?-5:5))/10);snprintf(title,sizeof(title),"%.7s %s%s",(const char *)p+28,value,s_footer[F_TIDE_FEET]?"FT":"M");}
  else if(humidity)snprintf(title,sizeof(title),"RH %d%%",n/10);
  else snprintf(title,sizeof(title),"%.7s %d%c",(const char *)p+24,(n+(n<0?-5:5))/10,s_footer[F_FAHRENHEIT]?'F':'C');
  right[0]=0;uint32_t first=read_u32(p+12),second=read_u32(p+16);bool usefirst=first>=(uint32_t)now&&(second<(uint32_t)now||first<second);uint32_t event=usefirst?first:second;
  bool stale=(p[2]&2)||((uint32_t)now>read_u32(p+4)+(tide?12*3600:s_footer[F_REFRESH]*120));
  if(p[2]&1)snprintf(right,sizeof(right),"DEMO");
  else if(stale)snprintf(right,sizeof(right),"OLD");
  else if(tide&&event>=(uint32_t)now){
    char timebuf[16];clock_label(timebuf,sizeof(timebuf),(uint16_t)read_i16(p+24+(usefirst?0:2)));
    snprintf(right,sizeof(right),"%s %s",usefirst?"H":"L",timebuf);
  }else if(!tide&&s_footer[F_SOLAR]&&s_daylight){
    // Sunrise and sunset at the daylight place, the same source as the shading.
    bool rise;time_t sun=solar_next_event((uint32_t)now,s_daylight,48,&rise);
    if(sun){struct tm *t=localtime(&sun);char timebuf[16];clock_label(timebuf,sizeof(timebuf),t->tm_hour*60+t->tm_min);snprintf(right,sizeof(right),"%s %s",rise?"RISE":"SET",timebuf);}
  }
  if(!right[0]&&!tide&&!humidity&&s_footer[F_RAIN]){
    int peak=0;for(int i=0;i<count;i++){const uint8_t *sample=p+32+(start+i)*8;int rain=s_footer[F_RAIN]==1?sample[3]:(uint16_t)read_i16(sample+4);peak=MAX(peak,rain);}
    if(s_footer[F_RAIN]==1)snprintf(right,sizeof(right),"RAIN %d%%",peak);
    else if(s_footer[F_RAIN_INCH]){int hundredths=(peak*100+127)/254;snprintf(right,sizeof(right),"MAX %d.%02dIN",hundredths/100,hundredths%100);}
    else{decimal(value,sizeof(value),peak);snprintf(right,sizeof(right),"MAX %sMM",value);}
  }
  label(ctx,title,4,191,104,GTextAlignmentLeft,color(6));label(ctx,right,107,191,89,GTextAlignmentRight,color(7));
  char upper[12],lower[12];chart_value_label(upper,sizeof(upper),hi,tide);chart_value_label(lower,sizeof(lower),lo,tide);
  ChartLayout layout=chart_layout(upper,lower,count,s_footer[F_RANGE_LABELS],chart_text_width(s_clock24?"23":"12A"));
  int plot_height=layout.bottom-layout.top+1;
  GColor ink=custom(tide?F_TIDE_COLOR:humidity?F_HUMID_COLOR:F_TEMP_COLOR),rain_ink=dim(custom(F_RAIN_COLOR),color(0));
  // Daylight per pixel column: the sun's altitude at that moment and place.
  if(!tide&&s_footer[F_DAYLIGHT]&&s_daylight){
    uint32_t t0=read_u32(p+8)+(uint32_t)start*3600;
    for(int xx=layout.left;xx<=layout.right;xx++){
      bool day=solar_up(t0+(uint32_t)((xx-layout.left)*(count-1)*3600/(layout.right-layout.left)),s_daylight);
      rect(ctx,xx,layout.daylight,1,1,day?color(7):color(5));
      if(!day&&xx%4==0)for(int y=layout.top+2;y<=layout.bottom;y+=4)rect(ctx,xx,y,1,1,color(5));
    }
  }
  for(int i=0;i<count;i++){
    int x=chart_x(layout,i);const uint8_t *sample=p+(tide?48+(start+i)*4:32+(start+i)*8);
    int end=chart_x(layout,MIN(i+1,count-1));
    if(!tide&&!humidity&&s_footer[F_RAIN]){
      int rain=s_footer[F_RAIN]==1?sample[3]*plot_height/100:MIN(plot_height,(uint16_t)read_i16(sample+4)*plot_height/(uint16_t)read_i16(s_footer+F_RAIN_MAX));
      if(rain)rect(ctx,x,layout.bottom+1-rain,MIN(MIN(3,MAX(1,end-x-1)),layout.right-x+1),rain,rain_ink);
    }
  }
  if(s_footer[F_GRID])for(int x=layout.left;x<=layout.right;x+=4)rect(ctx,x,(layout.top+layout.bottom)/2,1,1,color(5));
  if(tide&&s_footer[F_TIDE_ZERO]&&lo<0&&hi>0)for(int x=layout.left;x<=layout.right;x+=4)rect(ctx,x,chart_y(0,lo,hi),MIN(2,layout.right-x+1),1,color(5));
  for(int i=1;i<count;i++)line(ctx,chart_x(layout,i-1),chart_y(metric(p,start+i-1,tide,humidity),lo,hi),chart_x(layout,i),chart_y(metric(p,start+i,tide,humidity),lo,hi),ink);
  if(s_footer[F_RANGE_LABELS]){
    axis_label(ctx,upper,layout.left-3-chart_text_width(upper),layout.top,color(6));
    axis_label(ctx,lower,layout.left-3-chart_text_width(lower),layout.bottom-6,color(6));
  }
  line(ctx,layout.left,layout.axis,layout.right,layout.axis,color(5));
  for(int i=0;i<count;i++){
    bool major=i%layout.step==0;int x=chart_x(layout,i);
    line(ctx,x,layout.axis+1,x,layout.axis+(major?2:1),major?color(6):color(5));
    if(major){
      chart_hour_label(value,sizeof(value),p[tide?48+(start+i)*4+2:32+(start+i)*8+7],s_clock24);
      axis_label(ctx,value,chart_hour_left(layout,i,chart_text_width(value)),layout.label_baseline-6,color(6));
    }
  }
}
bool panels_draw(GContext *ctx,time_t now,const struct tm *local,GFont font,const uint8_t *caps,const uint8_t *palette,bool clock24,const float *daylight){
  if(!s_footer[F_ENABLED])return false;
  s_font=font;s_caps=caps;s_daylight=daylight;s_palette=palette;s_clock24=clock24;
  rect(ctx,0,184,200,44,color(0));
  if(s_page==PANEL_CALENDAR)calendar_draw(ctx,local);else if(s_page!=PANEL_ZONES)graph_draw(ctx,now);
  page_dots(ctx);return s_page!=PANEL_ZONES;
}
