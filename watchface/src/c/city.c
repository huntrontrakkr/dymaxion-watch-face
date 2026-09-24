#include "city.h"
#include "settings.h"
bool city_valid(const uint8_t *p,unsigned n){
  // Flags: 1 manual, 2 stale, 4 position (bytes 48-51), 8 its map pixel (bytes 2-3, needs 4).
  if(n!=CITY_SIZE||p[0]!=1||p[1]>15||((p[1]&1)&&(p[1]&4))||((p[1]&8)&&!(p[1]&4))||p[47])return false;
  if(p[1]&8){if(p[2]>=200||p[3]>=104)return false;}
  else if(p[2]||p[3])return false;
  int lat=(int16_t)(p[48]|p[49]<<8),lon=(int16_t)(p[50]|p[51]<<8);
  if(p[1]&4){if(lat< -900||lat>900||lon< -1800||lon>1800)return false;}
  else if(lat||lon)return false;
  bool end=false;
  for(int i=8;i<48;i++){
    uint8_t c=p[i];if(!c){end=true;continue;}
    if(end||!((c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c==' '||c=='.'||c==','||c=='-'))return false;
  }
  return !p[8]||(p[1]&1)||read_u32(p+4)>0;
}
bool city_usable(const uint8_t *p,uint32_t now){
  if(!p[8])return false;
  if(p[1]&1)return true;
  uint32_t fetched=read_u32(p+4);
  return fetched>0&&(uint64_t)fetched<=(uint64_t)now+300&&(uint64_t)now<=(uint64_t)fetched+21600;
}
bool city_map_pixel(const uint8_t *p,int *x,int *y){
  if(!(p[1]&8))return false;
  *x=p[2];*y=p[3];return true;
}
bool city_position(const uint8_t *p,int *lat10,int *lon10){
  if(!(p[1]&4))return false;
  *lat10=(int16_t)(p[48]|p[49]<<8);*lon10=(int16_t)(p[50]|p[51]<<8);return true;
}
bool city_stale(const uint8_t *p,uint32_t now){return !(p[1]&1)&&((p[1]&2)||(uint64_t)now>(uint64_t)read_u32(p+4)+7200);}
