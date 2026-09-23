#include <pebble.h>
#include "settings.h"
#include "panels.h"
#include "city.h"
#include "display.h"
#include "minute_flip.h"
#include "caps.h"
#include "palette.h"
#include "generated/defaults.h"
#include "generated/cities.h"
#include "generated/identity.h"
#include "generated/moon_palette.h"
#include "generated/status_glyphs.h"
#include "generated/span_font.h"
#include "generated/markers.h"

static Window *s_window;
static Layer *s_layer;
static GBitmap *s_map;
static GFont s_large,s_small,s_zone;
static uint8_t s_settings[SETTINGS_SIZE];
static uint8_t s_palette[PALETTE_SIZE];
static uint8_t s_city[CITY_SIZE]={1};
static uint8_t s_display[DISPLAY_SIZE]=DEFAULT_DISPLAY;
static bool s_map_dirty=true,s_connected=true;
static BatteryChargeState s_battery;
static int16_t s_sun[3];
static GPoint s_sun_point;
static uint8_t s_selected=0,s_frame=16;
static AppTimer *s_animation;
static AppTimer *s_clock_timer;
static ClockFlip s_clock_flip;
static ClockFace s_geodesic;
// Flip state lives in the heap, sized for the active face; see clock_configure.
static const ClockFace *s_clock_face;
static uint8_t *s_clock_memory,*s_clock_pixels,*s_geodesic_data,*s_caps;
static uint8_t s_clock_digits[4];
static bool s_clock_ready,s_clock_running,s_clock_24,s_focused=true;
static time_t s_clock_minute;
static uint32_t s_clock_started;
static uint16_t s_clock_frame=UINT16_MAX;
static ShakeState s_shake;
static bool s_accel_subscribed;
static int s_map_w,s_map_h;

static float fsin(float r) { return (float)sin_lookup((int32_t)(r*TRIG_MAX_ANGLE/6.283185307f))/TRIG_MAX_RATIO; }
static float fcos(float r) { return (float)cos_lookup((int32_t)(r*TRIG_MAX_ANGLE/6.283185307f))/TRIG_MAX_RATIO; }
static void sun_update(time_t now) {
  struct tm t=*gmtime(&now);int year=t.tm_year+1900;
  bool leap=year%4==0&&(year%100!=0||year%400==0);
  float minutes=t.tm_hour*60+t.tm_min+t.tm_sec/60.0f;
  float g=6.283185307f/(leap?366:365)*(t.tm_yday+(minutes/60-12)/24);
  float eq=229.18f*(.000075f+.001868f*fcos(g)-.032077f*fsin(g)-.014615f*fcos(2*g)-.040849f*fsin(2*g));
  float dec=.006918f-.399912f*fcos(g)+.070257f*fsin(g)-.006758f*fcos(2*g)+.000907f*fsin(2*g)-.002697f*fcos(3*g)+.00148f*fsin(3*g);
  float lon=(720-minutes-eq)*3.141592654f/720;
  s_sun[0]=1024*fcos(dec)*fcos(lon);s_sun[1]=1024*fcos(dec)*fsin(lon);s_sun[2]=1024*fsin(dec);
}
static int32_t illumination(int8_t x,int8_t y,int8_t z) { return x*s_sun[0]+y*s_sun[1]+z*s_sun[2]; }
static bool custom_palette(void) { return palette_applies(s_palette,s_settings[THEME]); }
static const uint8_t *palette(void) { return custom_palette()?s_palette+PAL_COLORS:PALETTES[s_settings[THEME]]; }
static GColor color(int i) { return (GColor){.argb=palette()[i]}; }
static GColor mark_color(int i) { return (GColor){.argb=s_settings[HEADER_SIZE+i*ZONE_SIZE+70]}; }

static void rebuild_map(void) {
  int w=200,h=104;
  if(s_map && (w!=s_map_w || h!=s_map_h)){gbitmap_destroy(s_map);s_map=NULL;}
  s_map_w=w;s_map_h=h;
  if(!s_map)s_map=gbitmap_create_blank(GSize(w,h),GBitmapFormat8Bit);
  if(!s_map)return;
  ResHandle resource=resource_get_handle(RESOURCE_ID_MAP_LANDSCAPE);
  uint8_t row[200*4];
  uint8_t *data=gbitmap_get_data(s_map);int stride=gbitmap_get_bytes_per_row(s_map);
  const uint8_t *p=palette();int32_t closest=-200000;
  for(int y=0;y<h;y++) {
    if(resource_load_byte_range(resource,y*w*4,row,w*4)!=(size_t)w*4){gbitmap_destroy(s_map);s_map=NULL;return;}
    for(int x=0;x<w;x++) {
      uint8_t *r=row+x*4;int kind=r[3]&3;uint8_t c=p[0];
      if(kind) {
        int32_t light=illumination((int8_t)r[0],(int8_t)r[1],(int8_t)r[2]);
        if(light>closest){closest=light;s_sun_point=GPoint(x,y);}
        bool night=(s_settings[FLAGS]&DAY_NIGHT)&&light<0;
        if((s_settings[FLAGS]&DAY_NIGHT)&&light>-6500&&light<6500)night=((x+y)&1)?light<6500:light<-6500;
        c=p[kind+(night?2:0)];
        if((s_settings[FLAGS]&EDGES)&&(r[3]&4))c=p[5];
      }
      data[y*stride+x]=c;
    }
  }
  s_map_dirty=false;
}
static void text(GContext *ctx,const char *str,GFont font,GRect rect,GTextAlignment align,GColor ink) {
  graphics_context_set_text_color(ctx,ink);
  graphics_draw_text(ctx,str,font,rect,GTextOverflowModeFill,align,NULL);
}
static void draw_identity(GContext *ctx) {
  graphics_context_set_stroke_color(ctx,color(6));
  for(int y=0;y<IDENTITY_HEIGHT;y++)for(int x=0;x<IDENTITY_WIDTH;x++) {
    if(IDENTITY_ALPHA[y*IDENTITY_WIDTH+x])graphics_draw_pixel(ctx,GPoint(4+x,y));
  }
}
static void line(GContext *ctx,int x1,int y1,int x2,int y2,GColor c) {
  graphics_context_set_stroke_color(ctx,c);graphics_draw_line(ctx,GPoint(x1,y1),GPoint(x2,y2));
}
static void pixel_rows(GContext *ctx,const uint32_t *rows,int width,int height,int x,int y,GColor ink) {
  graphics_context_set_stroke_color(ctx,ink);
  for(int row=0;row<height;row++)for(int col=0;col<width;col++)
    if(rows[row]&(1u<<(width-1-col)))graphics_draw_pixel(ctx,GPoint(x+col,y+row));
}
static void marker(GContext *ctx,GPoint p,uint8_t icon,GColor c) {
  pixel_rows(ctx,MARKER_HALO,7,7,p.x-3,p.y-3,color(0));
  graphics_context_set_stroke_color(ctx,c);
  for(int y=0;y<MARKER_SIZE;y++)for(int x=0;x<MARKER_SIZE;x++)
    if(MARKER_ROWS[icon][y] & (1u<<(MARKER_SIZE-1-x)))
      graphics_draw_pixel(ctx,GPoint(p.x+x-MARKER_SIZE/2,p.y+y-MARKER_SIZE/2));
}
static int ordinal(const struct tm *t) {
  return calendar_ordinal(t->tm_year+1900,t->tm_mon+1,t->tm_mday);
}
static bool is_24(void) { return s_settings[FORMAT]==1 || (s_settings[FORMAT]==0&&clock_is_24h_style()); }
static uint32_t clock_milliseconds(void){time_t seconds;uint16_t ms;time_ms(&seconds,&ms);return (uint32_t)seconds*1000u+ms;}
static void clock_stop(void){
  if(s_clock_timer){app_timer_cancel(s_clock_timer);s_clock_timer=NULL;}
  s_clock_running=false;
}
static void clock_step(void *context){
  (void)context;s_clock_timer=NULL;
  uint32_t elapsed=clock_milliseconds()-s_clock_started;
  if(elapsed>=CLOCK_FLIP_MS)s_clock_running=false;
  else {
    uint32_t remaining=CLOCK_FLIP_MS-elapsed;
    s_clock_timer=app_timer_register(remaining<33?remaining:33,clock_step,NULL);
    if(!s_clock_timer)s_clock_running=false;
  }
  layer_mark_dirty(s_layer);
}
static void clock_prepare(struct tm *local,time_t now,bool animate){
  if(!s_clock_face)return;
  bool format=is_24();int hour=local->tm_hour;if(!format){hour%=12;if(!hour)hour=12;}
  uint8_t digits[4]={hour/10,hour%10,local->tm_min/10,local->tm_min%10};
  time_t minute=now/60;
  if(s_clock_ready&&minute==s_clock_minute&&format==s_clock_24&&!memcmp(digits,s_clock_digits,4))return;
  bool smooth=animate&&s_clock_ready&&minute==s_clock_minute+1&&format==s_clock_24
    &&s_focused&&(s_settings[FLAGS]&MOTION)&&s_battery.charge_percent>20;
  clock_stop();clock_flip_prepare(&s_clock_flip,s_clock_ready?s_clock_digits:digits,digits);
  memcpy(s_clock_digits,digits,4);s_clock_ready=true;s_clock_minute=minute;s_clock_24=format;s_clock_frame=UINT16_MAX;
  if(smooth&&s_clock_flip.changed_cells){
    s_clock_started=clock_milliseconds();s_clock_timer=app_timer_register(33,clock_step,NULL);s_clock_running=s_clock_timer!=NULL;
  }
}
static uint8_t clock_shade(uint8_t from,uint8_t toward){
  uint8_t out=0xc0;
  for(int shift=0;shift<=4;shift+=2){int a=(from>>shift)&3,b=(toward>>shift)&3;out|=(a+(b>a?1:b<a?-1:0))<<shift;}
  return out;
}
static void draw_flip_time(GContext *ctx,struct tm *local,time_t now,int x,int y){
  clock_prepare(local,now,false);
  uint32_t ms=s_clock_running?clock_milliseconds()-s_clock_started:CLOCK_FLIP_MS;
  uint16_t elapsed=ms<CLOCK_FLIP_MS?ms:CLOCK_FLIP_MS;
  if(elapsed!=s_clock_frame){clock_flip_sample(&s_clock_flip,elapsed,s_clock_pixels);s_clock_frame=elapsed;}
  uint8_t colors[4]={palette()[0],palette()[6],clock_shade(palette()[0],palette()[6]),clock_shade(palette()[6],palette()[0])};
  // Broad figures sit two pixels above the time block; Geodesic fills it.
  int top=s_clock_face==&BROAD_FACE?y-2:y;
  for(int row=0;row<s_clock_face->height;row++)for(int start=0;start<CLOCK_WIDTH;){
    uint8_t value=clock_frame_pixel(s_clock_pixels,row*CLOCK_WIDTH+start);int end=start+1;
    while(end<CLOCK_WIDTH&&clock_frame_pixel(s_clock_pixels,row*CLOCK_WIDTH+end)==value)end++;
    line(ctx,x+start,top+row,x+end-1,top+row,(GColor){.argb=colors[value]});start=end;
  }
}
static void clock_release(void){
  clock_stop();s_clock_ready=false;s_clock_face=NULL;
  free(s_clock_memory);free(s_clock_pixels);free(s_geodesic_data);
  s_clock_memory=s_clock_pixels=s_geodesic_data=NULL;
}
// Choose the flip face for the current display and allocate only its state.
// Geodesic tables are a resource so the app image stays under 64 KB; if the
// heap cannot hold them, the clock falls back to Span lettering.
static void clock_configure(void){
  clock_release();
  if(s_settings[FLAGS]&STACKED)return;
  const ClockFace *face=NULL;
  if(s_display[1]==2)face=&BROAD_FACE;
  else if(s_display[1]==4){
    ResHandle handle=resource_get_handle(RESOURCE_ID_CLOCK_GEODESIC);size_t length=resource_size(handle);
    s_geodesic_data=malloc(length);
    if(s_geodesic_data&&resource_load(handle,s_geodesic_data,length)==length&&geodesic_face_init(&s_geodesic,s_geodesic_data,length))face=&s_geodesic;
  }
  if(face){s_clock_memory=malloc(clock_flip_bytes(face));s_clock_pixels=malloc(clock_frame_bytes(face));}
  if(!face||!s_clock_memory||!s_clock_pixels){clock_release();return;}
  clock_flip_attach(&s_clock_flip,face,s_clock_memory);s_clock_face=face;
}
static void focus_changed(bool focused){s_focused=focused;clock_stop();s_clock_ready=false;if(focused)layer_mark_dirty(s_layer);}
static float lunar_sin(float degrees) {
  float turns=degrees/360.0f;
  turns-=(int32_t)turns;
  if(turns<0)turns+=1.0f;
  return fsin(turns*6.283185307f);
}
static uint8_t moon_frame(time_t now) {
  float t=(((int64_t)now-946728000LL)/86400.0f)/36525.0f;
  float sun_anomaly=357.5291092f+35999.0502909f*t;
  float sun=280.46646f+36000.76983f*t+1.915f*lunar_sin(sun_anomaly)+.020f*lunar_sin(2*sun_anomaly);
  float elongation=297.8501921f+445267.1114034f*t;
  float moon_anomaly=134.9633964f+477198.8675055f*t;
  float latitude_arg=93.272095f+483202.0175233f*t;
  float moon=218.3164477f+481267.88123421f*t
    +6.289f*lunar_sin(moon_anomaly)+1.274f*lunar_sin(2*elongation-moon_anomaly)
    +.658f*lunar_sin(2*elongation)+.214f*lunar_sin(2*moon_anomaly)
    -.186f*lunar_sin(sun_anomaly)-.114f*lunar_sin(2*latitude_arg);
  float phase=moon-sun;
  phase-=360.0f*(int32_t)(phase/360.0f);
  if(phase<0)phase+=360.0f;
  return ((int)(phase*MOON_GLYPH_COUNT/360.0f+.5f))%MOON_GLYPH_COUNT;
}
static void draw_moon_indicator(GContext *ctx,time_t now) {
  if(!s_settings[HEADER_SIZE+17])return;
  uint8_t frame=moon_frame(now);
  const uint8_t colors[3]={palette()[0],custom_palette()?s_palette[PAL_MOON_SHADOW]:MOON_PALETTES[s_settings[THEME]][1],palette()[6]};
  for(int y=0;y<MOON_GLYPH_SIZE;y++)for(int x=0;x<MOON_GLYPH_SIZE;x++) {
    uint16_t bit=1u<<(MOON_GLYPH_SIZE-1-x);
    uint8_t index=(MOON_LIGHT_ROWS[frame][y]&bit)?2:(MOON_SHADE_ROWS[frame][y]&bit)?1:0;
    if(index){graphics_context_set_stroke_color(ctx,(GColor){.argb=colors[index]});graphics_draw_pixel(ctx,GPoint(134+x,3+y));}
  }
}
static void draw_bluetooth_indicator(GContext *ctx) {
  graphics_context_set_stroke_color(ctx,s_connected?color(6):color(5));
  for(int y=0;y<BLUETOOTH_HEIGHT;y++)for(int x=0;x<BLUETOOTH_WIDTH;x++)
    if(BLUETOOTH_GLYPH[y] & (1u<<(BLUETOOTH_WIDTH-1-x)))
      graphics_draw_pixel(ctx,GPoint(148+x,2+y));
  if(!s_connected)line(ctx,147,12,155,2,color(7));
}
static void draw_span_time(GContext *ctx,const char *timebuf,int x,int y) {
  int cursor=x+5;
  graphics_context_set_stroke_color(ctx,color(6));
  for(const char *p=timebuf;*p;p++) {
    int glyph=*p==':'?10:*p-'0';
    if(glyph<0||glyph>10)continue;
    for(int i=SPAN_OFFSETS[glyph];i<SPAN_OFFSETS[glyph+1];i++) {
      SpanRun run=SPAN_RUNS[i];
      line(ctx,cursor+run.x,y+2+run.y,cursor+run.x+run.length-1,y+2+run.y,color(6));
    }
    cursor+=glyph==10?10:45;
  }
}
static void draw_triangle_time(GContext *ctx,const char *timebuf,int x,int y){
  uint8_t digits[4]={timebuf[0]-'0',timebuf[1]-'0',timebuf[3]-'0',timebuf[4]-'0'};
  GColor inactive=(GColor){.argb=custom_palette()?s_palette[PAL_INACTIVE]:TRIANGLE_INACTIVE[s_settings[THEME]]};
  for(int i=0;i<TRIANGLE_RUN_COUNT;i++){
    TriangleRun run=TRIANGLE_RUNS[i];bool lit=display_group_lit(run.group,digits);
    if(lit||s_display[2])line(ctx,x+2+run.x,y-1+run.y,x+1+run.x+run.length,y-1+run.y,lit?color(6):inactive);
  }
}
static int caption_width(const char *caption){return graphics_text_layout_get_content_size(caption,s_small,GRect(0,0,600,16),GTextOverflowModeFill,GTextAlignmentLeft).w;}
static int status_width(const char *caption){return s_caps?caps_width(s_caps,caption):0;}
static void clock_caption(char *out,size_t size,const char *date,const char *ampm,int width,time_t now,const char *separator,int (*measure)(const char *)){
  char city[44]={0},prefix[24]={0},suffix[8]={0};
  if(city_usable(s_city,now))snprintf(city,sizeof(city),"%s%s",(const char *)s_city+8,city_stale(s_city,now)?"?":"");
  if(!city[0]){snprintf(out,size,"%s%s%s",date,date[0]&&ampm[0]?separator:"",ampm);return;}
  if(date[0])snprintf(prefix,sizeof(prefix),"%s%s",date,separator);
  if(ampm[0])snprintf(suffix,sizeof(suffix)," %s",ampm);
  snprintf(out,size,"%s%s%s",prefix,city,suffix);
  if(measure(out)>width){
    size_t n=strlen(city);
    do{if(n)city[--n]=0;snprintf(out,size,"%s%s...%s",prefix,city,suffix);}while(n&&measure(out)>width);
  }
}
static void draw_time(GContext *ctx,struct tm *local,time_t now) {
  int x=s_settings[TIME_X],y=s_settings[TIME_Y],w=(s_settings[FLAGS]&STACKED)?72:200;
  bool geodesic=s_display[1]==4,status=s_settings[FLAGS]&STATUS_LINE;
  int h=(s_settings[FLAGS]&STACKED)?84:geodesic?(status?64:76):46;
  graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,GRect(x,y,w,h),0,GCornerNone);
  char timebuf[8],datebuf[96];int hour=local->tm_hour;if(!is_24()){hour%=12;if(!hour)hour=12;}
  const char *ampm=is_24()?"":(local->tm_hour<12?"AM":"PM");
  if(s_settings[FLAGS]&STACKED) {
    snprintf(timebuf,sizeof(timebuf),"%02d",hour);text(ctx,timebuf,s_large,GRect(x,y-14,w,44),GTextAlignmentCenter,color(6));
    snprintf(timebuf,sizeof(timebuf),"%02d",local->tm_min);text(ctx,timebuf,s_large,GRect(x,y+21,w,44),GTextAlignmentCenter,color(6));
    line(ctx,x+25,y+35,x+47,y+35,color(7));
    clock_caption(datebuf,sizeof(datebuf),"",ampm,w-4,now," / ",caption_width);
    text(ctx,datebuf,s_small,GRect(x,y+69,w,15),GTextAlignmentCenter,color(7));
  }else {
    snprintf(timebuf,sizeof(timebuf),"%02d:%02d",hour,local->tm_min);
    if(s_clock_face)draw_flip_time(ctx,local,now,x,y);
    else if(s_display[1]==1)draw_triangle_time(ctx,timebuf,x,y);else draw_span_time(ctx,timebuf,x,y);
    if(status)return;
    char date[24];snprintf(date,sizeof(date),"%s %02d %s",(const char *[]) {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"}[local->tm_wday],local->tm_mday,(const char *[]) {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"}[local->tm_mon]);
    clock_caption(datebuf,sizeof(datebuf),date,ampm,w-4,now," / ",caption_width);
    text(ctx,datebuf,s_small,GRect(x,geodesic?y+61:y+31,w,15),GTextAlignmentCenter,color(7));
  }
}
static void draw_zones(GContext *ctx,time_t now,struct tm *local) {
  for(int i=0;i<3;i++) {
    if(!(s_settings[ENABLED]&(1<<i)))continue;
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;
    int x=s_settings[ZONE_X+2*i],y=s_settings[ZONE_Y+2*i];
    graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,GRect(x,y,60,36),0,GCornerNone);
    time_t there=now+(int32_t)zone_offset(z,now)*60;struct tm zone=*gmtime(&there);
    int delta=ordinal(&zone)-ordinal(local),hour=zone.tm_hour;char label[8],hours[8],day[4];
    bool glyph=custom_palette()?s_palette[PAL_ZONE_GLYPHS]:PALETTE_ZONE_GLYPHS[s_settings[THEME]];
    snprintf(label,sizeof(label),"%.5s",(const char *)z);
    while(strlen(label)>0&&graphics_text_layout_get_content_size(label,s_small,GRect(0,0,200,16),GTextOverflowModeFill,GTextAlignmentLeft).w>(glyph?28:34))
      label[strlen(label)-1]=0;
    bool daylight=illumination((int8_t)z[11],(int8_t)z[12],(int8_t)z[13])>=0;
    pixel_rows(ctx,DAY_NIGHT_GLYPHS[daylight],5,5,x+1,y+5,mark_color(i));
    if(glyph)marker(ctx,GPoint(x+10,y+7),z[10],mark_color(i));
    text(ctx,label,s_small,GRect(x+(glyph?16:9),y,glyph?28:38,14),GTextAlignmentLeft,mark_color(i));
    if((uint32_t)now>=read_u32(z+18))snprintf(day,sizeof(day),"?");
    else if(delta)snprintf(day,sizeof(day),"%+d",delta);else day[0]=0;
    text(ctx,day,s_small,GRect(x+44,y,16,14),GTextAlignmentRight,color(7));
    if(!is_24()){hour%=12;if(!hour)hour=12;}
    snprintf(hours,sizeof(hours),"%02d:%02d",hour,zone.tm_min);
    text(ctx,hours,s_zone,GRect(x+2,y+13,52,22),GTextAlignmentLeft,color(6));
    if(!is_24())text(ctx,zone.tm_hour<12?"A":"P",s_small,GRect(x+53,y+16,7,15),GTextAlignmentLeft,color(7));
    if(i==s_selected&&s_frame<16)line(ctx,x,y+35,x+59,y+35,mark_color(i));
  }
}
typedef struct {GContext *ctx;GColor color;} CapsPen;
static void caps_span(void *context,int x,int y,int length){CapsPen *pen=context;line(pen->ctx,x,y,x+length-1,y,pen->color);}
// Status line: lining capitals for date and city in place of the nameplate.
static void draw_status_line(GContext *ctx,struct tm *local,time_t now,const char *battery){
  char date[24],status[96];const char *ampm=is_24()?"":(local->tm_hour<12?"AM":"PM");
  snprintf(date,sizeof(date),"%s %02d %s",(const char *[]){"Sun","Mon","Tue","Wed","Thu","Fri","Sat"}[local->tm_wday],local->tm_mday,
    (const char *[]){"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"}[local->tm_mon]);
  clock_caption(status,sizeof(status),date,ampm,s_settings[HEADER_SIZE+17]?126:140,now,"  ",status_width);
  CapsPen accent={ctx,color(7)},ink={ctx,color(6)};
  caps_draw(s_caps,status,4,12,false,caps_span,&accent);
  caps_draw(s_caps,battery,195,12,true,caps_span,&ink);
}
static void update_proc(Layer *layer,GContext *ctx) {
  time_t now=time(NULL);struct tm local=*localtime(&now);
  graphics_context_set_antialiased(ctx,false);
  graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,layer_get_bounds(layer),0,GCornerNone);
  if(s_map_dirty){sun_update(now);rebuild_map();}
  int mx=s_settings[MAP_X],my=s_settings[MAP_Y];
  if(s_map)graphics_draw_bitmap_in_rect(ctx,s_map,GRect(mx,my,s_map_w,s_map_h));
  else text(ctx,"MAP UNAVAILABLE",s_small,GRect(0,90,200,30),GTextAlignmentCenter,color(6));
  if((s_settings[FLAGS]&LIGHTS)&&(s_settings[FLAGS]&DAY_NIGHT)) {
    for(int i=0;i<CITY_COUNT;i++) {
      const City *c=&CITIES[i];
      if(illumination(c->dx,c->dy,c->dz)>=-4000)continue;
      graphics_context_set_stroke_color(ctx,color(7));graphics_draw_pixel(ctx,GPoint(mx+c->x,my+c->y));
    }
  }
  if((s_settings[FLAGS]&SUN)&&(s_settings[FLAGS]&DAY_NIGHT)&&s_map)marker(ctx,GPoint(mx+s_sun_point.x,my+s_sun_point.y),0,color(7));
  for(int i=0;i<3;i++)if(s_settings[ENABLED]&(1<<i)) {
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;GPoint pos=GPoint(mx+z[8],my+z[9]);
    marker(ctx,pos,z[10],mark_color(i));
    if(i==s_selected&&s_frame<16)pixel_rows(ctx,PULSE_GLYPHS[s_frame/4],PULSE_SIZE,PULSE_SIZE,pos.x-8,pos.y-8,mark_color(i));
  }
  draw_time(ctx,&local,now);
  bool zones=!panels_draw(ctx,now,&local,s_small,palette(),is_24());
  if(zones)draw_zones(ctx,now,&local);
  graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,GRect(0,0,200,18),0,GCornerNone);
  char battery[8];snprintf(battery,sizeof(battery),"%d%%",s_battery.charge_percent);
  if((s_settings[FLAGS]&STATUS_LINE)&&s_caps)draw_status_line(ctx,&local,now,battery);
  else {
    draw_identity(ctx);
    text(ctx,battery,s_small,GRect(160,0,35,15),GTextAlignmentRight,color(6));
  }
  draw_moon_indicator(ctx,now);
  draw_bluetooth_indicator(ctx);
}
static void animation_step(void *context) {
  s_animation=NULL;s_frame++;layer_mark_dirty(s_layer);
  if(s_frame<16)s_animation=app_timer_register(65,animation_step,NULL);
}
static void pulse(void) {
  if(s_animation){app_timer_cancel(s_animation);s_animation=NULL;}
  s_frame=16;
  if((s_settings[FLAGS]&MOTION)&&s_battery.charge_percent>20&&s_settings[ENABLED]) {s_frame=0;s_animation=app_timer_register(65,animation_step,NULL);}
  layer_mark_dirty(s_layer);
}
static void acceleration(AccelData *data,uint32_t count) {
  for(uint32_t i=0;i<count;i++)if(panel_shake(&s_shake,data[i].x,data[i].y,data[i].z,data[i].timestamp,data[i].did_vibrate)){
    if(panels_cycle(time(NULL)))layer_mark_dirty(s_layer);
  }
}
static void configure_shake(void) {
  bool wanted=panels_shake_enabled()&&s_battery.charge_percent>20;
  if(wanted==s_accel_subscribed)return;
  memset(&s_shake,0,sizeof(s_shake));
  if(wanted){accel_data_service_subscribe(5,acceleration);accel_service_set_sampling_rate(ACCEL_SAMPLING_10HZ);}
  else accel_data_service_unsubscribe();
  s_accel_subscribed=wanted;
}
static void request_sync(void) {
  DictionaryIterator *iter;
  if(app_message_outbox_begin(&iter)==APP_MSG_OK){dict_write_uint8(iter,MESSAGE_KEY_REQUEST,1);app_message_outbox_send();}
}
static void tick(struct tm *local_time,TimeUnits changed) {
  s_map_dirty=true;layer_mark_dirty(s_layer);
  time_t now=time(NULL);panels_tick(now);
  if(s_clock_face)clock_prepare(local_time,now,true);
  int interval=panels_refresh_minutes();if(!(s_city[1]&1)&&interval>60)interval=60;
  if((now/60)%interval==0)request_sync();
}
static void battery_changed(BatteryChargeState state) {
  s_battery=state;
  if(state.charge_percent<=20&&s_animation){app_timer_cancel(s_animation);s_animation=NULL;s_frame=16;}
  if(state.charge_percent<=20)clock_stop();
  configure_shake();
  layer_mark_dirty(s_layer);
}
static void connection_changed(bool connected) {s_connected=connected;layer_mark_dirty(s_layer);if(connected)request_sync();}
static void received(DictionaryIterator *iter,void *context) {
  bool changed=panels_receive(iter);
  Tuple *display=dict_find(iter,MESSAGE_KEY_DISPLAY);
  uint8_t next_display[DISPLAY_SIZE];
  if(display&&display->type==TUPLE_BYTE_ARRAY&&display_normalize(next_display,display->value->data,display->length)&&memcmp(s_display,next_display,DISPLAY_SIZE)){
    clock_stop();s_clock_ready=false;
    memcpy(s_display,next_display,DISPLAY_SIZE);persist_write_data(3,s_display,DISPLAY_SIZE);
    clock_configure();
  }
  Tuple *city=dict_find(iter,MESSAGE_KEY_CITY);
  if(city&&city->type==TUPLE_BYTE_ARRAY&&city_valid(city->value->data,city->length)&&memcmp(s_city,city->value->data,CITY_SIZE)){
    memcpy(s_city,city->value->data,CITY_SIZE);persist_write_data(2,s_city,CITY_SIZE);
  }
  Tuple *t=dict_find(iter,MESSAGE_KEY_SETTINGS);
  if(t&&t->type==TUPLE_BYTE_ARRAY&&settings_valid(t->value->data,t->length)&&memcmp(s_settings,t->value->data,SETTINGS_SIZE)){
    clock_stop();s_clock_ready=false;
    memcpy(s_settings,t->value->data,SETTINGS_SIZE);persist_write_data(1,s_settings,SETTINGS_SIZE);s_map_dirty=true;changed=true;
    clock_configure();
  }
  Tuple *custom=dict_find(iter,MESSAGE_KEY_PALETTE);
  if(custom&&custom->type==TUPLE_BYTE_ARRAY&&palette_valid(custom->value->data,custom->length)){
    uint8_t candidate[PALETTE_SIZE];memcpy(candidate,custom->value->data,PALETTE_SIZE);
    if(candidate[PAL_THEME]==s_settings[THEME]&&memcmp(s_palette,candidate,PALETTE_SIZE)){
      clock_stop();s_clock_ready=false;
      memcpy(s_palette,candidate,PALETTE_SIZE);persist_write_data(4,s_palette,PALETTE_SIZE);s_map_dirty=true;changed=true;
    }
  }else if(!custom&&t&&t->type==TUPLE_BYTE_ARRAY&&settings_valid(t->value->data,t->length)&&s_palette[PAL_ENABLED]){
    // An older companion knows only presets. Do not leave a saved custom
    // palette active over its newly received preset settings.
    memset(s_palette,0,PALETTE_SIZE);persist_delete(4);s_map_dirty=true;changed=true;
    clock_stop();s_clock_ready=false;
  }
  if(changed)window_set_background_color(s_window,color(0));
  if(changed){configure_shake();pulse();}else layer_mark_dirty(s_layer);
}
static void init(void) {
  panels_init();
  memcpy(s_settings,DEFAULT_SETTINGS,SETTINGS_SIZE);
  uint8_t stored[SETTINGS_SIZE];int length=persist_read_data(1,stored,sizeof(stored));
  if(length==SETTINGS_SIZE&&settings_valid(stored,length))memcpy(s_settings,stored,SETTINGS_SIZE);
  uint8_t city[CITY_SIZE];int city_length=persist_read_data(2,city,sizeof(city));
  if(city_length==CITY_SIZE&&city_valid(city,city_length))memcpy(s_city,city,CITY_SIZE);
  uint8_t display[DISPLAY_SIZE];int display_length=persist_read_data(3,display,sizeof(display));
  if(display_normalize(s_display,display,display_length)&&memcmp(display,s_display,DISPLAY_SIZE))
    persist_write_data(3,s_display,DISPLAY_SIZE);
  uint8_t custom[PALETTE_SIZE];int palette_length=persist_read_data(4,custom,sizeof(custom));
  if(palette_valid(custom,palette_length))memcpy(s_palette,custom,PALETTE_SIZE);
  s_large=fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FONT_DRAFT_44));
  s_small=fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FONT_DRAFT_12));
  s_zone=fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FONT_DRAFT_18));
  ResHandle caps=resource_get_handle(RESOURCE_ID_TYPE_CAPS);size_t caps_length=resource_size(caps);
  s_caps=malloc(caps_length);
  if(s_caps&&(resource_load(caps,s_caps,caps_length)!=caps_length||!caps_valid(s_caps,caps_length))){free(s_caps);s_caps=NULL;}
  clock_configure();
  s_window=window_create();s_layer=layer_create(GRect(0,0,200,228));
  layer_set_update_proc(s_layer,update_proc);layer_add_child(window_get_root_layer(s_window),s_layer);
  window_set_background_color(s_window,color(0));window_stack_push(s_window,false);
  s_battery=battery_state_service_peek();s_connected=connection_service_peek_pebble_app_connection();
  battery_state_service_subscribe(battery_changed);
  connection_service_subscribe((ConnectionHandlers){.pebble_app_connection_handler=connection_changed});
  tick_timer_service_subscribe(MINUTE_UNIT,tick);configure_shake();
  app_focus_service_subscribe(focus_changed);
  app_message_register_inbox_received(received);app_message_open(1024,64);
  request_sync();pulse();
}
static void deinit(void) {
  clock_stop();app_focus_service_unsubscribe();
  if(s_animation)app_timer_cancel(s_animation);
  tick_timer_service_unsubscribe();if(s_accel_subscribed)accel_data_service_unsubscribe();battery_state_service_unsubscribe();connection_service_unsubscribe();app_message_deregister_callbacks();
  layer_destroy(s_layer);window_destroy(s_window);if(s_map)gbitmap_destroy(s_map);
  fonts_unload_custom_font(s_large);fonts_unload_custom_font(s_small);fonts_unload_custom_font(s_zone);
  clock_release();free(s_caps);
}
int main(void) {init();app_event_loop();deinit();}
