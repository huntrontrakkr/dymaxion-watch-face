#include "place_glyphs.h"
#include "settings.h"
#include "generated/markers.h"
bool glyphs_valid(const uint8_t *p,size_t length){
  if(!p||length!=GLYPHS_SIZE||p[0]!=1||p[1]&~GLYPHS_BESIDE)return false;
  for(size_t i=2;i<GLYPHS_SIZE;i++)if(p[i]>=32)return false;
  return true;
}
void place_glyph_rows(const uint8_t *glyphs,int place,uint8_t icon,uint8_t rows[GLYPH_ROWS]){
  for(int y=0;y<GLYPH_ROWS;y++)rows[y]=icon==MARKER_CUSTOM?glyphs[2+place*GLYPH_ROWS+y]:(uint8_t)MARKER_ROWS[icon<MARKER_COUNT?icon:0][y];
}
