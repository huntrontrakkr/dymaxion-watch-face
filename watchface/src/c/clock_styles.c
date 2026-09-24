#include "clock_styles.h"
#include "display.h"
#include "generated/span_font.h"
#define GLYPH_COUNT 11
#define GLYPH_BYTES 7
static uint16_t u16(const uint8_t *p){return (uint16_t)(p[0]|p[1]<<8);}
// Resource: [count], per font [code, box top, block offset u16]; each block holds
// "0123456789:" as width, height, left, top, advance, first bit u16, then the bits.
const uint8_t *clock_glyph_font(const uint8_t *data,size_t length,uint8_t code,int8_t *box_top){
  if(!data||!length||1u+4u*data[0]>length)return NULL;
  for(int f=0;f<data[0];f++){
    const uint8_t *entry=data+1+4*f;if(entry[0]!=code)continue;
    size_t at=u16(entry+2),end=f+1<data[0]?u16(entry+6):length;
    if(at<1u+4u*data[0]||end>length||at+GLYPH_COUNT*GLYPH_BYTES>end)return NULL;
    const uint8_t *block=data+at;
    for(int g=0;g<GLYPH_COUNT;g++){const uint8_t *m=block+g*GLYPH_BYTES;
      if(u16(m+5)+(size_t)m[0]*m[1]>(end-at-GLYPH_COUNT*GLYPH_BYTES)*8)return NULL;}
    if(box_top)*box_top=(int8_t)entry[1];
    return block;
  }
  return NULL;
}
static void clipped(ClockSpan span,void *context,int x,int y,int length){
  if(y<0||y>=CLOCK_STYLE_HEIGHT)return;
  if(x<0){length+=x;x=0;}
  if(x+length>CLOCK_WIDTH)length=CLOCK_WIDTH-x;
  if(length>0)span(context,x,y,length);
}
static void span_runs(const uint8_t digits[4],ClockSpan span,void *context){
  const uint8_t text[5]={digits[0],digits[1],10,digits[2],digits[3]};int cursor=5;
  for(int i=0;i<5;i++){
    if(i==0&&text[0]>9){cursor+=45;continue;} // a blank first slot keeps the others in place
    for(int r=SPAN_OFFSETS[text[i]];r<SPAN_OFFSETS[text[i]+1];r++)
      clipped(span,context,cursor+SPAN_RUNS[r].x,2+SPAN_RUNS[r].y,SPAN_RUNS[r].length);
    cursor+=i==2?10:45;
  }
}
static void triangle_runs(const uint8_t digits[4],ClockSpan span,void *context){
  for(int i=0;i<TRIANGLE_RUN_COUNT;i++){TriangleRun run=TRIANGLE_RUNS[i];
    if(display_group_lit(run.group,digits))clipped(span,context,2+run.x,run.y,run.length);}
}
// One centred line, as PebbleOS lays out text: the advances sum to the width.
static void font_runs(const uint8_t *font,int8_t box_top,const uint8_t digits[4],ClockSpan span,void *context){
  const uint8_t text[5]={digits[0],digits[1],10,digits[2],digits[3]},*bits=font+GLYPH_COUNT*GLYPH_BYTES;
  int first=text[0]>9,width=0;
  for(int i=first;i<5;i++)width+=(int8_t)font[text[i]*GLYPH_BYTES+4];
  int cursor=(CLOCK_WIDTH-width)/2;
  for(int i=first;i<5;i++){
    const uint8_t *g=font+text[i]*GLYPH_BYTES;int w=g[0],h=g[1],bit=u16(g+5);
    for(int r=0;r<h;r++)for(int c=0;c<w;){
      int k=bit+r*w+c;if(!((bits[k>>3]>>(k&7))&1)){c++;continue;}
      int start=c;
      while(c<w&&((bits[(bit+r*w+c)>>3]>>((bit+r*w+c)&7))&1))c++;
      clipped(span,context,cursor+(int8_t)g[2]+start,box_top+(int8_t)g[3]+r,c-start);
    }
    cursor+=(int8_t)g[4];
  }
}
void clock_style_runs(uint8_t style,const uint8_t *font,int8_t box_top,const uint8_t digits[4],ClockSpan span,void *context){
  if(style==0)span_runs(digits,span,context);
  else if(style==1)triangle_runs(digits,span,context);
  else if(font)font_runs(font,box_top,digits,span,context);
}
static void set_run(void *context,int x,int y,int length){
  uint8_t *bits=context;
  for(int i=y*CLOCK_WIDTH+x,end=i+length;i<end;i++)bits[i>>3]|=1u<<(i&7);
}
static void style_mask(const ClockFace *f,const uint8_t digits[4],uint8_t *bits){
  clock_style_runs(f->style,f->font,f->box_top,digits,set_run,bits);
}
bool clock_style_face(ClockFace *face,const ClockFace *lattice,uint8_t style,const uint8_t *font,int8_t box_top){
  if(!face||!lattice||lattice->height!=CLOCK_STYLE_HEIGHT||(style>1&&!font))return false;
  *face=*lattice;face->mask=style_mask;face->style=style;face->font=font;face->box_top=box_top;
  return true;
}
