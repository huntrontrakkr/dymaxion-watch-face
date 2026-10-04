#define WATCH_TEXT_ENGLISH
#include "watch_text.h"
#include <stdio.h>
#include <string.h>
static const uint8_t *s_pack;
static uint16_t u16(const uint8_t *p){return (uint16_t)(p[0]|p[1]<<8);}
bool watch_text_valid(const uint8_t *p,size_t length){
  if(!p||length<8||p[0]!='W'||p[1]!='T'||p[2]!=1||p[3]!=WT_STRING_COUNT||length<8u+2u*WT_STRING_COUNT)return false;
  size_t table=u16(p+6),glyphs=u16(p+4);
  if(table>length||table+10*glyphs>length)return false;
  // Every string ends before the glyph table.
  for(int i=0;i<WT_STRING_COUNT;i++){size_t at=u16(p+8+2*i);if(at<8u+2u*WT_STRING_COUNT||at>=table||!memchr(p+at,0,table-at))return false;}
  for(size_t i=0;i<glyphs;i++){
    const uint8_t *e=p+table+10*i;size_t bits=u16(e+8),size=(size_t)((e[5]+7)/8)*e[6];
    if(bits+size>length||(i&&u16(e)<=u16(e-10)))return false;
  }
  return true;
}
void watch_text_use(const uint8_t *pack,size_t length){s_pack=watch_text_valid(pack,length)?pack:NULL;}
const char *watch_text(int key){
  if(key<0||key>=WT_STRING_COUNT)return "";
  return s_pack?(const char *)s_pack+u16(s_pack+8+2*key):WT_ENGLISH[key];
}
bool watch_text_glyph(uint32_t code,WatchGlyph *glyph){
  if(!s_pack)return false;
  const uint8_t *table=s_pack+u16(s_pack+6);int lo=0,hi=u16(s_pack+4)-1;
  while(lo<=hi){
    int mid=(lo+hi)/2;const uint8_t *e=table+10*mid;uint32_t at=u16(e);
    if(at==code){*glyph=(WatchGlyph){e[2],(int8_t)e[3],e[4],e[5],e[6],s_pack+u16(e+8)};return true;}
    if(at<code)lo=mid+1;else hi=mid-1;
  }
  return false;
}
uint32_t watch_text_next(const char **text){
  const uint8_t *p=(const uint8_t *)*text;uint32_t c=*p;
  if(!c)return 0;
  int more=c<0x80?0:(c&0xe0)==0xc0?1:(c&0xf0)==0xe0?2:(c&0xf8)==0xf0?3:-1;
  if(more<0){*text+=1;return '?';}
  c&=more?0x3f>>more:0x7f;
  for(int i=1;i<=more;i++){if((p[i]&0xc0)!=0x80){*text+=i;return '?';}c=c<<6|(p[i]&0x3f);}
  *text+=more+1;return c;
}
void watch_text_fill(char *out,size_t size,const char *pattern,const char *weekday,int day,const char *month,const char *month2,int year){
  size_t n=0;if(!size)return;
  for(const char *p=pattern;*p&&n+1<size;){
    char value[16];const char *insert=NULL;int skip=0;
    if(!strncmp(p,"{w}",3)){insert=weekday;skip=3;}
    else if(!strncmp(p,"{dd}",4)){snprintf(value,sizeof(value),"%02d",day);insert=value;skip=4;}
    else if(!strncmp(p,"{d}",3)){snprintf(value,sizeof(value),"%d",day);insert=value;skip=3;}
    else if(!strncmp(p,"{m2}",4)){insert=month2;skip=4;}
    else if(!strncmp(p,"{m}",3)){insert=month;skip=3;}
    else if(!strncmp(p,"{y}",3)){snprintf(value,sizeof(value),"%d",year);insert=value;skip=3;}
    if(insert){for(;*insert&&n+1<size;insert++)out[n++]=*insert;p+=skip;}
    else out[n++]=*p++;
  }
  out[n]=0;
}
