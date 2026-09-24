#include "map_markers.h"
static int cheb(int ax,int ay,int bx,int by){int dx=ax>bx?ax-bx:bx-ax,dy=ay>by?ay-by:by-ay;return dx>dy?dx:dy;}
static int find(int *g,int i){while(g[i]!=i)i=g[i]=g[g[i]];return i;}
static int join(int *g,int a,int b){a=find(g,a);b=find(g,b);if(a==b)return 0;if(a<b)g[b]=a;else g[a]=b;return 1;}
static int round_mean(int sum,int n){int v=2*sum+n,d=2*n;return v>=0?v/d:-((-v+d-1)/d);}
void map_markers_layout(const MapMarker *p,int n,int width,int height,MapMarker *out){
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
}
