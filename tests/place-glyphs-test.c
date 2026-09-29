#include <stdio.h>
#include <stdlib.h>
#include "place_glyphs.h"
#include "settings.h"
// Reads a GLYPHS packet as hex bytes, then per place its glyph ID; prints
// whether the packet is valid, whether icons show beside the clock, and each
// place's five rows (bit 4 the leftmost pixel) as the watch would draw them.
int main(void){
  uint8_t p[GLYPHS_SIZE];unsigned v;
  for(int i=0;i<GLYPHS_SIZE;i++){if(scanf("%x",&v)!=1)return 1;p[i]=(uint8_t)v;}
  printf("%d %d\n",glyphs_valid(p,GLYPHS_SIZE),glyphs_beside(p));
  for(int place=0;place<3;place++){
    int icon;if(scanf("%d",&icon)!=1)return 1;
    uint8_t rows[GLYPH_ROWS];place_glyph_rows(p,place,(uint8_t)icon,rows);
    for(int y=0;y<GLYPH_ROWS;y++)printf("%s%d",y?",":"",rows[y]);
    puts("");
  }
  // Packets the watch must refuse.
  uint8_t bad[GLYPHS_SIZE]={2};printf("%d",glyphs_valid(bad,GLYPHS_SIZE));
  uint8_t wide[GLYPHS_SIZE]={1,0,32};printf("%d",glyphs_valid(wide,GLYPHS_SIZE));
  uint8_t flag[GLYPHS_SIZE]={1,2};printf("%d",glyphs_valid(flag,GLYPHS_SIZE));
  printf("%d\n",glyphs_valid(p,GLYPHS_SIZE-1));
  return 0;
}
