#include "map_markers.h"
static int cheb(int ax,int ay,int bx,int by){int dx=ax>bx?ax-bx:bx-ax,dy=ay>by?ay-by:by-ay;return dx>dy?dx:dy;}
static int find(int *g,int i){while(g[i]!=i)i=g[i]=g[g[i]];return i;}
static int join(int *g,int a,int b){a=find(g,a);b=find(g,b);if(a==b)return 0;if(a<b)g[b]=a;else g[a]=b;return 1;}
static int round_mean(int sum,int n){int v=2*sum+n,d=2*n;return v>=0?v/d:-((-v+d-1)/d);}
void map_markers_layout(const MapMarker *p,int n,int width,int height,MapMarker *out,uint8_t *group){
  int g[MAP_MARKERS_MAX];
  for(int i=0;i<n;i++){g[i]=i;out[i]=p[i];}
  for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if(cheb(p[i].x,p[i].y,p[j].x,p[j].y)<=p[i].half+p[j].half+2)join(g,i,j);
  for(int pass=0;pass<n;pass++){
    for(int root=0;root<n;root++){
      int m[MAP_MARKERS_MAX],count=0,sx=0,sy=0;
      for(int i=0;i<n;i++)if(find(g,i)==root)m[count++]=i;
      if(count<2){if(count)out[m[0]]=p[m[0]];continue;}
      // West to east, then north to south, then by index.
      for(int a=1;a<count;a++){int v=m[a],b=a;
        while(b>0&&(p[m[b-1]].x>p[v].x||(p[m[b-1]].x==p[v].x&&(p[m[b-1]].y>p[v].y||(p[m[b-1]].y==p[v].y&&m[b-1]>v))))){m[b]=m[b-1];b--;}
        m[b]=v;}
      for(int k=0;k<count;k++){sx+=p[m[k]].x;sy+=p[m[k]].y;}
      int cx=round_mean(sx,count),cy=round_mean(sy,count),offsets[MAP_MARKERS_MAX]={0};
      for(int k=1;k<count;k++)offsets[k]=offsets[k-1]+p[m[k-1]].half+p[m[k]].half+2;
      int span=offsets[count-1],x0=cx-(span>>1),lo=p[m[0]].half,hi=width-1-p[m[count-1]].half-span;
      x0=x0<lo?lo:x0>hi?hi:x0;
      for(int k=0;k<count;k++){int i=m[k],y=cy<p[i].half?p[i].half:cy>height-1-p[i].half?height-1-p[i].half:cy;
        out[i]=(MapMarker){(int16_t)(x0+offsets[k]),(int16_t)y,p[i].half};}
    }
    int merged=0;
    for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)
      if(find(g,i)!=find(g,j)&&cheb(out[i].x,out[i].y,out[j].x,out[j].y)<=p[i].half+p[j].half+2)merged|=join(g,i,j);
    if(!merged)break;
  }
  if(group)for(int i=0;i<n;i++)group[i]=(uint8_t)find(g,i);
}
int map_markers_hulls(const MapMarker *p,const MapMarker *l,const uint8_t *group,int n,MapHull *hulls){
  int count=0;
  for(int root=0;root<n;root++){
    int members=0,cy=0,x0=1000,x1=-1000,ox0=1000,oy0=1000,ox1=-1000,oy1=-1000;
    for(int i=0;i<n;i++)if(group[i]==root){
      if(!members++)cy=l[i].y;
      int lo=l[i].x-p[i].half,hi=l[i].x+p[i].half;x0=lo<x0?lo:x0;x1=hi>x1?hi:x1;
      int a=l[i].x-p[i].half-1,b=l[i].y-p[i].half-1,c=l[i].x+p[i].half+1,d=l[i].y+p[i].half+1;
      ox0=a<ox0?a:ox0;oy0=b<oy0?b:oy0;ox1=c>ox1?c:ox1;oy1=d>oy1?d:oy1;
    }
    if(members<2)continue;
    MapRect band={(int16_t)x0,(int16_t)(cy-HULL_HALF),(int16_t)x1,(int16_t)(cy+HULL_HALF)};
    hulls[count++]=(MapHull){(uint8_t)members,band,band,{(int16_t)ox0,(int16_t)oy0,(int16_t)ox1,(int16_t)oy1}};
  }
  return count;
}
void map_hull_ground(const MapHull *h,MapHullPixel pixel,void *context){
  const MapRect *g=&h->glyphs;
  for(int y=g->y0+1;y<g->y1;y++)for(int x=g->x0+1;x<g->x1;x++)pixel(context,x,y);
}
void map_hull_outline(const MapHull *h,MapHullPixel pixel,void *context){
  const MapRect *g=&h->glyphs;
  for(int x=g->x0+1;x<g->x1;x++){pixel(context,x,g->y0);pixel(context,x,g->y1);}
  for(int y=g->y0+1;y<g->y1;y++){pixel(context,g->x0,y);pixel(context,g->x1,y);}
}
void map_markers_own(const MapMarker *p,const MapMarker *l,const uint8_t *group,int n,const MapHull *hulls,int hull_count,MapRect *own){
  for(int i=0;i<n;i++){
    int r=p[i].half+1;own[i]=(MapRect){(int16_t)(l[i].x-r),(int16_t)(l[i].y-r),(int16_t)(l[i].x+r),(int16_t)(l[i].y+r)};
    // A grouped marker's hull: the one whose glyph box holds it.
    for(int k=0;k<hull_count;k++){const MapRect *g=&hulls[k].glyphs;
      int members=0;for(int j=0;j<n;j++)if(group[j]==group[i])members++;
      if(members>1&&l[i].x>=g->x0&&l[i].x<=g->x1&&l[i].y>=g->y0&&l[i].y<=g->y1){own[i]=hulls[k].outer;break;}}
  }
}
