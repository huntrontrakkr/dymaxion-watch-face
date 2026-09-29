#include <stdio.h>
#include "map_net.h"
// Reads "x y z" directions; prints the map pixel for each.
int main(void){float d[3];while(scanf("%f %f %f",&d[0],&d[1],&d[2])==3){int x,y;map_net_project(d,&x,&y);printf("%d %d\n",x,y);}return 0;}
