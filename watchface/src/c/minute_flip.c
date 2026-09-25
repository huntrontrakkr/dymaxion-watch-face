#include "minute_flip.h"
#include <string.h>
#include <limits.h>
#include "generated/broad_clock_sizes.h"
#include "generated/broad_clock_data.h"
#include "generated/chamfer_clock_sizes.h"
static bool bit(const uint8_t *bits,int i){return (bits[i>>3]>>(i&7))&1;}
static void set_bit(uint8_t *bits,int i){bits[i>>3]|=1u<<(i&7);}
static void set_pixel(uint8_t *pixels,int i,uint8_t value){int shift=(i&3)*2;pixels[i>>2]=(pixels[i>>2]&~(3u<<shift))|(value<<shift);}
static int slot_at(const ClockFace *f,int x){
  for(int s=0;s<4;s++)if(x>=f->starts[s]&&x<f->starts[s]+f->digit_width)return s;
  return -1;
}

static const uint8_t *broad_glyph(const ClockFace *f,int digit){(void)f;return CLOCK_GLYPHS[digit];}
static uint16_t broad_owner(const ClockFace *f,int x,int y){(void)f;return CLOCK_OWNERS[y*CLOCK_WIDTH+x];}
static void broad_cell(const ClockFace *f,int id,ClockCell *out){(void)f;*out=CLOCK_CELLS[id];}
static void broad_colon(uint8_t *bits){
  for(int top=9;top<=23;top+=14)for(int y=0;y<8;y++){
    int inset=(y==0||y==7)?2:(y==1||y==6)?1:0;
    for(int x=inset;x<8-inset;x++)set_bit(bits,(top+y)*CLOCK_WIDTH+96+x);
  }
}
const ClockFace BROAD_FACE={40,4,32,45,{2,49,106,153},CLOCK_CELL_COUNT,broad_glyph,broad_owner,broad_cell,broad_colon,NULL,NULL,0,0,NULL};

static uint16_t u16(const uint8_t *p){return (uint16_t)(p[0]|p[1]<<8);}
static const uint8_t *chamfer_glyph(const ClockFace *f,int digit){return f->data+digit*CHAMFER_GLYPH_BYTES;}
// Each row stores where its owner changes; a binary search finds the cell.
static uint16_t chamfer_owner(const ClockFace *f,int x,int y){
  const uint8_t *row=f->data+CHAMFER_ROWS_AT+y*6,*b=f->data+CHAMFER_BOUNDARIES_AT+2*u16(row+2);
  int lo=0,hi=row[4];
  while(lo<hi){int mid=(lo+hi)/2;if(b[2*mid]<=x)lo=mid+1;else hi=mid;}
  return u16(row)+(lo?b[2*(lo-1)+1]:0);
}
static void chamfer_cell(const ClockFace *f,int id,ClockCell *out){
  const uint8_t *c=f->data+CHAMFER_CELLS_AT+id*4;
  out->cx=(int32_t)u16(c)-CHAMFER_BIAS;out->cy=(int32_t)u16(c+2)-CHAMFER_BIAS;
}
static void chamfer_colon(uint8_t *bits){
  static const uint8_t tops[2]=CHAMFER_COLON_TOPS,rows[CHAMFER_COLON_WIDTH]=CHAMFER_COLON_ROWS;
  for(int d=0;d<2;d++)for(int y=0;y<CHAMFER_COLON_WIDTH;y++)for(int x=0;x<CHAMFER_COLON_WIDTH;x++)
    if(rows[y]&(1u<<x))set_bit(bits,(tops[d]+y)*CLOCK_WIDTH+CHAMFER_COLON_X+x);
}
bool chamfer_face_init(ClockFace *f,const uint8_t *data,size_t length){
  if(!f||!data||length!=CHAMFER_BYTES)return false;
  static const uint8_t starts[4]=CHAMFER_STARTS;
  *f=(ClockFace){CHAMFER_HEIGHT,CHAMFER_CAP_TOP,CHAMFER_CAP_HEIGHT,CHAMFER_DIGIT_WIDTH,{0},CHAMFER_CELL_COUNT,
    chamfer_glyph,chamfer_owner,chamfer_cell,chamfer_colon,data,NULL,0,0,NULL};
  memcpy(f->starts,starts,4);
  // Reject a resource whose rows point outside it or name a missing tile.
  for(int y=0;y<CHAMFER_HEIGHT;y++){
    const uint8_t *row=data+CHAMFER_ROWS_AT+y*6,*b=data+CHAMFER_BOUNDARIES_AT+2*u16(row+2);
    if(CHAMFER_BOUNDARIES_AT+2u*(u16(row+2)+row[4])>length||u16(row)>=CHAMFER_CELL_COUNT)return false;
    for(int k=0;k<row[4];k++)if(b[2*k]>=CLOCK_WIDTH||u16(row)+b[2*k+1]>=CHAMFER_CELL_COUNT)return false;
  }
  return true;
}

void clock_flip_attach(ClockFlip *flip,const ClockFace *face,uint8_t *memory){
  size_t mask=(size_t)clock_pixels(face)/8;
  *flip=(ClockFlip){face,memory,memory+mask,memory+2*mask,memory+2*mask+face->cell_count,0,0,0,0,0,0};
}
void clock_mask(const ClockFace *f,const uint8_t digits[4],uint8_t *bits){
  memset(bits,0,(size_t)clock_pixels(f)/8);
  if(f->mask){f->mask(f,digits,bits);return;}
  for(int s=0;s<4;s++)if(digits[s]<10){
    const uint8_t *glyph=f->glyph(f,digits[s]);
    for(int y=0;y<f->cap_height;y++)for(int x=0;x<f->digit_width;x++)
      if(bit(glyph,y*f->digit_width+x))set_bit(bits,(y+f->cap_top)*CLOCK_WIDTH+f->starts[s]+x);
  }
  f->colon(bits);
}
void clock_flip_prepare(ClockFlip *flip,const uint8_t before[4],const uint8_t after[4]){
  const ClockFace *f=flip->face;
  clock_mask(f,before,flip->before);clock_mask(f,after,flip->after);
  memset(flip->active,0,f->cell_count);memset(flip->delay,0,f->cell_count);flip->changed_slots=0;flip->changed_cells=0;
  for(int i=0;i<clock_pixels(f);i++)if(bit(flip->before,i)!=bit(flip->after,i)){
    int slot=f->mask?-1:slot_at(f,i%CLOCK_WIDTH);if(slot<0&&!f->mask)continue;
    flip->active[f->owner(f,i%CLOCK_WIDTH,i/CLOCK_WIDTH)]=1;if(slot>=0)flip->changed_slots|=1u<<slot;
  }
  int32_t min=INT32_MAX,max=INT32_MIN;ClockCell c;
  for(int id=0;id<f->cell_count;id++)if(flip->active[id]){
    flip->changed_cells++;f->cell(f,id,&c);if(c.cx<min)min=c.cx;if(c.cx>max)max=c.cx;
  }
  if(max>min)for(int id=0;id<f->cell_count;id++)if(flip->active[id]){
    f->cell(f,id,&c);flip->delay[id]=(80*(c.cx-min)+(max-min)/2)/(max-min);
  }
  // Tile ownership includes blank pixels around a changed stroke. Bound the
  // complete tiles once, rather than searching the whole strip every frame.
  flip->x0=CLOCK_WIDTH;flip->y0=f->height;flip->x1=flip->y1=0;
  if(flip->changed_cells)for(int y=0;y<f->height;y++)for(int x=0;x<CLOCK_WIDTH;x++){
    if(!flip->active[f->owner(f,x,y)])continue;
    if(x<flip->x0)flip->x0=x;
    if(y<flip->y0)flip->y0=y;
    if(x>=flip->x1)flip->x1=x+1;
    if(y>=flip->y1)flip->y1=y+1;
  }
}
// Each changed tile holds the old face, then shrinks to its centroid,
// uncovering the new face. Tiles without a changed pixel stay still.
void clock_flip_sample(const ClockFlip *flip,uint16_t elapsed,uint8_t *pixels){
  const ClockFace *f=flip->face;const int W=CLOCK_WIDTH;
  // Expand four mask bits straight into four two-bit pixels, including ground.
  static const uint8_t expand[16]={0,1,4,5,16,17,20,21,64,65,68,69,80,81,84,85};
  for(size_t i=0;i<clock_frame_bytes(f);i++)pixels[i]=expand[(flip->after[i>>1]>>((i&1)*4))&15];
  if(elapsed>=CLOCK_FLIP_MS||!flip->changed_cells)return;
  for(int y=flip->y0;y<flip->y1;y++)for(int x=flip->x0;x<flip->x1;x++){
    int at=y*W+x,id=f->owner(f,x,y);if(!flip->active[id])continue;
    int local=(int)elapsed-flip->delay[id];if(local>=320)continue;
    int phase=local<=0?0:local*32/320;
    if(!phase){set_pixel(pixels,at,bit(flip->before,at));continue;}
    int scale=CLOCK_SCALES[phase];if(!scale)continue;
    ClockCell c;f->cell(f,id,&c);
    int32_t sx=c.cx+(x*256+128-c.cx)*1024/scale,sy=c.cy+(y*256+128-c.cy)*1024/scale;
    if(sx<0||sx>=W*256||sy<0||sy>=f->height*256)continue;
    sx>>=8;sy>>=8;if(f->owner(f,sx,sy)!=id)continue;
    set_pixel(pixels,at,bit(flip->before,sy*W+sx));
  }
}
