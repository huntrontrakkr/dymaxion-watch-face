#include <stdio.h>
#include <stdlib.h>
#include "nameplate.h"
static int count;static long sum;
static void pixel(void *context,int x,int y){(void)context;count++;sum+=x*1000+y;}
// nameplate-test (map_y clock_top stacked)... : spots, then a pixel checksum.
int main(int argc,char **argv){
  for(int i=1;i+2<argc;i+=3){int x=-1,y=-1;bool ok=nameplate_spot(atoi(argv[i]),atoi(argv[i+1]),atoi(argv[i+2]),&x,&y);printf(ok?"%d,%d ":"- ",x,y);}
  nameplate_pixels(0,0,pixel,NULL);printf("\n%d %ld\n",count,sum);
  return 0;
}
