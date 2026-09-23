#include "minute_flip.h"
#include <string.h>
#include <limits.h>
typedef struct {int32_t ax,ay,nx,ny,length2,center_x;} ClockCell;
#include "generated/broad_clock_data.h"
static const uint8_t STARTS[4]={2,49,106,153};
static bool bit(const uint8_t *bits,int i){return (bits[i>>3]>>(i&7))&1;}
static void set_bit(uint8_t *bits,int i){bits[i>>3]|=1u<<(i&7);}
static void set_pixel(uint8_t *pixels,int i,uint8_t value){int shift=(i&3)*2;pixels[i>>2]=(pixels[i>>2]&~(3u<<shift))|(value<<shift);}
static int slot_at(int x){for(int s=0;s<4;s++)if(x>=STARTS[s]&&x<STARTS[s]+45)return s;return -1;}
void clock_mask(const uint8_t digits[4],uint8_t bits[CLOCK_MASK_BYTES]){
  memset(bits,0,CLOCK_MASK_BYTES);
  for(int s=0;s<4;s++)if(digits[s]<10)for(int y=0;y<32;y++)for(int x=0;x<45;x++)
    if(bit(CLOCK_GLYPHS[digits[s]],y*45+x))set_bit(bits,(y+4)*200+STARTS[s]+x);
  for(int top=9;top<=23;top+=14)for(int y=0;y<8;y++){
    int inset=(y==0||y==7)?2:(y==1||y==6)?1:0;
    for(int x=inset;x<8-inset;x++)set_bit(bits,(top+y)*200+96+x);
  }
}
void clock_flip_prepare(ClockFlip *f,const uint8_t before[4],const uint8_t after[4]){
  clock_mask(before,f->before);clock_mask(after,f->after);
  memset(f->active,0,sizeof(f->active));memset(f->delay,0,sizeof(f->delay));f->changed_slots=0;f->changed_cells=0;
  for(int i=0;i<CLOCK_PIXELS;i++)if(bit(f->before,i)!=bit(f->after,i)){
    int slot=slot_at(i%200);if(slot<0)continue;
    f->active[CLOCK_OWNERS[i]]=1;f->changed_slots|=1u<<slot;
  }
  int32_t min=INT32_MAX,max=INT32_MIN;
  for(int c=0;c<CLOCK_CELL_COUNT;c++)if(f->active[c]){
    f->changed_cells++;int32_t x=CLOCK_CELLS[c].center_x;if(x<min)min=x;if(x>max)max=x;
  }
  if(max>min)for(int c=0;c<CLOCK_CELL_COUNT;c++)if(f->active[c])
    f->delay[c]=(80*(CLOCK_CELLS[c].center_x-min)+(max-min)/2)/(max-min);
}
void clock_flip_sample(const ClockFlip *f,uint16_t elapsed,uint8_t pixels[CLOCK_FRAME_BYTES]){
  memset(pixels,0,CLOCK_FRAME_BYTES);
  for(int i=0;i<CLOCK_PIXELS;i++)if(bit(f->after,i))set_pixel(pixels,i,1);
  if(elapsed>=CLOCK_FLIP_MS||!f->changed_cells)return;
  int8_t phases[CLOCK_CELL_COUNT];
  for(int c=0;c<CLOCK_CELL_COUNT;c++){
    int local=(int)elapsed-f->delay[c];
    phases[c]=!f->active[c]||local>=320?-1:local<=0?0:local*32/320;
  }
  for(int y=0;y<40;y++)for(int x=0;x<200;x++){
    int slot=slot_at(x);if(slot<0||!(f->changed_slots&(1u<<slot)))continue;
    int at=y*200+x,id=CLOCK_OWNERS[at],phase=phases[id];if(phase<0)continue;
    if(!phase){set_pixel(pixels,at,bit(f->before,at));continue;}
    int scale=CLOCK_SCALES[phase];if(!scale)continue;
    const ClockCell *c=&CLOCK_CELLS[id];int px=x*256+128,py=y*256+128;
    int64_t distance=(px-c->ax)*c->nx+(py-c->ay)*c->ny,denominator=(int64_t)c->length2*scale;
    int64_t source_x=px+distance*c->nx*(1024-scale)/denominator;
    int64_t source_y=py+distance*c->ny*(1024-scale)/denominator;
    if(source_x<0||source_x>=200*256||source_y<0||source_y>=40*256)continue;
    int sx=source_x/256,sy=source_y/256;if(CLOCK_OWNERS[sy*200+sx]!=id)continue;
    bool ink=slot_at(sx)==slot&&bit(f->before,sy*200+sx);
    set_pixel(pixels,at,ink+(scale<850?2:0));
  }
}
