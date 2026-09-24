#include "nameplate.h"
#define NET_TOP 6
#define STATUS_BOTTOM 18
#define CLOCK_INK 38
#define STACKED_INK 84
bool nameplate_spot(int map_y,int clock_top,bool stacked,int *x,int *y){
  int nx=(200-WORDMARK_WIDTH)>>1,ny=map_y+NET_TOP-1-WORDMARK_HEIGHT;
  if(ny<STATUS_BOTTOM)return false;
  int clock_bottom=clock_top+(stacked?STACKED_INK:CLOCK_INK);
  if(clock_top<ny+WORDMARK_HEIGHT+1&&clock_bottom>ny-1)return false;
  *x=nx;*y=ny;return true;
}
void nameplate_pixels(int x,int y,NameplatePixel pixel,void *context){
  for(int r=0;r<WORDMARK_HEIGHT;r++)for(int c=0;c<WORDMARK_WIDTH;c++)
    if((WORDMARK_ROWS[r*WORDMARK_STRIDE+(c>>3)]>>(c&7))&1)pixel(context,x+c,y+r);
}
