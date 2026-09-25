#include "map_times.h"
#include <string.h>
#include <limits.h>
#define HALO 3
#define MARGIN 1
#define TURN_PENALTY 20
#define TIME_GLYPHS 5
// Five sizes of one figure design (shared/map-times.js): 3x5, 3x6, 3x7, 3x8
// and 4x8, chosen in the settings. Rows as bit masks, bit 2 = left pixel of a 3-wide glyph; shorter
// sets leave their last rows empty.
#define TINY_MAX_H 8
static const int TINY_HEIGHT[5]={5,6,7,8,8};
static int centre(int w){return (w-1)>>1;}
typedef struct {char c;uint8_t w,rows[TINY_MAX_H];} Tiny;
static const Tiny TINY_SMALL[]={
  {'0',3,{7,5,5,5,7,0,0,0}},{'1',3,{2,6,2,2,7,0,0,0}},{'2',3,{7,1,7,4,7,0,0,0}},{'3',3,{7,1,3,1,7,0,0,0}},{'4',3,{5,5,7,1,1,0,0,0}},
  {'5',3,{7,4,7,1,7,0,0,0}},{'6',3,{7,4,7,5,7,0,0,0}},{'7',3,{7,1,1,2,2,0,0,0}},{'8',3,{7,5,7,5,7,0,0,0}},{'9',3,{7,5,7,1,7,0,0,0}},
  {':',1,{0,1,0,1,0,0,0,0}},{'A',3,{2,5,7,5,5,0,0,0}},{'P',3,{6,5,6,4,4,0,0,0}},{'+',3,{0,2,7,2,0,0,0,0}},{'-',3,{0,0,7,0,0,0,0,0}},
  {'?',3,{6,1,2,0,2,0,0,0}},{' ',1,{0,0,0,0,0,0,0,0}}
};
static const Tiny TINY_MEDIUM[]={
  {'0',3,{7,5,5,5,5,7,0,0}},{'1',3,{2,6,2,2,2,7,0,0}},{'2',3,{7,1,1,7,4,7,0,0}},{'3',3,{7,1,3,1,1,7,0,0}},{'4',3,{5,5,5,7,1,1,0,0}},
  {'5',3,{7,4,7,1,1,7,0,0}},{'6',3,{7,4,7,5,5,7,0,0}},{'7',3,{7,1,1,2,2,2,0,0}},{'8',3,{7,5,7,5,5,7,0,0}},{'9',3,{7,5,5,7,1,7,0,0}},
  {':',1,{0,1,0,0,1,0,0,0}},{'A',3,{2,5,5,7,5,5,0,0}},{'P',3,{6,5,5,6,4,4,0,0}},{'+',3,{0,2,7,2,0,0,0,0}},{'-',3,{0,0,7,0,0,0,0,0}},
  {'?',3,{6,1,1,2,0,2,0,0}},{' ',1,{0,0,0,0,0,0,0,0}}
};
static const Tiny TINY_LARGE[]={
  {'0',3,{7,5,5,5,5,5,7,0}},{'1',3,{2,6,2,2,2,2,7,0}},{'2',3,{7,1,1,7,4,4,7,0}},{'3',3,{7,1,1,3,1,1,7,0}},{'4',3,{5,5,5,7,1,1,1,0}},
  {'5',3,{7,4,4,7,1,1,7,0}},{'6',3,{7,4,4,7,5,5,7,0}},{'7',3,{7,1,1,1,2,2,2,0}},{'8',3,{7,5,5,7,5,5,7,0}},{'9',3,{7,5,5,7,1,1,7,0}},
  {':',1,{0,1,0,0,0,1,0,0}},{'A',3,{2,5,5,7,5,5,5,0}},{'P',3,{6,5,5,6,4,4,4,0}},{'+',3,{0,0,2,7,2,0,0,0}},{'-',3,{0,0,0,7,0,0,0,0}},
  {'?',3,{6,1,1,2,2,0,2,0}},{' ',1,{0,0,0,0,0,0,0,0}}
};
static const Tiny TINY_XLARGE[]={
  {'0',3,{7,5,5,5,5,5,5,7}},{'1',3,{2,6,2,2,2,2,2,7}},{'2',3,{7,1,1,7,4,4,4,7}},{'3',3,{7,1,1,3,1,1,1,7}},{'4',3,{5,5,5,7,1,1,1,1}},
  {'5',3,{7,4,4,7,1,1,1,7}},{'6',3,{7,4,4,7,5,5,5,7}},{'7',3,{7,1,1,1,2,2,2,2}},{'8',3,{7,5,5,7,5,5,5,7}},{'9',3,{7,5,5,7,1,1,1,7}},
  {':',1,{0,1,0,0,0,0,1,0}},{'A',3,{2,5,5,7,5,5,5,5}},{'P',3,{6,5,5,6,4,4,4,4}},{'+',3,{0,0,2,7,2,0,0,0}},{'-',3,{0,0,0,7,0,0,0,0}},
  {'?',3,{6,1,1,2,2,2,0,2}},{' ',1,{0,0,0,0,0,0,0,0}}
};
static const Tiny TINY_WIDE[]={
  {'0',4,{15,9,9,9,9,9,9,15}},{'1',4,{2,6,2,2,2,2,2,7}},{'2',4,{15,1,1,15,8,8,8,15}},{'3',4,{15,1,1,7,1,1,1,15}},{'4',4,{9,9,9,15,1,1,1,1}},
  {'5',4,{15,8,8,15,1,1,1,15}},{'6',4,{15,8,8,15,9,9,9,15}},{'7',4,{15,1,1,1,2,2,2,2}},{'8',4,{15,9,9,15,9,9,9,15}},{'9',4,{15,9,9,15,1,1,1,15}},
  {':',1,{0,1,0,0,0,0,1,0}},{'A',4,{6,9,9,15,9,9,9,9}},{'P',4,{14,9,9,14,8,8,8,8}},{'+',3,{0,0,2,7,2,0,0,0}},{'-',3,{0,0,0,7,0,0,0,0}},
  {'?',4,{14,1,1,6,4,4,0,4}},{' ',1,{0,0,0,0,0,0,0,0}}
};
static const Tiny *tiny(char c,int size){
  static const Tiny *const SETS[]={TINY_SMALL,TINY_MEDIUM,TINY_LARGE,TINY_XLARGE,TINY_WIDE};
  const Tiny *set=SETS[size];int n=sizeof(TINY_LARGE)/sizeof(TINY_LARGE[0]);
  for(int i=0;i<n;i++)if(set[i].c==c)return &set[i];
  return &set[15];
}
int tiny_width(const char *text,int size){int w=0;for(const char *p=text;*p;p++)w+=tiny(*p,size)->w+(p>text?1:0);return w;}
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
static int layout(const char *text,uint8_t orientation,int total,int size,Box *boxes){
  int h=TINY_HEIGHT[size];
  int n=0,x=0;
  for(const char *p=text;*p&&n<MAP_TIME_TEXT;p++,n++){
    int w=tiny(*p,size)->w;
    boxes[n]=orientation==MAP_TIME_V?(Box){0,(int16_t)(total-x-w),(uint8_t)h,(uint8_t)w}:(Box){(int16_t)x,0,(uint8_t)w,(uint8_t)h};
    x+=w+1;
  }
  return n;
}
void map_time_pixels(const char *text,uint8_t orientation,int total,int size,int x,int y,MapTimePixel pixel,void *context){
  Box boxes[MAP_TIME_TEXT];int n=layout(text,orientation,total,size,boxes);
  for(int i=0;i<n;i++){const Tiny *g=tiny(text[i],size);
    for(int py=0;py<TINY_HEIGHT[size];py++)for(int px=0;px<g->w;px++)if(g->rows[py]&(1u<<(g->w-1-px))){
      if(orientation==MAP_TIME_V)pixel(context,x+boxes[i].x+py,y+boxes[i].y+g->w-1-px);
      else pixel(context,x+boxes[i].x+px,y+boxes[i].y+py);
    }
  }
}
static int sign(int v){return (v>0)-(v<0);}
static int iabs(int v){return v<0?-v:v;}
void map_time_route(const MapPoint points[5],MapTimePixel pixel,void *context){
  int x=points[0].x,y=points[0].y;pixel(context,x,y);
  for(int i=1;i<5;i++){int sx=sign(points[i].x-x),sy=sign(points[i].y-y);while(x!=points[i].x||y!=points[i].y){x+=sx;y+=sy;pixel(context,x,y);}}
}
// Leaders leave the glyph straight out from the middle of a side and arrive
// straight on at a port centred on the time (shared/map-times.js).
#define EXIT_DISTANCE (HALO+1)
static const int8_t EXITS[4][2]={{1,0},{-1,0},{0,1},{0,-1}};
// `end`: a port at a label's end, which needs five straight pixels arriving.
typedef struct {int16_t x,y;int8_t dx,dy;bool end;} Port;
static int ports(const char *text,uint8_t orientation,int total,int size,int x,int y,Port *out){
  const int height=TINY_HEIGHT[size],MID=centre(height);
  Box g[MAP_TIME_TEXT];int n=layout(text,orientation,total,size,g),count=0;bool time_only=n==TIME_GLYPHS;const Box *last=&g[TIME_GLYPHS-1];
  if(orientation==MAP_TIME_H){
    out[count++]=(Port){(int16_t)(x-2),(int16_t)(y+MID),1,0,true};
    if(time_only)out[count++]=(Port){(int16_t)(x+last->x+last->w+1),(int16_t)(y+MID),-1,0,true};
    for(int i=0;i<TIME_GLYPHS&&i<n;i++){if(text[i]==':')continue;
      out[count++]=(Port){(int16_t)(x+g[i].x+centre(g[i].w)),(int16_t)(y-2),0,1,false};out[count++]=(Port){(int16_t)(x+g[i].x+centre(g[i].w)),(int16_t)(y+height+1),0,-1,false};}
  }else{
    out[count++]=(Port){(int16_t)(x+MID),(int16_t)(y+g[0].y+g[0].h+1),0,-1,true};
    if(time_only)out[count++]=(Port){(int16_t)(x+MID),(int16_t)(y+last->y-2),0,1,true};
    for(int i=0;i<TIME_GLYPHS&&i<n;i++){if(text[i]==':')continue;
      out[count++]=(Port){(int16_t)(x-2),(int16_t)(y+g[i].y+centre(g[i].h)),1,0,false};out[count++]=(Port){(int16_t)(x+height+1),(int16_t)(y+g[i].y+centre(g[i].h)),-1,0,false};}
  }
  return count;
}
typedef struct {int32_t cost;MapPoint points[5];} Route;
static bool route(int cx,int cy,const int8_t e[2],const Port *p,Route *r){
  int ex=cx+e[0]*EXIT_DISTANCE,ey=cy+e[1]*EXIT_DISTANCE,X=p->x-ex,Y=p->y-ey,arrive=p->end?5:2;
  r->points[0]=(MapPoint){(int16_t)cx,(int16_t)cy};r->points[1]=(MapPoint){(int16_t)ex,(int16_t)ey};r->points[4]=(MapPoint){p->x,p->y};
  if(e[0]==p->dx&&e[1]==p->dy){
    int along=X*e[0]+Y*e[1],perp=e[0]?Y:X,n=iabs(perp),s=sign(perp);
    if(along<n+1+arrive)return false;
    int k1x=ex+e[0],k1y=ey+e[1];
    r->points[2]=(MapPoint){(int16_t)k1x,(int16_t)k1y};
    r->points[3]=(MapPoint){(int16_t)(k1x+(e[0]?e[0]:s)*n),(int16_t)(k1y+(e[1]?e[1]:s)*n)};
    r->cost=5*(EXIT_DISTANCE+along-n)+7*n;return true;
  }
  if(e[0]==-p->dx&&e[1]==-p->dy)return false;
  int U=X*e[0]+Y*e[1],W=X*p->dx+Y*p->dy;
  if(U<1||W<arrive)return false;
  int n=U-1<W-arrive?U-1:W-arrive,k1x=ex+e[0]*(U-n),k1y=ey+e[1]*(U-n);
  r->points[2]=(MapPoint){(int16_t)k1x,(int16_t)k1y};
  r->points[3]=(MapPoint){(int16_t)(k1x+(e[0]+p->dx)*n),(int16_t)(k1y+(e[1]+p->dy)*n)};
  r->cost=5*(EXIT_DISTANCE+U+W-2*n)+7*n;return true;
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
typedef struct {const uint8_t *taken;const Box *g;int n,x,y,px,py;const MapRect *own;const MapMarker *markers;int marker_count;bool ok;} RouteCheck;
static void check_route(void *context,int x,int y){
  RouteCheck *c=context;
  // Inside its own clearing or hull, a leader only has to miss the other glyphs.
  if(x>=c->own->x0&&x<=c->own->x1&&y>=c->own->y0&&y<=c->own->y1){
    for(int k=0;k<c->marker_count;k++){const MapMarker *m=&c->markers[k];
      if((m->x!=c->px||m->y!=c->py)&&iabs(x-m->x)<=m->half+1&&iabs(y-m->y)<=m->half+1){c->ok=false;return;}}
    return;
  }
  if(x<0||y<0||x>=MAP_TIMES_W||y>=MAP_TIMES_H||bit(c->taken,x,y)){c->ok=false;return;}
  for(int i=0;i<c->n;i++)if(x>=c->x+c->g[i].x-MARGIN&&x<c->x+c->g[i].x+c->g[i].w+MARGIN&&y>=c->y+c->g[i].y-MARGIN&&y<c->y+c->g[i].y+c->g[i].h+MARGIN){c->ok=false;return;}
}
static void mark_route(void *context,int x,int y){for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++)set_bit(context,x+dx,y+dy);}
#define MAX_ROUTES 48
static void place_one(const MapTimePlace *p,const uint8_t *blocked,uint8_t *taken,bool turn,const MapMarker *markers,int marker_count,int size,MapTimeSpot *best){
  best->ok=false;
  for(uint8_t orientation=MAP_TIME_H;orientation<=(turn?MAP_TIME_V:MAP_TIME_H);orientation++){
    Box g[MAP_TIME_TEXT];int total=tiny_width(p->template_text,size),n=layout(p->template_text,orientation,total,size,g),bw=0,bh=0;
    for(int i=0;i<n;i++){if(g[i].x+g[i].w>bw)bw=g[i].x+g[i].w;if(g[i].y+g[i].h>bh)bh=g[i].y+g[i].h;}
    // Static: Pebble app stacks are small.
    static int16_t xs[MAP_TIMES_W],ys[MAP_TIMES_H];static Route routes[MAX_ROUTES];static Port port[MAX_ROUTES];
    int nx=outward(p->x-(bw>>1),MARGIN,MAP_TIMES_W-MARGIN-bw,xs),ny=outward(p->y-(bh>>1),MARGIN,MAP_TIMES_H-MARGIN-bh,ys);
    int penalty=orientation==MAP_TIME_V?TURN_PENALTY:0;
    for(int j=0;j<ny;j++){
      int y=ys[j],dy_min=gap(p->y,y-2,y+bh+1);
      if(best->ok&&5*dy_min+penalty>=best->cost)continue;
      for(int k=0;k<nx;k++){
        int x=xs[k],dx_min=gap(p->x,x-2,x+bw+1);
        if(best->ok&&5*(dx_min>dy_min?dx_min:dy_min)+penalty>=best->cost)continue;
        bool fits=true;
        for(int i=0;i<n&&fits;i++)for(int yy=y+g[i].y-MARGIN;fits&&yy<y+g[i].y+g[i].h+MARGIN;yy++)
          for(int xx=x+g[i].x-MARGIN;xx<x+g[i].x+g[i].w+MARGIN;xx++)
            if(xx<0||yy<0||xx>=MAP_TIMES_W||yy>=MAP_TIMES_H||bit(taken,xx,yy)||bit(blocked,xx,yy)){fits=false;break;}
        if(!fits)continue;
        // Candidate routes, cheapest first (exits, then ports, in order on ties).
        int np=ports(p->template_text,orientation,total,size,x,y,port),nr=0;
        for(int e=0;e<4;e++)for(int q=0;q<np&&nr<MAX_ROUTES;q++){
          Route r;if(!route(p->x,p->y,EXITS[e],&port[q],&r))continue;
          int at=nr++;while(at>0&&routes[at-1].cost>r.cost){routes[at]=routes[at-1];at--;}
          routes[at]=r;
        }
        if(!nr||(best->ok&&routes[0].cost+penalty>=best->cost))continue;
        for(int r=0;r<nr;r++){
          if(best->ok&&routes[r].cost+penalty>=best->cost)break;
          RouteCheck c={taken,g,n,x,y,p->x,p->y,&p->own,markers,marker_count,true};map_time_route(routes[r].points,check_route,&c);
          if(c.ok){best->ok=true;best->orientation=orientation;best->x=x;best->y=y;best->cost=routes[r].cost+penalty;best->total=total;best->size=size;
            memcpy(best->points,routes[r].points,sizeof(best->points));break;}
        }
      }
    }
  }
  if(!best->ok)return;
  Box g[MAP_TIME_TEXT];int n=layout(p->template_text,best->orientation,best->total,size,g);
  for(int i=0;i<n;i++)for(int yy=best->y+g[i].y-MARGIN;yy<best->y+g[i].y+g[i].h+MARGIN;yy++)
    for(int xx=best->x+g[i].x-MARGIN;xx<best->x+g[i].x+g[i].w+MARGIN;xx++)set_bit(taken,xx,yy);
  map_time_route(best->points,mark_route,taken);
}
static const uint8_t ORDERS[6][3]={{0,1,2},{0,2,1},{1,0,2},{1,2,0},{2,0,1},{2,1,0}};
static void arrange(const uint8_t *blocked,const MapTimePlace places[3],const MapRect *obstacles,int obstacle_count,
  const MapMarker *markers,int marker_count,bool turn,uint8_t *taken,int size,MapTimeSpot out[3]){
  int32_t best_total=INT32_MAX;
  for(int o=0;o<6;o++){
    memset(taken,0,MAP_TIMES_MASK_BYTES);
    for(int i=0;i<3;i++)if(places[i].present)for(int dy=-HALO;dy<=HALO;dy++)for(int dx=-HALO;dx<=HALO;dx++)set_bit(taken,places[i].x+dx,places[i].y+dy);
    for(int k=0;k<obstacle_count;k++)for(int y=obstacles[k].y0;y<=obstacles[k].y1;y++)for(int x=obstacles[k].x0;x<=obstacles[k].x1;x++)set_bit(taken,x,y);
    MapTimeSpot result[3]={{0}};int32_t total=0;
    // An order already costing at least the best so far cannot win.
    for(int k=0;k<3&&total<best_total;k++){int i=ORDERS[o][k];if(!places[i].present)continue;
      place_one(&places[i],blocked,taken,turn,markers,marker_count,size,&result[i]);total+=result[i].ok?result[i].cost:10000;}
    if(total<best_total){best_total=total;memcpy(out,result,sizeof(result));}
  }
}
// Every label uses the chosen size and goes wherever it fits.
void map_times_place(const uint8_t *blocked,const MapTimePlace places[3],const MapRect *obstacles,int obstacle_count,
  const MapMarker *markers,int marker_count,bool turn,int size,uint8_t *taken,MapTimeSpot out[3]){
  arrange(blocked,places,obstacles,obstacle_count,markers,marker_count,turn,taken,size,out);
}
