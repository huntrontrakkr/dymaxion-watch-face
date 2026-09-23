#include "city.h"
#include "settings.h"
bool city_valid(const uint8_t *p,unsigned n){
  if(n!=CITY_SIZE||p[0]!=1||p[1]>3||p[2]||p[3]||p[47])return false;
  bool end=false;
  for(int i=8;i<CITY_SIZE;i++){
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
bool city_stale(const uint8_t *p,uint32_t now){return !(p[1]&1)&&((p[1]&2)||(uint64_t)now>(uint64_t)read_u32(p+4)+7200);}
