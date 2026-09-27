#include <stdio.h>
#include <assert.h>
#include "smart_tray.h"
// Reads cases "count home hour rain tide steps page..." from stdin, one per
// line, and prints the page chosen for each.
int main(void){
  int count,home,hour,rain,tide,steps;
  while(scanf("%d %d %d %d %d %d",&count,&home,&hour,&rain,&tide,&steps)==6){
    uint8_t pages[6];
    for(int i=0;i<count;i++){int p;if(scanf("%d",&p)!=1)return 1;pages[i]=(uint8_t)p;}
    SmartInputs in={pages,count,home,hour,rain,tide,steps};
    if(!smart_needs_steps(&in)){
      SmartInputs unknown=in,walking=in;unknown.recent_steps=-1;walking.recent_steps=10000;
      assert(smart_page(&unknown)==smart_page(&walking));
    }
    printf("%d\n",smart_page(&in));
  }
  return 0;
}
