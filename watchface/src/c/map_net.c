#include "map_net.h"
#include "generated/map_net.h"
// The face whose centre is nearest, the placement holding that part of it
// (split faces are placed twice), then the point's gnomonic barycentrics on
// that placement's corners: the same steps as projectToMap in shared/map-net.js.
static float dot3(const float a[3],const float b[3]){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
static void vertex(int i,float out[3]){for(int k=0;k<3;k++)out[k]=NET_VERTICES[i][k]/(float)NET_V_SCALE;}
static int lcd_of(float a,float b,float c){
  if(a>=b&&b>=c)return 1;
  if(a>=c&&c>=b)return 6;
  if(b>=a&&a>=c)return 2;
  if(b>=c&&c>=a)return 3;
  if(c>=a&&a>=b)return 5;
  return 4;
}
void map_net_project(const float d[3],int *x,int *y){
  int face=0;float best=-10;
  for(int f=0;f<20;f++){
    float s=0,v[3];
    for(int j=0;j<3;j++){vertex(NET_FACES[f][j],v);s+=dot3(d,v);}
    if(s>best){best=s;face=f;}
  }
  float A[3],B[3],C[3];vertex(NET_FACES[face][0],A);vertex(NET_FACES[face][1],B);vertex(NET_FACES[face][2],C);
  int lcd=lcd_of(dot3(d,A),dot3(d,B),dot3(d,C));
  const NetPlacement *p=NET_PLACEMENTS;
  for(int i=0;i<NET_PLACEMENT_COUNT;i++)if(NET_PLACEMENTS[i].face==face&&(!NET_PLACEMENTS[i].lcd||(NET_PLACEMENTS[i].lcd>>(lcd-1))&1)){p=&NET_PLACEMENTS[i];break;}
  float v0[3],v1[3],n[3],v2[3];
  for(int k=0;k<3;k++){v0[k]=B[k]-A[k];v1[k]=C[k]-A[k];}
  n[0]=v0[1]*v1[2]-v0[2]*v1[1];n[1]=v0[2]*v1[0]-v0[0]*v1[2];n[2]=v0[0]*v1[1]-v0[1]*v1[0];
  float t=dot3(n,A)/dot3(n,d);
  for(int k=0;k<3;k++)v2[k]=d[k]*t-A[k];
  float d00=dot3(v0,v0),d01=dot3(v0,v1),d11=dot3(v1,v1),d20=dot3(v2,v0),d21=dot3(v2,v1),den=d00*d11-d01*d01;
  float u=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den,s=1-u-w;
  int out[2];
  for(int i=0;i<2;i++){
    float at=(s*p->corner[0][i]+u*p->corner[1][i]+w*p->corner[2][i])/NET_PX_SCALE;
    int v=at<0?-1:(int)at; // floor for the map's non-negative range
    int top=i?103:199;out[i]=v<0?0:v>top?top:v;
  }
  *x=out[0];*y=out[1];
}
