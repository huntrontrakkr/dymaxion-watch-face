#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "map_times.h"
static void print_pixel(void *context,int x,int y){(void)context;printf("%d,%d ",x,y);}
// map-times-test map-0.bin turn clock24 reserve x0 y0 x1 y1 x2 y2 (x<0: absent)
// Prints each spot, then the drawn label and leader pixels of each.
int main(int argc,char **argv){
  assert(argc==11);static uint8_t map[MAP_TIMES_W*MAP_TIMES_H*4],blocked[MAP_TIMES_MASK_BYTES],taken[MAP_TIMES_MASK_BYTES];
  FILE *f=fopen(argv[1],"rb");assert(f);assert(fread(map,1,sizeof(map),f)==sizeof(map));fclose(f);
  for(int i=0;i<MAP_TIMES_W*MAP_TIMES_H;i++)if(map[i*4+3]&3)blocked[i>>3]|=1u<<(i&7);
  bool turn=atoi(argv[2]),clock24=atoi(argv[3]),reserve=atoi(argv[4]);MapTimePlace places[3];
  for(int i=0;i<3;i++){places[i].x=atoi(argv[5+2*i]);places[i].y=atoi(argv[6+2*i]);places[i].present=places[i].x>=0;map_time_template(places[i].template_text,clock24,reserve);}
  MapTimeSpot spots[3];clock_t t0=clock();
  for(int r=0;r<20;r++)map_times_place(blocked,places,turn,taken,spots);
  fprintf(stderr,"%.2f ms per placement\n",(double)(clock()-t0)*1000/CLOCKS_PER_SEC/20);
  for(int i=0;i<3;i++){MapTimeSpot s=spots[i];
    if(!s.ok){printf("-\n");continue;}
    printf("%d %d %d %d %d",s.orientation,s.x,s.y,(int)s.cost,s.total);for(int k=0;k<5;k++)printf(" %d,%d",s.points[k].x,s.points[k].y);printf("\n");
    char text[MAP_TIME_TEXT];map_time_text(text,i==2?1:13,i*7,clock24,i-1,false);printf("%s|",text);
    map_time_pixels(text,s.orientation,s.total,s.x,s.y,print_pixel,NULL);printf("|");
    map_time_route(s.points,print_pixel,NULL);printf("\n");
  }
  return 0;
}
