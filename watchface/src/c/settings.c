#include "settings.h"
#include "generated/palette_sizes.h"
int16_t read_i16(const uint8_t *p) { return (int16_t)((uint16_t)p[0] | (uint16_t)p[1]<<8); }
uint32_t read_u32(const uint8_t *p) { return (uint32_t)p[0] | (uint32_t)p[1]<<8 | (uint32_t)p[2]<<16 | (uint32_t)p[3]<<24; }
int32_t calendar_ordinal(int year,int month,int day) {
  static const uint16_t before_month[12]={0,31,59,90,120,151,181,212,243,273,304,334};
  int previous=year-1;
  int leap=(year%4==0 && (year%100!=0 || year%400==0));
  return 365*previous+previous/4-previous/100+previous/400
    +before_month[month-1]+day-1+(month>2 && leap);
}
bool settings_valid(const uint8_t *s,unsigned length) {
  if(length!=SETTINGS_SIZE || s[VERSION]!=7 || s[THEME]>=THEME_COUNT || s[FORMAT]>2 || s[ORIENTATION]!=0 || s[ENABLED]>7)return false;
  if(s[TIME_X] || s[TIME_Y]<16 || s[TIME_Y]>182)return false;
  if(s[MAP_X]!=0 || s[MAP_Y]>124)return false;
  for(int i=0;i<3;i++) {
    if(s[ZONE_X+2*i]>140 || s[ZONE_Y+2*i]<16 || s[ZONE_Y+2*i]>192)return false;
    const uint8_t *z=s+HEADER_SIZE+i*ZONE_SIZE;
    if(z[17]>(i==0?1:0) || (z[70]&0xc0)!=0xc0 || z[71])return false;
    if(!z[0] || z[7] || z[8]>=200 || z[9]>=104 || z[10]>=MARKER_COUNT || z[16]>8)return false;
    for(int j=0;j<7 && z[j];j++)if(!((z[j]>='A'&&z[j]<='Z')||(z[j]>='0'&&z[j]<='9')||z[j]==' '||z[j]=='+'||z[j]=='-'))return false;
    int off=read_i16(z+14);if(off < -840 || off > 840)return false;
    uint32_t prev=0;
    for(int j=0;j<z[16];j++) {
      const uint8_t *t=z+22+6*j;uint32_t until=read_u32(t);off=read_i16(t+4);
      if(until<=prev || off < -840 || off > 840)return false;
      prev=until;
    }
    if(read_u32(z+18)<=prev)return false;
  }
  return true;
}
int16_t zone_offset(const uint8_t *z,uint32_t epoch) {
  int16_t offset=read_i16(z+14);
  for(int i=0;i<z[16];i++)if(epoch>=read_u32(z+22+6*i))offset=read_i16(z+26+6*i);
  return offset;
}

int clock_top_for_visible(int top,int height,int visible){
  if(top+height>visible-2)top=visible-2-height;
  return top<18?18:top;
}
bool connection_buzz(BuzzState *s,bool connected,uint32_t now,uint8_t flags){
  if(!(flags&BUZZ_DISCONNECT)||(connected&&!(flags&BUZZ_RECONNECT)))return false;
  if(s->last&&now-s->last<BUZZ_REST_S)return false;
  s->last=now;return true;
}
