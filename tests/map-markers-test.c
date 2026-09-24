#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "map_markers.h"
// map-markers-test x y half ... : prints the laid-out positions.
int main(int argc,char **argv){
  MapMarker p[MAP_MARKERS_MAX],out[MAP_MARKERS_MAX];int n=0;
  for(int i=1;i+2<argc&&n<MAP_MARKERS_MAX;i+=3)p[n++]=(MapMarker){(int16_t)atoi(argv[i]),(int16_t)atoi(argv[i+1]),(uint8_t)atoi(argv[i+2])};
  uint8_t group[MAP_MARKERS_MAX];MapHull hulls[MAP_MARKERS_MAX];
  map_markers_layout(p,n,200,104,out,group);
  for(int i=0;i<n;i++)printf("%d,%d,%d ",out[i].x,out[i].y,group[i]);
  printf("|");
  int h=map_markers_hulls(p,out,group,n,hulls);
  for(int k=0;k<h;k++)printf("%d:%d,%d,%d,%d ",hulls[k].members,hulls[k].glyphs.x0,hulls[k].glyphs.y0,hulls[k].glyphs.x1,hulls[k].glyphs.y1);
  MapRect own[MAP_MARKERS_MAX];map_markers_own(p,out,group,n,hulls,h,own);printf("|");
  for(int i=0;i<n;i++)printf("%d,%d,%d,%d ",own[i].x0,own[i].y0,own[i].x1,own[i].y1);
  printf("\n");return 0;
}
