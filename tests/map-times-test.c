#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "map_times.h"
static void print_pixel(void *context,int x,int y){(void)context;printf("%d,%d ",x,y);}
// map-times-test map-0.bin turn clock24 reserve size  (x y ox0 oy0 ox1 oy1)x3  n (x0 y0 x1 y1)xn  m (x y half)xm
// (x<0: absent). Prints each spot, then the drawn label and leader pixels of each.
int main(int argc,char **argv){
  static uint8_t map[MAP_TIMES_W*MAP_TIMES_H*4],blocked[MAP_TIMES_MASK_BYTES],taken[2*MAP_TIMES_MASK_BYTES];
  FILE *f=fopen(argv[1],"rb");assert(f);assert(fread(map,1,sizeof(map),f)==sizeof(map));fclose(f);
  for(int i=0;i<MAP_TIMES_W*MAP_TIMES_H;i++)if(map[i*4+3]&3)blocked[i>>3]|=1u<<(i&7);
  int a=2;bool turn=atoi(argv[a++]),clock24=atoi(argv[a++]),reserve=atoi(argv[a++]);int size=atoi(argv[a++]);MapTimePlace places[3];
  for(int i=0;i<3;i++){
    places[i].x=atoi(argv[a++]);places[i].y=atoi(argv[a++]);places[i].present=places[i].x>=0;
    places[i].own=(MapRect){(int16_t)atoi(argv[a]),(int16_t)atoi(argv[a+1]),(int16_t)atoi(argv[a+2]),(int16_t)atoi(argv[a+3])};a+=4;
    map_time_template(places[i].template_text,clock24,reserve);
  }
  MapRect obstacles[8];MapMarker markers[8];int n=atoi(argv[a++]);
  for(int k=0;k<n;k++){obstacles[k]=(MapRect){(int16_t)atoi(argv[a]),(int16_t)atoi(argv[a+1]),(int16_t)atoi(argv[a+2]),(int16_t)atoi(argv[a+3])};a+=4;}
  int m=atoi(argv[a++]);
  for(int k=0;k<m;k++){markers[k]=(MapMarker){(int16_t)atoi(argv[a]),(int16_t)atoi(argv[a+1]),(uint8_t)atoi(argv[a+2])};a+=3;}
  assert(a==argc);
  MapTimeSpot spots[3];clock_t t0=clock();
  for(int r=0;r<20;r++)map_times_place(blocked,places,obstacles,n,markers,m,turn,size,taken,spots);
  fprintf(stderr,"%.2f ms per placement\n",(double)(clock()-t0)*1000/CLOCKS_PER_SEC/20);
  for(int i=0;i<3;i++){MapTimeSpot s=spots[i];
    if(!s.ok){printf("-\n");continue;}
    printf("%d %d %d %d %d %d",s.orientation,s.x,s.y,(int)s.cost,s.total,s.size);for(int k=0;k<5;k++)printf(" %d,%d",s.points[k].x,s.points[k].y);printf("\n");
    char text[MAP_TIME_TEXT];map_time_text(text,i==2?1:13,i*7,clock24,i-1,false);printf("%s|",text);
    map_time_pixels(text,s.orientation,s.total,s.size,s.x,s.y,print_pixel,NULL);printf("|");
    map_time_route(s.points,print_pixel,NULL);MapRect h=map_time_hull(&s);printf("|%d %d %d %d\n",h.x0,h.y0,h.x1,h.y1);
  }
  return 0;
}
