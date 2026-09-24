#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "map_markers.h"
// map-markers-test x y half ... : prints the laid-out positions.
int main(int argc,char **argv){
  MapMarker p[MAP_MARKERS_MAX],out[MAP_MARKERS_MAX];int n=0;
  for(int i=1;i+2<argc&&n<MAP_MARKERS_MAX;i+=3)p[n++]=(MapMarker){(int16_t)atoi(argv[i]),(int16_t)atoi(argv[i+1]),(uint8_t)atoi(argv[i+2])};
  map_markers_layout(p,n,200,104,out);
  for(int i=0;i<n;i++)printf("%d,%d ",out[i].x,out[i].y);
  printf("\n");return 0;
}
