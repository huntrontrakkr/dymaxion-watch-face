#include <stdio.h>
#include "transitions.h"
// Prints every transition curve over its whole range, for comparison with shared/transitions.js.
int main(void){
  {for(int t=-10;t<=1010;t+=5)printf("%d ",transition_ease_out(t));}printf("\n");
  {for(int e=-5;e<=TRAY_MS+40;e+=3)printf("%d ",tray_slide(e));}printf("\n");
  {for(int from=0;from<=1000;from+=125)for(int e=0;e<=BESIDE_MS+50;e+=17)printf("%d %d ",beside_progress(from,true,e),beside_progress(from,false,e));}printf("\n");
  {for(int p=0;p<=1000;p+=10)printf("%d %d %d ",beside_shift(p,28),beside_shift(p,-28),column_alpha(p));}printf("\n");
  {for(int from=0xc0;from<=0xff;from+=7)for(int to=0xc0;to<=0xff;to+=5)for(int a=0;a<=1000;a+=125)printf("%d ",mix_color(from,to,a));}printf("\n");
  uint8_t old[200],row[200];
  for(int s=0;s<=200;s+=7){for(int x=0;x<200;x++){old[x]=x;row[x]=200+x%50;}
    tray_slide_row(old,row,s);long sum=0;for(int x=0;x<200;x++){sum+=row[x]*(x+1);}printf("%ld ",sum);}
  printf("\n");
  return 0;
}
