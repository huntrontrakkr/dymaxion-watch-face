#include "map_times.h"
#include <string.h>
#include <limits.h>
#define HALO 3
#define MARGIN 1
#define TURN_PENALTY 20
#define TIME_GLYPHS 5
#define TINY_H 5
// Rows as bit masks, bit 2 = left pixel of a 3-wide glyph.
typedef struct {char c;uint8_t w,rows[TINY_H];} Tiny;
static const Tiny TINY[]={
  {'0',3,{7,5,5,5,7}},{'1',3,{2,6,2,2,7}},{'2',3,{7,1,7,4,7}},{'3',3,{7,1,3,1,7}},{'4',3,{5,5,7,1,1}},
  {'5',3,{7,4,7,1,7}},{'6',3,{7,4,7,5,7}},{'7',3,{7,1,1,2,2}},{'8',3,{7,5,7,5,7}},{'9',3,{7,5,7,1,7}},
  {':',1,{0,1,0,1,0}},{'A',3,{2,5,7,5,5}},{'P',3,{6,5,6,4,4}},{'+',3,{0,2,7,2,0}},{'-',3,{0,0,7,0,0}},
  {'?',3,{6,1,2,0,2}},{' ',1,{0,0,0,0,0}}
};
static const Tiny *tiny(char c){for(unsigned i=0;i<sizeof(TINY)/sizeof(TINY[0]);i++)if(TINY[i].c==c)return &TINY[i];return &TINY[15];}
int tiny_width(const char *text){int w=0;for(const char *p=text;*p;p++)w+=tiny(*p)->w+(p>text?1:0);return w;}
void map_time_text(char out[MAP_TIME_TEXT],int hour,int minute,bool clock24,int delta,bool stale){
  int h=clock24?hour:(hour%12?hour%12:12),n=0;unsigned hh=(unsigned)h%100,mm=(unsigned)minute%60;
  out[n++]='0'+hh/10;out[n++]='0'+hh%10;out[n++]=':';out[n++]='0'+mm/10;out[n++]='0'+mm%10;
  if(!clock24)out[n++]=hour<12?'A':'P';
  if(stale){out[n++]=' ';out[n++]='?';}
  else if(delta){int d=delta<0?-delta:delta;out[n++]=' ';out[n++]=delta>0?'+':'-';out[n++]='0'+(d>9?9:d);}
  out[n]=0;
}
void map_time_template(char out[MAP_TIME_TEXT],bool clock24,bool reserve_day){
  strcpy(out,"00:00");if(!clock24)strcat(out,"P");if(reserve_day)strcat(out," +1");
}
typedef struct {int16_t x,y;uint8_t w,h;} Box;
static int layout(const char *text,uint8_t orientation,int total,Box *boxes){
  int n=0,x=0;
  for(const char *p=text;*p&&n<MAP_TIME_TEXT;p++,n++){
    int w=tiny(*p)->w;
    boxes[n]=orientation==MAP_TIME_V?(Box){0,(int16_t)(total-x-w),TINY_H,(uint8_t)w}:(Box){(int16_t)x,0,(uint8_t)w,TINY_H};
    x+=w+1;
  }
  return n;
}
void map_time_pixels(const char *text,uint8_t orientation,int total,int x,int y,MapTimePixel pixel,void *context){
  Box boxes[MAP_TIME_TEXT];int n=layout(text,orientation,total,boxes);
  for(int i=0;i<n;i++){const Tiny *g=tiny(text[i]);
    for(int py=0;py<TINY_H;py++)for(int px=0;px<g->w;px++)if(g->rows[py]&(1u<<(g->w-1-px))){
      if(orientation==MAP_TIME_V)pixel(context,x+boxes[i].x+py,y+boxes[i].y+g->w-1-px);
      else pixel(context,x+boxes[i].x+px,y+boxes[i].y+py);
    }
  }
}
static int sign(int v){return (v>0)-(v<0);}
static int iabs(int v){return v<0?-v:v;}
void map_time_leader(int ax,int ay,int bx,int by,bool diagonal_first,MapTimePixel pixel,void *context){
  int dx=sign(bx-ax),dy=sign(by-ay),adx=iabs(bx-ax),ady=iabs(by-ay),diag=adx<ady?adx:ady,x=ax,y=ay;
  int fx=adx>ady?dx:0,fy=adx>ady?0:dy,flat=(adx>ady?adx:ady)-diag;
  pixel(context,x,y);
  for(int phase=0;phase<2;phase++){
    bool diagonal=(phase==0)==diagonal_first;int sx=diagonal?dx:fx,sy=diagonal?dy:fy,count=diagonal?diag:flat;
    for(int i=0;i<count;i++){x+=sx;y+=sy;pixel(context,x,y);}
  }
}
static bool bit(const uint8_t *m,int x,int y){int i=y*MAP_TIMES_W+x;return (m[i>>3]>>(i&7))&1;}
static void set_bit(uint8_t *m,int x,int y){if(x<0||y<0||x>=MAP_TIMES_W||y>=MAP_TIMES_H)return;int i=y*MAP_TIMES_W+x;m[i>>3]|=1u<<(i&7);}
static int outward(int c,int lo,int hi,int16_t *out){
  int n=0;if(hi<lo)return 0;
  c=c<lo?lo:c>hi?hi:c;
  for(int k=0;n<hi-lo+1;k++){if(k&&c-k>=lo)out[n++]=c-k;if(c+k<=hi)out[n++]=c+k;}
  return n;
}
static int gap(int c,int lo,int hi){return c<lo?lo-c:c>hi?c-hi:0;}
typedef struct {const uint8_t *taken;int px,py;bool ok;} LeaderCheck;
static void check_leader(void *context,int x,int y){
  LeaderCheck *c=context;
  if(iabs(x-c->px)<=HALO&&iabs(y-c->py)<=HALO)return;
  if(x<0||y<0||x>=MAP_TIMES_W||y>=MAP_TIMES_H||bit(c->taken,x,y))c->ok=false;
}
static void mark_leader(void *context,int x,int y){for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++)set_bit(context,x+dx,y+dy);}
static void place_one(const MapTimePlace *p,const uint8_t *blocked,uint8_t *taken,bool turn,MapTimeSpot *best){
  best->ok=false;
  for(uint8_t orientation=MAP_TIME_H;orientation<=(turn?MAP_TIME_V:MAP_TIME_H);orientation++){
    Box g[MAP_TIME_TEXT];int total=tiny_width(p->template_text),n=layout(p->template_text,orientation,total,g),bw=0,bh=0;
    for(int i=0;i<n;i++){if(g[i].x+g[i].w>bw)bw=g[i].x+g[i].w;if(g[i].y+g[i].h>bh)bh=g[i].y+g[i].h;}
    // Static: Pebble app stacks are small.
    static int16_t xs[MAP_TIMES_W],ys[MAP_TIMES_H];
    int nx=outward(p->x-(bw>>1),MARGIN,MAP_TIMES_W-MARGIN-bw,xs),ny=outward(p->y-(bh>>1),MARGIN,MAP_TIMES_H-MARGIN-bh,ys);
    int penalty=orientation==MAP_TIME_V?TURN_PENALTY:0;
    for(int j=0;j<ny;j++){
      int y=ys[j],dy_min=gap(p->y,y-MARGIN,y+bh+MARGIN-1);
      if(best->ok&&5*dy_min+penalty>=best->cost)continue;
      for(int k=0;k<nx;k++){
        int x=xs[k],dx_min=gap(p->x,x-MARGIN,x+bw+MARGIN-1);
        if(best->ok&&5*(dx_min>dy_min?dx_min:dy_min)+penalty>=best->cost)continue;
        int32_t cost=INT32_MAX;int ax=0,ay=0;
        for(int i=0;i<n&&i<TIME_GLYPHS;i++){
          int bx=x+g[i].x-MARGIN,by=y+g[i].y-MARGIN;
          int cx=p->x<bx?bx:p->x>bx+g[i].w+1?bx+g[i].w+1:p->x,cy=p->y<by?by:p->y>by+g[i].h+1?by+g[i].h+1:p->y;
          int ddx=iabs(cx-p->x),ddy=iabs(cy-p->y),c=5*(ddx>ddy?ddx:ddy)+2*(ddx<ddy?ddx:ddy);
          if(c<cost){cost=c;ax=cx;ay=cy;}
        }
        cost+=penalty;
        if(best->ok&&cost>=best->cost)continue;
        bool fits=true;
        for(int i=0;i<n&&fits;i++)for(int yy=y+g[i].y-MARGIN;fits&&yy<y+g[i].y+g[i].h+MARGIN;yy++)
          for(int xx=x+g[i].x-MARGIN;xx<x+g[i].x+g[i].w+MARGIN;xx++)
            if(xx<0||yy<0||xx>=MAP_TIMES_W||yy>=MAP_TIMES_H||bit(taken,xx,yy)||bit(blocked,xx,yy)){fits=false;break;}
        if(!fits)continue;
        for(int first=1;first>=0;first--){
          LeaderCheck c={taken,p->x,p->y,true};map_time_leader(p->x,p->y,ax,ay,first,check_leader,&c);
          if(c.ok){*best=(MapTimeSpot){true,first,orientation,(int16_t)x,(int16_t)y,(int16_t)ax,(int16_t)ay,cost,(uint8_t)total};break;}
        }
      }
    }
  }
  if(!best->ok)return;
  Box g[MAP_TIME_TEXT];int n=layout(p->template_text,best->orientation,best->total,g);
  for(int i=0;i<n;i++)for(int yy=best->y+g[i].y-MARGIN;yy<best->y+g[i].y+g[i].h+MARGIN;yy++)
    for(int xx=best->x+g[i].x-MARGIN;xx<best->x+g[i].x+g[i].w+MARGIN;xx++)set_bit(taken,xx,yy);
  map_time_leader(p->x,p->y,best->ax,best->ay,best->diagonal_first,mark_leader,taken);
}
static const uint8_t ORDERS[6][3]={{0,1,2},{0,2,1},{1,0,2},{1,2,0},{2,0,1},{2,1,0}};
void map_times_place(const uint8_t *blocked,const MapTimePlace places[3],bool turn,uint8_t *taken,MapTimeSpot out[3]){
  int32_t best_total=INT32_MAX;
  for(int o=0;o<6;o++){
    memset(taken,0,MAP_TIMES_MASK_BYTES);
    for(int i=0;i<3;i++)if(places[i].present)for(int dy=-HALO;dy<=HALO;dy++)for(int dx=-HALO;dx<=HALO;dx++)set_bit(taken,places[i].x+dx,places[i].y+dy);
    MapTimeSpot result[3]={{0}};int32_t total=0;
    // An order already costing at least the best so far cannot win.
    for(int k=0;k<3&&total<best_total;k++){int i=ORDERS[o][k];if(!places[i].present)continue;
      place_one(&places[i],blocked,taken,turn,&result[i]);total+=result[i].ok?result[i].cost:10000;}
    if(total<best_total){best_total=total;memcpy(out,result,sizeof(result));}
  }
}
