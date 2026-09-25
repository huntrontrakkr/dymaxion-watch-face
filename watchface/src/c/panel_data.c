#include "panel_data.h"
#include "settings.h"
#include <stdlib.h>
static bool one_of(uint8_t v,const uint8_t *values,unsigned n){for(unsigned i=0;i<n;i++)if(v==values[i])return true;return false;}
bool footer_valid(const uint8_t *p,unsigned length){
  if(length!=FOOTER_SIZE||p[0]!=1||p[F_ENABLED]>1||p[F_COUNT]<1||p[F_COUNT]>5||p[F_HOME]>=PANEL_COUNT)return false;
  unsigned used=0;for(int i=0;i<5;i++){int v=p[F_ORDER+i];if(i<p[F_COUNT]){if(v>=PANEL_COUNT||(used&(1<<v)))return false;used|=1<<v;}else if(v!=255)return false;}
  if(!(used&(1<<p[F_HOME])))return false;
  const uint8_t rotations[]={0,1,2,5,10,15,30,60},horizons[]={12,24,48},refresh[]={30,60,120,180};
  if(!one_of(p[F_ROTATE],rotations,8)||!one_of(p[F_HORIZON],horizons,3)||!one_of(p[F_REFRESH],refresh,4)||p[F_RAIN]>2||p[F_WEEKENDS]>2)return false;
  if((p[F_WEEK_START]>1&&p[F_WEEK_START]!=6)||p[F_HOLIDAYS]>=HOLIDAY_REGION_COUNT)return false;
  const uint8_t booleans[]={F_FAHRENHEIT,F_DAYLIGHT,F_GRID,F_SOLAR,F_PREVIOUS,F_TODAY_OUTLINE,F_TEMP_FIXED,F_HUMID_AUTO,F_RAIN_INCH,F_TIDE_FEET,F_WEATHER_ON,F_RANGE_LABELS,F_TIDE_ZERO,F_TIDE_ON,F_SHAKE};
  for(unsigned i=0;i<sizeof(booleans);i++)if(p[booleans[i]]>1)return false;
  for(int i=21;i<=28;i++)if((p[i]&0xc0)!=0xc0)return false;
  int lo=read_i16(p+F_TEMP_MIN),hi=read_i16(p+F_TEMP_MAX);if(lo< -1500||hi>1500||hi-lo<10)return false;
  int rain=(uint16_t)read_i16(p+F_RAIN_MAX),tlo=read_i16(p+F_TIDE_MIN),thi=read_i16(p+F_TIDE_MAX);
  if(rain<1||rain>1000||p[F_TIDE_FIXED]>1||tlo< -10000||thi>10000||thi-tlo<10)return false;
  // Flick count 1-3; 0 is a footer saved before the setting existed (two flicks).
  if(p[F_WEATHER_PLACE]>3||p[F_HUMID_LINE]>1||p[F_FLICKS]>3)return false;
  for(int i=53;i<FOOTER_SIZE;i++)if(p[i])return false;
  return true;
}
static bool label_valid(const uint8_t *p){if(p[7])return false;for(int i=0;i<7&&p[i];i++)if(!((p[i]>='A'&&p[i]<='Z')||(p[i]>='0'&&p[i]<='9')||p[i]==' '||p[i]=='-'||p[i]=='+'))return false;return true;}
bool environment_valid(const uint8_t *p,unsigned length,bool tide){
  if(length!=(tide?TIDE_SIZE:WEATHER_SIZE)||p[0]!=1||(p[1]!=0&&p[1]!=49)||p[2]>3||p[3]!=1)return false;
  if(!label_valid(p+(tide?28:24)))return false;
  if(!p[1])return true;
  if(!read_u32(p+4)||!read_u32(p+8))return false;
  int a=tide?24:20;for(int i=a;i<a+4;i+=2)if((uint16_t)read_i16(p+i)>=1440)return false;
  if(tide&&(!label_valid(p+36)||read_i16(p+20)<-3000||read_i16(p+20)>3000||read_i16(p+22)<-3000||read_i16(p+22)>3000))return false;
  for(int i=0;i<49;i++){
    const uint8_t *s=p+(tide?48+i*4:32+i*8);int value=read_i16(s);
    if(tide){if(value< -3000||value>3000||s[2]>23||s[3])return false;}
    else if(value< -1000||value>650||s[2]>100||s[3]>100||(uint16_t)read_i16(s+4)>5000||s[6]>1||s[7]>23)return false;
  }
  return true;
}
int environment_start_index(const uint8_t *p,uint32_t now){
  if(!p[1])return -1;
  uint32_t start=read_u32(p+8);if((uint64_t)now+3600<start)return -1;
  int i=now>start?(now-start)/3600:0;return i<p[1]-1?i:-1;
}
static int days_in_month(int y,int m){static const uint8_t n[]={31,28,31,30,31,30,31,31,30,31,30,31};return n[m-1]+(m==2&&y%4==0&&(y%100!=0||y%400==0));}
static void shift_day(CalendarCell *d,int dir){d->day+=dir;d->weekday=(d->weekday+dir+7)%7;if(d->day==0){if(--d->month==0){d->month=12;d->year--;}d->day=days_in_month(d->year,d->month);}else if(d->day>days_in_month(d->year,d->month)){d->day=1;if(++d->month==13){d->month=1;d->year++;}}}
// Region order matches HOLIDAY_REGIONS in shared/calendar.js.
static int32_t easter_ordinal(int year){
  int a=year%19,b=year/100,c=year%100,d=b/4,e=b%4,f=(b+8)/25,g=(b-f+1)/3,h=(19*a+b-d-g+15)%30,i=c/4,k=c%4;
  int l=(32+2*e+2*i-h-k)%7,m=(a+11*h+22*l)/451,t=h+l-7*m+114;
  return calendar_ordinal(year,t/31,t%31+1);
}
typedef struct {const uint8_t (*fixed)[2];uint8_t fixed_count;const uint8_t (*weekday)[3];uint8_t weekday_count;const int8_t *easter;uint8_t easter_count;} HolidayRules;
static const uint8_t CA_FIXED[][2]={{1,1},{7,1},{9,30},{11,11},{12,25},{12,26}},CA_WEEKDAY[][3]={{5,1,18},{9,1,1},{10,1,8}};
static const uint8_t MX_FIXED[][2]={{1,1},{5,1},{9,16},{12,25}},MX_WEEKDAY[][3]={{2,1,1},{3,1,15},{11,1,15}};
static const uint8_t UK_FIXED[][2]={{1,1},{12,25},{12,26}},UK_WEEKDAY[][3]={{5,1,1},{5,1,25},{8,1,25}};
static const uint8_t DE_FIXED[][2]={{1,1},{5,1},{10,3},{12,25},{12,26}};
static const uint8_t FR_FIXED[][2]={{1,1},{5,1},{5,8},{7,14},{8,15},{11,1},{11,11},{12,25}};
static const uint8_t AU_FIXED[][2]={{1,1},{1,26},{4,25},{12,25},{12,26}},AU_WEEKDAY[][3]={{6,1,8}};
static const int8_t GOOD_FRIDAY_MONDAY[]={-2,1},DE_EASTER[]={-2,1,39,50},FR_EASTER[]={1,39,50};
static const HolidayRules RULES[HOLIDAY_REGION_COUNT]={
  [2]={CA_FIXED,6,CA_WEEKDAY,3,GOOD_FRIDAY_MONDAY,2},[3]={MX_FIXED,4,MX_WEEKDAY,3,NULL,0},
  [4]={UK_FIXED,3,UK_WEEKDAY,3,GOOD_FRIDAY_MONDAY,2},[5]={DE_FIXED,5,NULL,0,DE_EASTER,4},
  [6]={FR_FIXED,8,NULL,0,FR_EASTER,3},[7]={AU_FIXED,5,AU_WEEKDAY,1,GOOD_FRIDAY_MONDAY,2}
};
static bool regional_holiday(const CalendarCell *d,int region){
  const HolidayRules *r=&RULES[region];int stamp=calendar_ordinal(d->year,d->month,d->day);
  for(int i=0;i<r->fixed_count;i++)if(r->fixed[i][0]==d->month&&r->fixed[i][1]==d->day)return true;
  for(int i=0;i<r->weekday_count;i++)if(r->weekday[i][0]==d->month&&r->weekday[i][1]==d->weekday&&d->day>=r->weekday[i][2]&&d->day<r->weekday[i][2]+7)return true;
  if(r->easter_count){int32_t easter=easter_ordinal(d->year);for(int i=0;i<r->easter_count;i++)if(easter+r->easter[i]==stamp)return true;}
  return false;
}
static bool holiday(const CalendarCell *d){
  int m=d->month,n=d->day,w=d->weekday,stamp=calendar_ordinal(d->year,m,n);
  static const uint8_t fixed[][2]={{1,1},{6,19},{7,4},{11,11},{12,25}};
  for(int y=d->year;y<=d->year+1;y++)for(int i=0;i<5;i++){
    int ordinal=calendar_ordinal(y,fixed[i][0],fixed[i][1]),weekday=(ordinal+1)%7;
    if(ordinal+(weekday==6?-1:weekday==0?1:0)==stamp)return true;
  }
  return (w==1&&((m==1&&n>=15&&n<=21)||(m==2&&n>=15&&n<=21)||(m==5&&n+7>31)||(m==9&&n<=7)||(m==10&&n>=8&&n<=14)))||(m==11&&w==4&&n>=22&&n<=28);
}
void panel_calendar(int year,int month,int day,int weekday,const uint8_t *config,CalendarCell out[14]){
  CalendarCell d={.year=year,.month=month,.day=day,.weekday=weekday};
  int offset=(weekday-config[F_WEEK_START]+7)%7+(config[F_PREVIOUS]?7:0);
  for(int i=0;i<offset;i++)shift_day(&d,-1);
  for(int i=0;i<14;i++){
    d.today=i==offset;d.holiday=config[F_HOLIDAYS]==1?holiday(&d):config[F_HOLIDAYS]>1&&regional_holiday(&d,config[F_HOLIDAYS]);
    d.weekend=config[F_WEEKENDS]==0?(d.weekday==0||d.weekday==6):config[F_WEEKENDS]==1?(d.weekday==5||d.weekday==6):false;
    out[i]=d;shift_day(&d,1);
  }
}
bool panel_tap(TapState *s,uint64_t now,int required){
  if(now<s->rest)return false;
  if(s->count&&now-s->last<TAP_SAME_MS)return false;
  if(s->count&&now-s->last>TAP_GAP_MS)s->count=0;
  s->count++;s->last=now;
  if(s->count<required)return false;
  s->count=0;s->rest=now+TAP_REST_MS;return true;
}
