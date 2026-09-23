#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "display.h"
int main(void){
  uint8_t p[4]={1,1,1,0};assert(display_valid(p,4));assert(!display_valid(NULL,4));assert(!display_valid(p,3));
  p[0]=2;assert(!display_valid(p,4));p[0]=1;p[1]=2;assert(display_valid(p,4));p[1]=3;assert(display_valid(p,4));p[1]=4;assert(display_valid(p,4));p[1]=5;assert(!display_valid(p,4));p[1]=1;p[2]=2;assert(!display_valid(p,4));p[2]=1;p[3]=1;assert(display_valid(p,4));p[3]=3;assert(!display_valid(p,4));p[3]=64;assert(!display_valid(p,4));p[3]=4;assert(!display_valid(p,4));
  uint8_t normalized[4]={9,9,9,9};
  assert(!display_normalize(normalized,p,4));assert(!memcmp(normalized,(uint8_t[]){9,9,9,9},4));
  assert(!display_normalize(normalized,NULL,4));assert(!display_normalize(NULL,p,4));
  for(int style=0;style<=4;style++)for(int grid=0;grid<=1;grid++)for(int flags=0;flags<64;flags++){
    uint8_t legacy[4]={1,style,grid,flags};
    bool valid=!flags||(flags&3)==1||(flags&3)==2;
    assert(display_normalize(normalized,legacy,4)==valid);
    if(valid){
      assert(!memcmp(normalized,(uint8_t[]){1,style==3?2:style,grid,0},4));
      assert(display_normalize(normalized,normalized,4));
      assert(!memcmp(normalized,(uint8_t[]){1,style==3?2:style,grid,0},4));
    }
  }
  uint8_t digits[4]={0};assert(!display_group_lit(0,digits));assert(!display_group_lit(30,digits));assert(display_group_lit(29,digits));
  for(int grid=0;grid<2;grid++)for(int n=0;n<10;n++){
    uint8_t pixels[196*37]={0};for(int d=0;d<4;d++)digits[d]=(n+d)%10;
    for(int i=0;i<TRIANGLE_RUN_COUNT;i++){
      TriangleRun r=TRIANGLE_RUNS[i];assert(r.x+r.length<=196&&r.y<37&&r.group<=29);
      bool lit=display_group_lit(r.group,digits);
      if(lit||grid)memset(pixels+r.y*196+r.x,lit?2:1,r.length);
    }
    assert(fwrite(pixels,1,sizeof(pixels),stdout)==sizeof(pixels));
  }
  return 0;
}
