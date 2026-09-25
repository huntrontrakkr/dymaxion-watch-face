#include <stdio.h>
#include <stdlib.h>
#include "nameplate.h"
static int count;static long sum;
static void pixel(void *context,int x,int y){(void)context;count++;sum+=x*1000+y;}
// nameplate-test (map_y time_y height visible)... : layouts, then a pixel checksum.
int main(int argc,char **argv){
  for(int i=1;i+3<argc;i+=4){bool shown;int x=-1,y=-1;
    int top=nameplate_layout(atoi(argv[i]),atoi(argv[i+1]),atoi(argv[i+2]),atoi(argv[i+3]),&shown,&x,&y);
    if(shown)printf("%d,%d@%d ",x,y,top);else printf("-@%d ",top);}
  nameplate_pixels(0,0,pixel,NULL);printf("\n%d %ld\n",count,sum);
  return 0;
}
