#include "nameplate.h"
#include "settings.h"
#define NET_TOP 6
#define NET_BOTTOM 97
#define STATUS_BOTTOM 18
#define PANEL_TOP 184
#define CLOCK_INK 38
int nameplate_layout(int map_y,int time_y,int height,int visible,bool *shown,int *x,int *y){
  int ink=CLOCK_INK,nx=(200-WORDMARK_WIDTH)>>1,ny,shift=0;
  *shown=false;
  if(time_y>map_y){
    ny=map_y+NET_BOTTOM+3;
    if(ny+WORDMARK_HEIGHT>time_y)shift=ny+WORDMARK_HEIGHT-time_y;
    if(time_y+shift+ink>PANEL_TOP-6)return clock_top_for_visible(time_y,height,visible);
  }else{
    ny=map_y+NET_TOP-1-WORDMARK_HEIGHT;
    if(ny<STATUS_BOTTOM)return clock_top_for_visible(time_y,height,visible);
  }
  int top=clock_top_for_visible(time_y+shift,height,visible);
  if(top+2<ny+WORDMARK_HEIGHT+1&&top+ink>ny-1)return clock_top_for_visible(time_y,height,visible);
  *shown=true;*x=nx;*y=ny;return top;
}
void nameplate_pixels(int x,int y,NameplatePixel pixel,void *context){
  for(int r=0;r<WORDMARK_HEIGHT;r++)for(int c=0;c<WORDMARK_WIDTH;c++)
    if((WORDMARK_ROWS[r*WORDMARK_STRIDE+(c>>3)]>>(c&7))&1)pixel(context,x+c,y+r);
}
