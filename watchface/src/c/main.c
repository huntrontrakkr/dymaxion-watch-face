#include <pebble.h>
#include "settings.h"
#include "panels.h"
#include "city.h"
#include "solar.h"
#include "generated/system_clock.h"
#include "display.h"
#include "minute_flip.h"
#include "clock_styles.h"
#include "zone_column.h"
#include "map_times.h"
#include "map_markers.h"
#include "nameplate.h"
#include "caps.h"
#include "palette.h"
#include "generated/defaults.h"
#include "generated/cities.h"
#include "generated/moon_palette.h"
#include "generated/status_glyphs.h"
#include "generated/markers.h"
#include "transitions.h"
#include "power.h"

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
// The marker pulse: four rings, 120 ms each, for each enabled place in turn
// (one redraw per ring; under a second and a half for three places).
#define PULSE_RING_MS 120
static uint8_t s_frame,s_frames;
static int pulsing_place(void){
  if(s_frame>=s_frames)return -1;
  for(int i=0,k=s_frame/4;i<3;i++)if((s_settings[ENABLED]&(1<<i))&&!k--)return i;
  return -1;
}
static AppTimer *s_animation;
static AppTimer *s_clock_timer;
static ClockFlip s_clock_flip;
static ClockFace s_chamfer,s_styled;
// Flip state lives in the heap, sized for the active face; see clock_configure.
static const ClockFace *s_clock_face;
static uint8_t *s_clock_memory,*s_clock_pixels,*s_chamfer_data,*s_glyph_data,*s_caps;
static uint8_t s_clock_digits[4];
static bool s_clock_ready,s_clock_running,s_clock_24,s_focused=true;
static time_t s_clock_minute;
static uint32_t s_clock_started;
static uint16_t s_clock_frame=UINT16_MAX;
static TapState s_tap;
static PanelLightState s_gesture_light;
static bool s_accel_subscribed,s_backlight_subscribed;
static void configure_shake(void);
static int s_map_w,s_map_h;
static bool s_beside; // place times beside the clock this frame (or on their way)
// Transitions (transitions.c): the tray swiping to its next page, and the
// clock making room for the place times beside it. One timer drives both
// while either runs; none runs at rest.
static AppTimer *s_motion_timer;
// Partial redraws. The window's background is clear, so the screen keeps its
// last frame between redraws: most redraws repaint everything, but animation
// frames repaint only what moves, the clock strip (minute change, glide) or
// the bottom tray (swipe), and everything else stays as it was.
#define PART_CLOCK 1
#define PART_TRAY 2
static bool s_full=true;static uint8_t s_parts;
static void redraw(void){s_full=true;layer_mark_dirty(s_layer);}
static void redraw_part(uint8_t part){s_parts|=part;layer_mark_dirty(s_layer);}
static bool s_tray_active;static int s_tray_from;static uint32_t s_tray_started;static uint8_t *s_tray_old;
static bool s_beside_known,s_beside_to;static int s_beside_from,s_beside_p;static uint32_t s_beside_started;
static MapTimeSpot s_map_spots[3];
static uint8_t s_map_key[18];
static bool s_map_key_valid;
static AppTimer *s_map_timer;
// Power and motion (power.c): DISPLAY bytes 4-6.
static const uint8_t *power(void){return s_display+4;}
// The watch's Quiet Time, which the night saver can treat as night.
static bool quiet(void){return quiet_time_is_active();}
static int local_hour(void){time_t t=time(NULL);return localtime(&t)->tm_hour;}
static uint8_t zone_position(void){return (s_display[2]>>4)&3;}

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
      }else if(s_display[3]&&(r[3]&(4<<s_display[3])))c=p[5]; // map background, in the edge colour
      data[y*stride+x]=c;
    }
  }
  s_map_dirty=false;
}
static void text(GContext *ctx,const char *str,GFont font,GRect rect,GTextAlignment align,GColor ink) {
  graphics_context_set_text_color(ctx,ink);
  graphics_draw_text(ctx,str,font,rect,GTextOverflowModeFill,align,NULL);
}
static void line(GContext *ctx,int x1,int y1,int x2,int y2,GColor c) {
  graphics_context_set_stroke_color(ctx,c);graphics_draw_line(ctx,GPoint(x1,y1),GPoint(x2,y2));
}
static void pixel_rows(GContext *ctx,const uint32_t *rows,int width,int height,int x,int y,GColor ink) {
  graphics_context_set_stroke_color(ctx,ink);
  for(int row=0;row<height;row++)for(int col=0;col<width;col++)
    if(rows[row]&(1u<<(width-1-col)))graphics_draw_pixel(ctx,GPoint(x+col,y+row));
}
static void marker_glyph(GContext *ctx,GPoint p,uint8_t icon,GColor c) {
  graphics_context_set_stroke_color(ctx,c);
  for(int y=0;y<MARKER_SIZE;y++)for(int x=0;x<MARKER_SIZE;x++)
    if(MARKER_ROWS[icon][y] & (1u<<(MARKER_SIZE-1-x)))
      graphics_draw_pixel(ctx,GPoint(p.x+x-MARKER_SIZE/2,p.y+y-MARKER_SIZE/2));
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
  // Its frames also carry a tray swipe running alongside (motion_continue).
  redraw_part(PART_CLOCK|(s_tray_active?PART_TRAY:0));
}
static bool leading_zero(void){return !(s_display[2]&2);}
static void clock_prepare(struct tm *local,time_t now,bool animate){
  if(!s_clock_face)return;
  bool format=is_24();int hour=local->tm_hour;if(!format){hour%=12;if(!hour)hour=12;}
  // 10 leaves the first slot blank when the leading zero is off.
  uint8_t digits[4]={hour<10&&!leading_zero()?10:hour/10,hour%10,local->tm_min/10,local->tm_min%10};
  time_t minute=now/60;
  if(s_clock_ready&&minute==s_clock_minute&&format==s_clock_24&&!memcmp(digits,s_clock_digits,4))return;
  bool smooth=animate&&s_clock_ready&&minute==s_clock_minute+1&&format==s_clock_24
    &&s_focused&&power_minute_animation(power(),s_settings[FLAGS]&MOTION,local->tm_hour,quiet())&&power_battery_allows_motion(power(),s_battery.charge_percent);
  clock_stop();clock_flip_prepare(&s_clock_flip,smooth?s_clock_digits:digits,digits);
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
  // Broad figures sit two pixels above the time block; the rest fill it.
  int top=s_clock_face==&BROAD_FACE?y-2:y;
  for(int row=0;row<s_clock_face->height;row++)for(int start=0;start<CLOCK_WIDTH;){
    uint8_t value=clock_frame_pixel(s_clock_pixels,row*CLOCK_WIDTH+start);int end=start+1;
    while(end<CLOCK_WIDTH&&clock_frame_pixel(s_clock_pixels,row*CLOCK_WIDTH+end)==value)end++;
    line(ctx,x+start,top+row,x+end-1,top+row,(GColor){.argb=colors[value]});start=end;
  }
}
static void clock_release(void){
  clock_stop();s_clock_ready=false;s_clock_face=NULL;
  free(s_clock_memory);free(s_clock_pixels);free(s_chamfer_data);free(s_glyph_data);
  s_clock_memory=s_clock_pixels=s_chamfer_data=s_glyph_data=NULL;
}
// One font's glyphs from clock-glyphs.bin, repacked as a one-font resource so
// only that block (under 1 KB) stays in the heap.
static const uint8_t *clock_load_font(uint8_t code,int8_t *box_top){
  ResHandle handle=resource_get_handle(RESOURCE_ID_CLOCK_GLYPHS);size_t length=resource_size(handle);uint8_t table[1+4*8];
  if(length<1||resource_load_byte_range(handle,0,table,1)!=1||!table[0]||table[0]>8)return NULL;
  size_t size=1+4u*table[0];if(resource_load_byte_range(handle,0,table,size)!=size)return NULL;
  for(int f=0;f<table[0];f++)if(table[1+4*f]==code){
    size_t at=table[3+4*f]|table[4+4*f]<<8,end=f+1<table[0]?(size_t)(table[7+4*f]|table[8+4*f]<<8):length;
    if(at<size||end>length||end<=at)return NULL;
    s_glyph_data=malloc(5+end-at);if(!s_glyph_data)return NULL;
    memcpy(s_glyph_data,(uint8_t[5]){1,code,table[2+4*f],5,0},5);
    if(resource_load_byte_range(handle,at,s_glyph_data+5,end-at)!=end-at)return NULL;
    return clock_glyph_font(s_glyph_data,5+end-at,code,box_top);
  }
  return NULL;
}
// Choose the flip face for the current display and allocate only its state.
// Chamfer tables are a resource so the app image stays under 64 KB; the other
// styles without Broad's slots borrow its lattice. If the heap cannot hold
// them, the clock is drawn without the transition (Broad and Chamfer as Span).
static void clock_configure(void){
  clock_release();
  if(s_settings[FLAGS]&STACKED)return;
  const ClockFace *face=NULL;uint8_t style=s_display[1];
  if(style==2)face=&BROAD_FACE;
  else {
    ResHandle handle=resource_get_handle(RESOURCE_ID_CLOCK_CHAMFER);size_t length=resource_size(handle);
    s_chamfer_data=malloc(length);
    if(s_chamfer_data&&resource_load(handle,s_chamfer_data,length)==length&&chamfer_face_init(&s_chamfer,s_chamfer_data,length))face=&s_chamfer;
    if(face&&style!=4){
      int8_t box_top=0;const uint8_t *font=style>=5?clock_load_font(style,&box_top):NULL;
      face=clock_style_face(&s_styled,&s_chamfer,style,font,box_top)?&s_styled:NULL;
    }
  }
  if(face){s_clock_memory=malloc(clock_flip_bytes(face));s_clock_pixels=malloc(clock_frame_bytes(face));}
  if(!face||!s_clock_memory||!s_clock_pixels){clock_release();return;}
  clock_flip_attach(&s_clock_flip,face,s_clock_memory);s_clock_face=face;
}
static void focus_changed(bool focused){
  s_focused=focused;memset(&s_tap,0,sizeof(s_tap));
  configure_shake();clock_stop();s_clock_ready=false;if(focused)redraw();
}
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
typedef struct {GContext *ctx;int x,y;GColor color;} StripPen;
static void strip_span(void *context,int x,int y,int length){StripPen *pen=context;line(pen->ctx,pen->x+x,pen->y+y,pen->x+x+length-1,pen->y+y,pen->color);}
// Without the transition's heap state, Span (and Broad or Chamfer in its place) is drawn directly.
static void draw_span_time(GContext *ctx,const uint8_t digits[4],int x,int y){
  StripPen pen={ctx,x,y,color(6)};clock_style_runs(0,NULL,0,digits,strip_span,&pen);
}
// Pebble system fonts (display codes 5-9) without the transition: one centred
// line from firmware, placed so the figures sit centred in the 40-pixel strip
// (generated/system_clock.h). Leco Delta falls back to plain Leco.
static void draw_system_time(GContext *ctx,const char *timebuf,int x,int y){
  for(int i=0;i<SYSTEM_CLOCK_COUNT;i++)if(SYSTEM_CLOCK_FONTS[i].code==s_display[1]){
    const SystemClockFont *f=&SYSTEM_CLOCK_FONTS[i];
    text(ctx,timebuf[0]==' '?timebuf+1:timebuf,fonts_get_system_font(f->key),GRect(x,y+f->box_top,200,f->box_height),GTextAlignmentCenter,color(6));
  }
}
static int caption_width(const char *caption){return graphics_text_layout_get_content_size(caption,s_small,GRect(0,0,600,16),GTextOverflowModeFill,GTextAlignmentLeft).w;}
static int status_width(const char *caption){return s_caps?caps_width(s_caps,caption):0;}
static void clock_caption(char *out,size_t size,const char *date,const char *ampm,int width,time_t now,const char *separator,int (*measure)(const char *)){
  char city[44]={0},prefix[24]={0},suffix[8]={0};
  if(city_usable(s_city,now))snprintf(city,sizeof(city),"%.39s%s",(const char *)s_city+8,city_stale(s_city,now)?"?":"");
  if(!city[0]){snprintf(out,size,"%s%s%s",date,date[0]&&ampm[0]?separator:"",ampm);return;}
  if(date[0])snprintf(prefix,sizeof(prefix),"%s%s",date,separator);
  if(ampm[0])snprintf(suffix,sizeof(suffix)," %s",ampm);
  snprintf(out,size,"%s%s%s",prefix,city,suffix);
  if(measure(out)>width){
    size_t n=strlen(city);
    do{if(n)city[--n]=0;snprintf(out,size,"%s%s...%s",prefix,city,suffix);}while(n&&measure(out)>width);
  }
}
static void draw_meridiem(GContext *ctx,const char *ampm,int x,int baseline);
static void draw_zone_column(GContext *ctx,time_t now,const struct tm *local,int x,int y,int alpha);
// Where the clock goes, and the Dymaxion nameplate when it is on and fits
// (a clock below the map moves down to make room for it).
static int clock_layout(int visible,bool *plate,int *px,int *py){
  int h=(s_settings[FLAGS]&STACKED)?84:s_display[1]>=4?40:46;bool shown;int x,y;
  int top=nameplate_layout(s_settings[MAP_Y],s_settings[TIME_Y],h,s_settings[FLAGS]&STACKED,visible,&shown,&x,&y);
  if(!(s_display[2]&DISPLAY_NAMEPLATE)){shown=false;top=clock_top_for_visible(s_settings[TIME_Y],h,visible);}
  if(plate){*plate=shown;if(shown){*px=x;*py=y;}}
  return top;
}
static bool motion_allowed(void){return power_flourishes(power(),s_settings[FLAGS]&MOTION,local_hour(),quiet())&&power_battery_allows_motion(power(),s_battery.charge_percent)&&s_focused;}
static void motion_step(void *context){
  (void)context;s_motion_timer=NULL;
  redraw_part((s_tray_active?PART_TRAY:0)|(s_beside_p!=(s_beside_to?1000:0)?PART_CLOCK:0));
}
// While the minute animation runs, its redraws carry the transitions too:
// one frame timer at a time, however many animations overlap.
static void motion_continue(void){
  if(s_clock_timer){if(s_motion_timer){app_timer_cancel(s_motion_timer);s_motion_timer=NULL;}return;}
  // The last paint must finish the swipe. A slow frame can cross TRAY_MS
  // after sampling it; stopping by elapsed time here would strand that frame.
  bool tray=s_tray_active,beside=s_beside_p!=(s_beside_to?1000:0);
  if((tray||beside)&&!s_motion_timer)s_motion_timer=app_timer_register(TRANSITION_FRAME_MS,motion_step,NULL);
}
static void tray_end(void){s_tray_active=false;if(s_tray_old){free(s_tray_old);s_tray_old=NULL;}}
static void tray_start(int from){
  tray_end();if(!motion_allowed())return;
  s_tray_active=true;s_tray_from=from;s_tray_started=clock_milliseconds();motion_continue();
}
// Where the place times stand between the tray (0) and beside the clock (1000).
static void beside_update(bool target){
  uint32_t now=clock_milliseconds();
  if(!s_beside_known||!motion_allowed()){s_beside_known=true;s_beside_to=target;s_beside_p=s_beside_from=target?1000:0;}
  else{
    if(target!=s_beside_to){s_beside_from=s_beside_p;s_beside_to=target;s_beside_started=now;}
    s_beside_p=beside_progress(s_beside_from,s_beside_to,(int32_t)(now-s_beside_started));
  }
  s_beside=s_beside_p>0;
}
static GColor faded(GColor c,int alpha){return alpha>=1000?c:(GColor){.argb=mix_color(color(0).argb,c.argb,alpha)};}
static void draw_time(GContext *ctx,struct tm *local,time_t now,int visible) {
  int x=s_settings[TIME_X],w=(s_settings[FLAGS]&STACKED)?72:200;
  int h=(s_settings[FLAGS]&STACKED)?84:s_display[1]>=4?40:46;
  int y=clock_layout(visible,NULL,NULL,NULL);
  graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,GRect(x,y,w,h),0,GCornerNone);
  char timebuf[8],datebuf[96];int hour=local->tm_hour;if(!is_24()){hour%=12;if(!hour)hour=12;}
  const char *ampm=is_24()?"":(local->tm_hour<12?"AM":"PM");
  if(s_settings[FLAGS]&STACKED) {
    snprintf(timebuf,sizeof(timebuf),leading_zero()?"%02d":"%d",hour);text(ctx,timebuf,s_large,GRect(x,y-14,w,44),GTextAlignmentCenter,color(6));
    snprintf(timebuf,sizeof(timebuf),"%02d",local->tm_min);text(ctx,timebuf,s_large,GRect(x,y+21,w,44),GTextAlignmentCenter,color(6));
    line(ctx,x+25,y+35,x+47,y+35,color(7));
    clock_caption(datebuf,sizeof(datebuf),"",ampm,w-4,now," / ",caption_width);
    text(ctx,datebuf,s_small,GRect(x,y+69,w,15),GTextAlignmentCenter,color(7));
  }else {
    snprintf(timebuf,sizeof(timebuf),"%02d:%02d",hour,local->tm_min);
    if(hour<10&&!leading_zero())timebuf[0]=' ';
    uint8_t digits[4]={timebuf[0]==' '?10:timebuf[0]-'0',timebuf[1]-'0',timebuf[3]-'0',timebuf[4]-'0'};
    // Beside the place times, the figures shift left and the column fills the right.
    // It glides over first; then the column fades in (the reverse on the way back).
    int cx=x+beside_shift(s_beside_p,zone_clock_shift(zone_position()==ZONE_POSITION_RIGHT)),alpha=column_alpha(s_beside_p);
    if(s_clock_face)draw_flip_time(ctx,local,now,cx,y);
    else if(s_display[1]>=5)draw_system_time(ctx,timebuf,cx,y);
    else draw_span_time(ctx,digits,cx,y);
    if(alpha)draw_zone_column(ctx,now,local,x,y,alpha);
    // 12-hour Chamfer time carries AM/PM beside the figures, top-aligned with them.
    else if(!s_beside&&s_clock_face==&s_chamfer&&*ampm)draw_meridiem(ctx,ampm,x+167,y+9);
  }
}
static struct tm zone_time(const uint8_t *z,time_t now,const struct tm *local,int *delta,bool *stale){
  time_t there=now+(int32_t)zone_offset(z,now)*60;struct tm zone=*gmtime(&there);
  *delta=ordinal(&zone)-ordinal(local);*stale=(uint32_t)now>=read_u32(z+18);
  return zone;
}
static void draw_zones(GContext *ctx,time_t now,struct tm *local,int visible) {
  for(int i=0;i<3;i++) {
    if(!(s_settings[ENABLED]&(1<<i)))continue;
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;
    int x=s_settings[ZONE_X+2*i],y=s_settings[ZONE_Y+2*i];
    if(y+36>visible)continue; // under the Quick View card
    graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,GRect(x,y,60,36),0,GCornerNone);
    int delta;bool stale;struct tm zone=zone_time(z,now,local,&delta,&stale);
    int hour=zone.tm_hour;char label[8],hours[8],day[4];
    bool glyph=custom_palette()?s_palette[PAL_ZONE_GLYPHS]:PALETTE_ZONE_GLYPHS[s_settings[THEME]];
    snprintf(label,sizeof(label),"%.5s",(const char *)z);
    while(strlen(label)>0&&graphics_text_layout_get_content_size(label,s_small,GRect(0,0,200,16),GTextOverflowModeFill,GTextAlignmentLeft).w>(glyph?28:34))
      label[strlen(label)-1]=0;
    bool daylight=illumination((int8_t)z[11],(int8_t)z[12],(int8_t)z[13])>=0;
    pixel_rows(ctx,DAY_NIGHT_GLYPHS[daylight],5,5,x+1,y+5,mark_color(i));
    if(glyph)marker(ctx,GPoint(x+10,y+7),z[10],mark_color(i));
    text(ctx,label,s_small,GRect(x+(glyph?16:9),y,glyph?28:38,14),GTextAlignmentLeft,mark_color(i));
    if(stale)snprintf(day,sizeof(day),"?");
    else if(delta)snprintf(day,sizeof(day),"%+d",delta);else day[0]=0;
    text(ctx,day,s_small,GRect(x+44,y,16,14),GTextAlignmentRight,color(7));
    if(!is_24()){hour%=12;if(!hour)hour=12;}
    snprintf(hours,sizeof(hours),"%02d:%02d",hour,zone.tm_min);
    text(ctx,hours,s_zone,GRect(x+2,y+13,52,22),GTextAlignmentLeft,color(6));
    if(!is_24())text(ctx,zone.tm_hour<12?"A":"P",s_small,GRect(x+53,y+16,7,15),GTextAlignmentLeft,color(7));
    if(i==pulsing_place())line(ctx,x,y+35,x+59,y+35,mark_color(i));
  }
}
static void draw_tray_page(GContext *ctx,time_t now,struct tm *local,int visible,const float *daylight){
  bool zones=visible>=228?!panels_draw(ctx,now,local,s_small,s_caps,palette(),is_24(),daylight):true;
  if(zones)draw_zones(ctx,now,local,visible);
}
// Saves the tray's rows, or slides the saved (old) page out over the new one.
static void tray_rows(GContext *ctx,bool save,int slide){
  GBitmap *fb=graphics_capture_frame_buffer(ctx);if(!fb)return;
  for(int r=0;r<TRAY_H;r++){
    GBitmapDataRowInfo info=gbitmap_get_data_row_info(fb,TRAY_Y+r);
    if(info.min_x>0||info.max_x<199)continue;
    if(save)memcpy(s_tray_old+r*200,info.data,200);else tray_slide_row(s_tray_old+r*200,info.data,slide);
  }
  graphics_release_frame_buffer(ctx,fb);
}
// The bottom tray. Just after a page change the old page leaves to the left
// as the new one arrives: the first frame draws the old page once and keeps
// its pixels (8.8 KB, freed when the swipe ends).
static void draw_tray(GContext *ctx,time_t now,struct tm *local,int visible,const float *daylight){
  uint32_t elapsed=clock_milliseconds()-s_tray_started;
  if(!s_tray_active||visible<228||elapsed>=TRAY_MS||!motion_allowed()){tray_end();draw_tray_page(ctx,now,local,visible,daylight);return;}
  if(!s_tray_old&&(s_tray_old=malloc(200*TRAY_H))){
    int page=panels_page();panels_set_page(s_tray_from);
    draw_tray_page(ctx,now,local,visible,daylight);tray_rows(ctx,true,0);
    panels_set_page(page);
  }
  draw_tray_page(ctx,now,local,visible,daylight);
  if(s_tray_old)tray_rows(ctx,false,tray_slide((int32_t)elapsed));
}
typedef struct {GContext *ctx;GColor color;} CapsPen;
static void caps_span(void *context,int x,int y,int length){CapsPen *pen=context;line(pen->ctx,x,y,x+length-1,y,pen->color);}
// Status line: lining capitals for date and city at the top of the face.
static void draw_meridiem(GContext *ctx,const char *ampm,int x,int baseline){if(s_caps){CapsPen pen={ctx,color(7)};caps_draw(s_caps,ampm,x,baseline,false,caps_span,&pen);}}
static int caps_measure(const char *text,const void *font){return caps_width(font,text);}
// Up to three places stacked beside the clock: label in the place's color with
// its day offset, time in ink, A/P and day offset in the accent
// (shared/zone-column.js).
static void draw_zone_column(GContext *ctx,time_t now,const struct tm *local,int x,int y,int alpha){
  int count=0,row=0;
  for(int i=0;i<3;i++)if(s_settings[ENABLED]&(1<<i))count++;
  for(int i=0;i<3;i++){
    if(!(s_settings[ENABLED]&(1<<i)))continue;
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;int delta;bool stale;
    struct tm zone=zone_time(z,now,local,&delta,&stale);char label[8];
    snprintf(label,sizeof(label),"%.7s",(const char *)z);
    ZoneRow r;zone_row(&r,label,zone.tm_hour,zone.tm_min,is_24(),delta,stale,zone_position()==ZONE_POSITION_RIGHT,caps_measure,s_caps);
    int base=y+zone_row_baseline(row++,count);
    CapsPen mark={ctx,faded(mark_color(i),alpha)},ink={ctx,faded(color(6),alpha)},accent={ctx,faded(color(7),alpha)};
    caps_draw(s_caps,r.label,x+r.label_x,base,false,caps_span,&mark);
    caps_draw(s_caps,r.time,x+r.time_x,base,false,caps_span,&ink);
    caps_draw(s_caps,r.suffix,x+r.suffix_x,base,false,caps_span,&accent);
    caps_draw(s_caps,r.day,x+r.day_x,base,false,caps_span,&accent);
  }
}
// Place times on the map (map_times.c). Placement reruns only when the places,
// the clock format, turning or a place's day-offset reservation change, and
// never inside a redraw: the frame that notices a change draws the map without
// times and schedules placement, which reads the map's coverage from the
// resource into two short-lived bit masks and then redraws.
static int local_offset_minutes(time_t now){
  struct tm l=*localtime(&now),g=*gmtime(&now);
  return (ordinal(&l)-ordinal(&g))*1440+(l.tm_hour-g.tm_hour)*60+(l.tm_min-g.tm_min);
}
// Where each place's glyph and yours are drawn (map_markers.c): true
// positions, except close ones side by side inside a hull. You show only when
// the phone sent your map pixel with a current city.
typedef struct {
  int n,you,index[3];MapMarker points[MAP_MARKERS_MAX],layout[MAP_MARKERS_MAX];uint8_t group[MAP_MARKERS_MAX];
  MapHull hulls[MAP_MARKERS_MAX];int hull_count;
  MapRect own[MAP_MARKERS_MAX],inner[MAP_MARKERS_MAX]; // own: leaders cross freely; inner: their lines hidden
  bool grouped[MAP_MARKERS_MAX];
  bool plate;int plate_x,plate_y; // the Dymaxion nameplate, when shown (screen coordinates)
} MarkerSpots;
static void marker_spots(time_t now,int visible,MarkerSpots *s){
  memset(s,0,sizeof(*s));s->you=-1;int hx,hy;
  for(int i=0;i<3;i++){s->index[i]=-1;if(s_settings[ENABLED]&(1<<i)){
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;s->index[i]=s->n;s->points[s->n++]=(MapMarker){z[8],z[9],2};}}
  if(city_usable(s_city,now)&&city_map_pixel(s_city,&hx,&hy)){s->you=s->n;s->points[s->n++]=(MapMarker){(int16_t)hx,(int16_t)hy,3};}
  map_markers_layout(s->points,s->n,MAP_TIMES_W,MAP_TIMES_H,s->layout,s->group);
  s->hull_count=map_markers_hulls(s->points,s->layout,s->group,s->n,s->hulls);
  map_markers_own(s->points,s->layout,s->group,s->n,s->hulls,s->hull_count,s->own);
  clock_layout(visible,&s->plate,&s->plate_x,&s->plate_y);
  for(int i=0;i<s->n;i++){
    for(int j=0;j<s->n;j++)if(j!=i&&s->group[j]==s->group[i])s->grouped[i]=true;
    const MapRect *o=&s->own[i];
    // Grouped: the hull band; alone: the clearing.
    s->inner[i]=(MapRect){(int16_t)(s->layout[i].x-3),(int16_t)(s->layout[i].y-3),(int16_t)(s->layout[i].x+3),(int16_t)(s->layout[i].y+3)};
    for(int k=0;k<s->hull_count;k++)if(s->grouped[i]&&!memcmp(&s->hulls[k].outer,o,sizeof(*o)))s->inner[i]=s->hulls[k].inner;
  }
}
// Placement inputs from this frame's marker layout.
static void map_times_inputs(time_t now,uint8_t key[18],MapTimePlace places[3],const MarkerSpots *spots){
  bool clock24=is_24(),turn=s_display[2]&ZONE_TIMES_TURN;int here=local_offset_minutes(now);memset(key,0,18);
  for(int i=0;i<3;i++){
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;int k=spots->index[i];bool present=k>=0,reserve=present&&zone_offset(z,now)!=here;
    places[i]=(MapTimePlace){present,present?spots->layout[k].x:0,present?spots->layout[k].y:0,{0},present?spots->own[k]:(MapRect){0,0,0,0}};
    map_time_template(places[i].template_text,clock24,reserve);
    key[4*i]=present;key[4*i+1]=places[i].x;key[4*i+2]=places[i].y;key[4*i+3]=reserve;
  }
  const MapMarker *you=spots->you>=0?&spots->layout[spots->you]:NULL;
  key[12]=clock24;key[13]=turn;key[14]=you?you->x:0xff;key[15]=you?you->y:0xff;
  key[16]=spots->plate;key[17]=spots->plate?(uint8_t)(spots->plate_y-s_settings[MAP_Y]+32):0;
}
static void map_times_place_now(void *context){
  (void)context;s_map_timer=NULL;
  time_t now=time(NULL);uint8_t key[18];MapTimePlace places[3];static MarkerSpots spots;
  marker_spots(now,layer_get_unobstructed_bounds(s_layer).size.h,&spots);map_times_inputs(now,key,places,&spots);
  memcpy(s_map_key,key,sizeof(key));s_map_key_valid=true;memset(s_map_spots,0,sizeof(s_map_spots));
  uint8_t *blocked=calloc(2,MAP_TIMES_MASK_BYTES);if(!blocked)return;
  ResHandle resource=resource_get_handle(RESOURCE_ID_MAP_LANDSCAPE);uint8_t row[MAP_TIMES_W*4];
  for(int y=0;y<MAP_TIMES_H;y++){
    if(resource_load_byte_range(resource,y*MAP_TIMES_W*4,row,sizeof(row))!=sizeof(row)){free(blocked);return;}
    for(int x=0;x<MAP_TIMES_W;x++)if(row[x*4+3]&3){int i=y*MAP_TIMES_W+x;blocked[i>>3]|=1u<<(i&7);}
  }
  // Everyone's areas, and the nameplate's, in map coordinates.
  MapRect obstacles[MAP_MARKERS_MAX+1];int count=spots.n;memcpy(obstacles,spots.own,sizeof(MapRect)*spots.n);
  if(spots.plate){int mx=s_settings[MAP_X],my=s_settings[MAP_Y];
    obstacles[count++]=(MapRect){(int16_t)(spots.plate_x-1-mx),(int16_t)(spots.plate_y-1-my),(int16_t)(spots.plate_x+WORDMARK_WIDTH-mx),(int16_t)(spots.plate_y+WORDMARK_HEIGHT-my)};}
  map_times_place(blocked,places,obstacles,count,spots.layout,spots.n,s_display[2]&ZONE_TIMES_TURN,blocked+MAP_TIMES_MASK_BYTES,s_map_spots);
  free(blocked);redraw();
}
// Whether the cached placement matches the current inputs; if not, schedules it.
static bool map_times_ready(time_t now,const MarkerSpots *spots){
  uint8_t key[18];MapTimePlace places[3];map_times_inputs(now,key,places,spots);
  if(s_map_key_valid&&!memcmp(key,s_map_key,sizeof(key)))return true;
  if(!s_map_timer)s_map_timer=app_timer_register(10,map_times_place_now,NULL);
  return false;
}
typedef struct {GContext *ctx;int ox,oy;} HullPen;
static void hull_pixel(void *context,int x,int y){HullPen *p=context;graphics_draw_pixel(p->ctx,GPoint(p->ox+x,p->oy+y));}
// `hide`: where a leader's line stays hidden (inside its clearing or hull outline).
typedef struct {GContext *ctx;int ox,oy;const MapRect *hide;} MapPen;
static void map_pixel(void *context,int x,int y){
  MapPen *p=context;
  if(p->hide&&x>=p->hide->x0&&x<=p->hide->x1&&y>=p->hide->y0&&y<=p->hide->y1)return;
  graphics_draw_pixel(p->ctx,GPoint(p->ox+x,p->oy+y));
}
static void map_outline(void *context,int x,int y){MapPen *p=context;graphics_fill_rect(p->ctx,GRect(p->ox+x-1,p->oy+y-1,3,3),0,GCornerNone);}
// Outlined leaders first, then their lines and the tiny times, in each place's color.
static void draw_map_times(GContext *ctx,time_t now,const struct tm *local,int mx,int my,const MarkerSpots *spots){
  if(!map_times_ready(now,spots))return;
  graphics_context_set_fill_color(ctx,color(0));
  for(int i=0;i<3;i++)if(s_map_spots[i].ok){
    MapPen pen={ctx,mx,my,NULL};
    map_time_route(s_map_spots[i].points,map_outline,&pen);
  }
  for(int i=0;i<3;i++)if(s_map_spots[i].ok){
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;const MapTimeSpot *s=&s_map_spots[i];
    graphics_context_set_stroke_color(ctx,mark_color(i));
    MapPen line={ctx,mx,my,&spots->inner[spots->index[i]]},label={ctx,mx,my,NULL};
    map_time_route(s->points,map_pixel,&line);
    int delta;bool stale;struct tm zone=zone_time(z,now,local,&delta,&stale);char text[MAP_TIME_TEXT];
    map_time_text(text,zone.tm_hour,zone.tm_min,is_24(),delta,stale);
    map_time_pixels(text,s->orientation,s->total,s->x,s->y,map_pixel,&label);
  }
}
// The bottom band shows the place times: the zones page (or no panels), with
// at least one place above any Quick View card.
static bool zones_in_panel(int visible){
  if(visible>=228&&!panels_showing_zones())return false;
  for(int i=0;i<3;i++)if((s_settings[ENABLED]&(1<<i))&&s_settings[ZONE_Y+2*i]+36<=visible)return true;
  return false;
}
static void draw_status_line(GContext *ctx,struct tm *local,time_t now,const char *battery){
  // AM/PM belongs to the clock when it can show it (Chamfer or stacked), which
  // leaves the status line room for the city.
  bool clock_ampm=(s_settings[FLAGS]&STACKED)||(s_display[1]==4&&!s_beside);
  char date[24],status[96];const char *ampm=is_24()||clock_ampm?"":(local->tm_hour<12?"AM":"PM");
  snprintf(date,sizeof(date),"%s %02d %s",(const char *[]){"Sun","Mon","Tue","Wed","Thu","Fri","Sat"}[local->tm_wday],local->tm_mday,
    (const char *[]){"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"}[local->tm_mon]);
  clock_caption(status,sizeof(status),date,ampm,s_settings[HEADER_SIZE+17]?126:140,now,"  ",status_width);
  CapsPen accent={ctx,color(7)},ink={ctx,color(6)};
  caps_draw(s_caps,status,4,12,false,caps_span,&accent);
  caps_draw(s_caps,battery,195,12,true,caps_span,&ink);
}
// The chart's daylight follows its forecast source. When the current position
// is unavailable, panels use the forecast's day/night samples.
static void draw_tray_section(GContext *ctx,time_t now,struct tm *local,int visible){
  static float daylight[3];int lat,lon,place=panels_weather_place();const float *position=NULL;
  if(place<3){solar_place_vector((const int8_t *)s_settings+HEADER_SIZE+place*ZONE_SIZE+11,daylight);position=daylight;}
  else if(city_usable(s_city,now)&&city_position(s_city,&lat,&lon)){solar_place(lat,lon,daylight);position=daylight;}
  draw_tray(ctx,now,local,visible,position);
}
static void draw_status_section(GContext *ctx,struct tm *local,time_t now){
  graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,GRect(0,0,200,18),0,GCornerNone);
  char battery[8];snprintf(battery,sizeof(battery),"%d%%",s_battery.charge_percent);
  if(s_caps)draw_status_line(ctx,local,now,battery);
  else text(ctx,battery,s_small,GRect(160,0,35,15),GTextAlignmentRight,color(6));
  draw_moon_indicator(ctx,now);
  draw_bluetooth_indicator(ctx);
}
static void update_beside(int visible){
  uint8_t when=(s_display[2]>>2)&3;
  beside_update(s_caps&&zones_beside(s_display[1],s_settings[FLAGS]&STACKED,when,zone_position(),zones_in_panel(visible)));
}
// An animation frame: only the clock strip and/or the tray, plus whatever a
// full frame draws over them afterwards (the tray where a low clock reaches
// it, the status line when AM/PM moves there with the glide).
static void draw_parts(GContext *ctx,time_t now,struct tm *local,int visible){
  bool beside=s_beside,tray=s_parts&PART_TRAY;
  if(s_parts&PART_CLOCK){
    update_beside(visible);draw_time(ctx,local,now,visible);
    int h=(s_settings[FLAGS]&STACKED)?84:s_display[1]>=4?40:46;
    if(clock_layout(visible,NULL,NULL,NULL)+h>TRAY_Y)tray=true;
  }
  if(tray)draw_tray_section(ctx,now,local,visible);
  if(s_beside!=beside)draw_status_section(ctx,local,now);
}
static void update_proc(Layer *layer,GContext *ctx) {
  time_t now=time(NULL);struct tm local=*localtime(&now);
  graphics_context_set_antialiased(ctx,false);
  if(!s_full&&s_parts&&!s_map_dirty){
    draw_parts(ctx,now,&local,layer_get_unobstructed_bounds(layer).size.h);
    s_parts=0;motion_continue();return;
  }
  s_full=false;s_parts=0;
  graphics_context_set_fill_color(ctx,color(0));graphics_fill_rect(ctx,layer_get_bounds(layer),0,GCornerNone);
  if(s_map_dirty){sun_update(now-now%300);rebuild_map();}
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
  if((s_settings[FLAGS]&SUN)&&(s_settings[FLAGS]&DAY_NIGHT)&&s_map){
    GPoint sun=GPoint(mx+s_sun_point.x,my+s_sun_point.y);
    pixel_rows(ctx,SUN_HALO,SUN_SIZE+2,SUN_SIZE+2,sun.x-SUN_SIZE/2-1,sun.y-SUN_SIZE/2-1,color(0));
    pixel_rows(ctx,SUN_GLYPH,SUN_SIZE,SUN_SIZE,sun.x-SUN_SIZE/2,sun.y-SUN_SIZE/2,color(7));
  }
  // Quick View (timeline peek) covers the bottom of the screen: the bottom band
  // is skipped and the clock kept above the card.
  int visible=layer_get_unobstructed_bounds(layer).size.h;bool panel_zones=zones_in_panel(visible);
  uint8_t when=(s_display[2]>>2)&3;
  // Clearings (a group's hull inside) first, then map times, then hull outlines
  // (so a grouped leader starts at its hull), then glyphs.
  static MarkerSpots spots;marker_spots(now,visible,&spots);
  for(int i=0;i<3;i++){int k=spots.index[i];if(k>=0&&!spots.grouped[k])pixel_rows(ctx,MARKER_HALO,7,7,mx+spots.layout[k].x-3,my+spots.layout[k].y-3,color(0));}
  // Your bullseye keeps its clearing even in a group: it stands proud of the hull.
  if(spots.you>=0)pixel_rows(ctx,HERE_HALO,HERE_SIZE+2,HERE_SIZE+2,mx+spots.layout[spots.you].x-HERE_SIZE/2-1,my+spots.layout[spots.you].y-HERE_SIZE/2-1,color(0));
  HullPen ground={ctx,mx,my};graphics_context_set_stroke_color(ctx,color(0));
  for(int k=0;k<spots.hull_count;k++)map_hull_ground(&spots.hulls[k],hull_pixel,&ground);
  if(s_map&&zones_on_map(when,zone_position(),panel_zones))draw_map_times(ctx,now,&local,mx,my,&spots);
  // Hull outlines in the ground color, like each glyph's clearing ring.
  graphics_context_set_stroke_color(ctx,color(0));
  for(int k=0;k<spots.hull_count;k++)map_hull_outline(&spots.hulls[k],hull_pixel,&ground);
  for(int i=0;i<3;i++)if(spots.index[i]>=0) {
    const uint8_t *z=s_settings+HEADER_SIZE+i*ZONE_SIZE;const MapMarker *m=&spots.layout[spots.index[i]];GPoint pos=GPoint(mx+m->x,my+m->y);
    marker_glyph(ctx,pos,z[10],mark_color(i));
    if(i==pulsing_place())pixel_rows(ctx,PULSE_GLYPHS[s_frame%4],PULSE_SIZE,PULSE_SIZE,pos.x-8,pos.y-8,mark_color(i));
  }
  // You: a bullseye one size up, in the clock's ink.
  // The Dymaxion nameplate, in the accent color, when there is room.
  if(spots.plate){graphics_context_set_stroke_color(ctx,color(7));HullPen plate={ctx,0,0};nameplate_pixels(spots.plate_x,spots.plate_y,hull_pixel,&plate);}
  if(spots.you>=0)pixel_rows(ctx,HERE_GLYPH,HERE_SIZE,HERE_SIZE,mx+spots.layout[spots.you].x-HERE_SIZE/2,my+spots.layout[spots.you].y-HERE_SIZE/2,color(6));
  update_beside(visible);
  draw_time(ctx,&local,now,visible);
  draw_tray_section(ctx,now,&local,visible);
  draw_status_section(ctx,&local,now);
  motion_continue();
}
static void animation_step(void *context) {
  s_animation=NULL;s_frame++;redraw();
  if(s_frame<s_frames)s_animation=app_timer_register(PULSE_RING_MS,animation_step,NULL);
}
static void pulse(void) {
  if(s_animation){app_timer_cancel(s_animation);s_animation=NULL;}
  s_frame=s_frames=0;
  if(power_flourishes(power(),s_settings[FLAGS]&MOTION,local_hour(),quiet())&&power_battery_allows_motion(power(),s_battery.charge_percent)&&s_settings[ENABLED]) {
    for(int i=0;i<3;i++)if(s_settings[ENABLED]&(1<<i))s_frames+=4;
    s_animation=app_timer_register(PULSE_RING_MS,animation_step,NULL);}
  redraw();
}
// The marker pulse plays once when the face opens and again only when the
// bottom panel comes back round to the time zones, never on a timer or a
// settings change, so the animation costs next to nothing.
static bool s_zones_shown;
static void pulse_on_zones(void){
  bool shown=panels_showing_zones();
  if(shown&&!s_zones_shown)pulse();
  s_zones_shown=shown;
}
static uint64_t gesture_now(void){time_t seconds;uint16_t ms;time_ms(&seconds,&ms);return (uint64_t)seconds*1000+ms;}
// Pebble's accelerometer events are distinct from touchscreen taps. The lit-only
// option subscribes to motion only while the focused face has its light on.
static void tapped(AccelAxisType axis,int32_t direction) {
  if(!s_focused||!panels_shake_enabled())return;
  uint64_t now=gesture_now();
  if(panels_light_only()&&!panel_light_ready(&s_gesture_light,light_is_on(),now))return;
  int page=panels_page();
  if(panel_tap(&s_tap,now,panels_flicks())&&panels_cycle(time(NULL))){tray_start(page);redraw();pulse_on_zones();}
}
static void backlight_changed(bool on){
  panel_light_update(&s_gesture_light,on,gesture_now());
  configure_shake();
  // A screen tap can light the watch even though watchfaces cannot receive it.
  if(on&&s_focused&&power_dark_paused(power(),local_hour(),quiet()))redraw();
}
static void configure_shake(void) {
  bool observe_light=s_focused&&((panels_shake_enabled()&&panels_light_only())||((power()[0]&(POWER_NIGHT|POWER_QUIET_TIME))&&(power()[0]&POWER_DARK_PAUSE)));
  if(observe_light!=s_backlight_subscribed){
    s_gesture_light=(PanelLightState){0};
    if(observe_light){backlight_service_subscribe(backlight_changed);panel_light_update(&s_gesture_light,light_is_on(),gesture_now());}
    else backlight_service_unsubscribe();
    s_backlight_subscribed=observe_light;
  }
  bool wanted=s_focused&&panels_shake_enabled()&&(!panels_light_only()||s_gesture_light.on);
  if(wanted==s_accel_subscribed)return;
  memset(&s_tap,0,sizeof(s_tap));
  if(wanted)accel_tap_service_subscribe(tapped);else accel_tap_service_unsubscribe();
  s_accel_subscribed=wanted;
}
static void request_sync(void) {
  DictionaryIterator *iter;
  if(app_message_outbox_begin(&iter)==APP_MSG_OK){dict_write_uint8(iter,MESSAGE_KEY_REQUEST,1);app_message_outbox_send();}
}
static void tick(struct tm *local_time,TimeUnits changed) {
  // The terminator moves about a pixel every few minutes: relight the map on the
  // chosen interval (every other hour in the night saver) instead of reading
  // and shading all 20,800 pixels each minute, and never while day and night
  // is off, when the map does not change with time. The place times' daylight
  // dots still follow the sun every five minutes then.
  time_t now=time(NULL);
  if(power_relight(power(),s_settings[FLAGS]&DAY_NIGHT,local_time->tm_hour,local_time->tm_min,quiet()))s_map_dirty=true;
  else if(!(s_settings[FLAGS]&DAY_NIGHT)&&local_time->tm_min%5==0)sun_update(now-now%300);
  // Paused in the dark (night saver): with the backlight off the screen keeps
  // its last frame; the backlight coming on redraws it (backlight_changed),
  // and while it stays on the minute keeps up.
  if(!power_dark_paused(power(),local_time->tm_hour,quiet())||light_is_on())redraw();
  int page=panels_page();if(panels_tick(now))tray_start(page);pulse_on_zones();
  if(s_clock_face)clock_prepare(local_time,now,true);
  int interval=panels_refresh_minutes();if(!(s_city[1]&1)&&interval>60)interval=60;
  if((now/60)%interval==0)request_sync();
}
static void obstruction_changed(AnimationProgress progress,void *context){redraw();}
static void obstruction_done(void *context){redraw();}
static void battery_changed(BatteryChargeState state) {
  s_battery=state;
  if(!power_battery_allows_motion(power(),state.charge_percent)&&s_animation){app_timer_cancel(s_animation);s_animation=NULL;s_frame=s_frames=0;}
  if(!power_battery_allows_motion(power(),state.charge_percent))clock_stop();
  configure_shake();
  redraw();
}
static BuzzState s_buzz;
static void connection_changed(bool connected) {
  // Only real changes arrive here, never the state at launch; Quiet Time mutes the buzz.
  if(connection_buzz(&s_buzz,connected,(uint32_t)time(NULL),s_settings[FLAGS])&&!quiet_time_is_active()){
    if(connected)vibes_short_pulse();else vibes_double_pulse();
  }
  s_connected=connected;redraw();if(connected)request_sync();
}
static void received(DictionaryIterator *iter,void *context) {
  if(panels_receive(iter))memset(&s_tap,0,sizeof(s_tap));
  Tuple *display=dict_find(iter,MESSAGE_KEY_DISPLAY);
  uint8_t next_display[DISPLAY_SIZE];
  if(display&&display->type==TUPLE_BYTE_ARRAY&&display_normalize(next_display,display->value->data,display->length)&&memcmp(s_display,next_display,DISPLAY_SIZE)){
    clock_stop();s_clock_ready=false;
    if(s_display[3]!=next_display[3])s_map_dirty=true;
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
    memcpy(s_settings,t->value->data,SETTINGS_SIZE);persist_write_data(1,s_settings,SETTINGS_SIZE);s_map_dirty=true;
    clock_configure();
  }
  Tuple *custom=dict_find(iter,MESSAGE_KEY_PALETTE);
  if(custom&&custom->type==TUPLE_BYTE_ARRAY&&palette_valid(custom->value->data,custom->length)){
    uint8_t candidate[PALETTE_SIZE];memcpy(candidate,custom->value->data,PALETTE_SIZE);
    if(candidate[PAL_THEME]==s_settings[THEME]&&memcmp(s_palette,candidate,PALETTE_SIZE)){
      clock_stop();s_clock_ready=false;
      memcpy(s_palette,candidate,PALETTE_SIZE);persist_write_data(4,s_palette,PALETTE_SIZE);s_map_dirty=true;
    }
  }else if(!custom&&t&&t->type==TUPLE_BYTE_ARRAY&&settings_valid(t->value->data,t->length)&&s_palette[PAL_ENABLED]){
    // An older companion knows only presets. Do not leave a saved custom
    // palette active over its newly received preset settings.
    memset(s_palette,0,PALETTE_SIZE);persist_delete(4);s_map_dirty=true;
    clock_stop();s_clock_ready=false;
  }
  configure_shake();
  redraw();pulse_on_zones();
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
  // Clear: the face paints every pixel itself on a full redraw, and animation
  // frames rely on the screen keeping the rest of the last frame.
  window_set_background_color(s_window,GColorClear);window_stack_push(s_window,false);
  s_battery=battery_state_service_peek();s_connected=connection_service_peek_pebble_app_connection();
  battery_state_service_subscribe(battery_changed);
  connection_service_subscribe((ConnectionHandlers){.pebble_app_connection_handler=connection_changed});
  tick_timer_service_subscribe(MINUTE_UNIT,tick);configure_shake();
  unobstructed_area_service_subscribe((UnobstructedAreaHandlers){.change=obstruction_changed,.did_change=obstruction_done},NULL);
  app_focus_service_subscribe(focus_changed);
  app_message_register_inbox_received(received);app_message_open(1024,64);
  request_sync();s_zones_shown=panels_showing_zones();pulse();
}
static void deinit(void) {
  clock_stop();app_focus_service_unsubscribe();if(s_map_timer)app_timer_cancel(s_map_timer);
  if(s_animation)app_timer_cancel(s_animation);
  if(s_motion_timer)app_timer_cancel(s_motion_timer);
  tray_end();
  tick_timer_service_unsubscribe();unobstructed_area_service_unsubscribe();if(s_accel_subscribed)accel_tap_service_unsubscribe();if(s_backlight_subscribed)backlight_service_unsubscribe();battery_state_service_unsubscribe();connection_service_unsubscribe();app_message_deregister_callbacks();
  layer_destroy(s_layer);window_destroy(s_window);if(s_map)gbitmap_destroy(s_map);
  fonts_unload_custom_font(s_large);fonts_unload_custom_font(s_small);fonts_unload_custom_font(s_zone);
  clock_release();free(s_caps);
}
int main(void) {init();app_event_loop();deinit();}
