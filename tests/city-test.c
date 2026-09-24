#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "city.h"
#include "settings.h"
int main(int argc,char **argv){
  assert(argc==3);uint8_t p[CITY_SIZE],bad[CITY_SIZE];
  for(int i=1;i<3;i++){
    FILE *f=fopen(argv[i],"rb");assert(f);assert(fread(p,1,CITY_SIZE,f)==CITY_SIZE);fclose(f);
    assert(city_valid(p,CITY_SIZE));assert(!city_valid(p,CITY_SIZE-1));
    assert(strcmp((char *)p+8,"Norfolk")==0);
    uint32_t now=read_u32(p+4);
    assert(city_usable(p,now));assert(!city_stale(p,now));
    assert(city_usable(p,now+21600));assert(city_usable(p,now+21601)==!!(p[1]&1));
    assert(city_stale(p,now+7201)==!(p[1]&1));
    memcpy(bad,p,CITY_SIZE);bad[47]='X';assert(!city_valid(bad,CITY_SIZE));
    memcpy(bad,p,CITY_SIZE);bad[8]='\n';assert(!city_valid(bad,CITY_SIZE));
    memcpy(bad,p,CITY_SIZE);bad[2]=1;assert(!city_valid(bad,CITY_SIZE));
    int lat=0,lon=0;
    if(p[1]&1)assert(!city_position(p,&lat,&lon));
    else{
      assert(city_position(p,&lat,&lon)&&lat==369&&lon==-763);
      memcpy(bad,p,CITY_SIZE);bad[48]=0x90;bad[49]=0x03;assert(!city_valid(bad,CITY_SIZE)); // 91.2 degrees
      memcpy(bad,p,CITY_SIZE);bad[1]&=~4;assert(!city_valid(bad,CITY_SIZE));           // stray coordinates
      memcpy(bad,p,CITY_SIZE);bad[1]|=1;assert(!city_valid(bad,CITY_SIZE));            // manual with a position
    }
  }
  memset(p,0,CITY_SIZE);p[0]=1;assert(city_valid(p,CITY_SIZE));assert(!city_usable(p,100));
  puts("City packet validation, manual mode and offline expiry passed.");
}
