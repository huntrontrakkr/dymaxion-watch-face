#include <stdio.h>
#include "smart_tray.h"
// Reads cases "count home hour rain tide steps page..." from stdin, one per
// line, and prints the page chosen for each.
int main(void){
  int count,home,hour,rain,tide,steps;
  while(scanf("%d %d %d %d %d %d",&count,&home,&hour,&rain,&tide,&steps)==6){
    uint8_t pages[6];
    for(int i=0;i<count;i++){int p;if(scanf("%d",&p)!=1)return 1;pages[i]=(uint8_t)p;}
    SmartInputs in={pages,count,home,hour,rain,tide,steps};
    printf("%d\n",smart_page(&in));
  }
  return 0;
}
