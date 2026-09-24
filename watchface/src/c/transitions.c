#include "transitions.h"
#include <string.h>
static int clamp(int v,int lo,int hi){return v<lo?lo:v>hi?hi:v;}
int transition_ease_out(int t){int u=1000-clamp(t,0,1000);return 1000-(u*u/1000)*u/1000;}
int tray_slide(int32_t elapsed){return 200*transition_ease_out(clamp(elapsed,0,TRAY_MS)*1000/TRAY_MS)/1000;}
// The new row is already in place; the old page's row is shifted in from it.
void tray_slide_row(const uint8_t *old_row,uint8_t *row,int slide){
  if(slide<=0){memcpy(row,old_row,200);return;}
  memmove(row+200-slide,row,slide);memcpy(row,old_row+slide,200-slide);
}
int beside_progress(int from,bool toward,int32_t elapsed){
  int step=clamp(elapsed,0,BESIDE_MS)*1000/BESIDE_MS;
  return toward?(from+step>1000?1000:from+step):(from-step<0?0:from-step);
}
int beside_shift(int p,int shift){return shift*transition_ease_out(p*2>1000?1000:p*2)/1000;}
int column_alpha(int p){return clamp(2*p-1000,0,1000);}
uint8_t mix_color(uint8_t from,uint8_t to,int alpha){
  uint8_t out=0xc0;
  for(int shift=0;shift<=4;shift+=2){
    int a=(from>>shift)&3,b=(to>>shift)&3,d=(b-a)*alpha;
    out|=(a+(d>=0?(d+500)/1000:-((500-d)/1000)))<<shift;
  }
  return out;
}
