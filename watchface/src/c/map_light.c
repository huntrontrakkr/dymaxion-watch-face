#include "map_light.h"
enum {LIGHT_DAY,LIGHT_NIGHT,LIGHT_CHECKER,LIGHT_MIXED};
#define CHUNK 16
// The shading every pixel within `reach` of light `c` shares, if any.
static int shading(int32_t c,int32_t reach){
  int32_t lo=c-reach,hi=c+reach;
  if(lo>=MAP_SUNRISE)return LIGHT_DAY;
  if(hi<MAP_CIVIL_TWILIGHT)return LIGHT_NIGHT;
  if(lo>=MAP_CIVIL_TWILIGHT&&hi<MAP_SUNRISE)return LIGHT_CHECKER;
  return LIGHT_MIXED;
}
static bool night_in(int shade,int x,int y){return shade==LIGHT_NIGHT||(shade==LIGHT_CHECKER&&((x+y)&1));}
// The smallest integer at least the length of the Sun vector.
static int32_t length_ceil(const int16_t s[3]){
  uint32_t v=(uint32_t)(s[0]*s[0]+s[1]*s[1]+s[2]*s[2]),r=0;
  for(uint32_t bit=1u<<30;bit;bit>>=2){if(v>=r+bit){v-=r+bit;r=(r>>1)+bit;}else r>>=1;}
  return (int32_t)r+(v?1:0);
}
static int32_t light_of(const int8_t n[3],const int16_t s[3]){return n[0]*s[0]+n[1]*s[1]+n[2]*s[2];}
static bool fetch(MapLightRead read,void *context,uint32_t offset,void *buffer,uint32_t length,MapLightStats *stats){
  if(stats){stats->reads++;stats->bytes+=length;}
  return read(context,offset,buffer,length);
}
bool map_light_update(const int16_t sun[3],MapLightRead read,void *rc,MapLightPaint paint,void *pc,uint8_t classes[MAP_LIGHT_TILES],MapLightStats *stats){
  int32_t size=length_ceil(sun);
  uint8_t table[CHUNK*8];
  for(int first=0;first<MAP_LIGHT_TILES;first+=CHUNK){
    int count=MAP_LIGHT_TILES-first<CHUNK?MAP_LIGHT_TILES-first:CHUNK;
    if(!fetch(read,rc,MAP_LIGHT_TABLE+first*8,table,count*8,stats))return false;
    for(int k=0;k<count;k++){
      const uint8_t *e=table+k*8;int i=first+k;
      int shade=shading(light_of((const int8_t *)e,sun),size*e[3]);
      if(stats)stats->dots++;
      if(!paint||(shade!=LIGHT_MIXED&&shade==classes[i])){classes[i]=shade;continue;}
      // The flags, then (when the tile straddles a threshold) its sub-tile
      // bounds and stored directions.
      uint8_t block[32+64+MAP_LIGHT_TILE*MAP_LIGHT_TILE*3];
      uint32_t at=MAP_LIGHT_BLOCKS+(e[4]|e[5]<<8);int pos=(e[6]|e[7]<<8)&511,pixels=e[7]>>1;
      int tx=pos%MAP_LIGHT_TILES_X*MAP_LIGHT_TILE,ty=pos/MAP_LIGHT_TILES_X*MAP_LIGHT_TILE;
      if(!fetch(read,rc,at,block,shade==LIGHT_MIXED?96+pixels*3:32,stats))return false;
      const int8_t *normal=(const int8_t *)block+96;
      for(int s=0;s<16;s++){
        const uint8_t *b=block+32+s*4;int sx=s%4*2,sy=s/4*2,sub=shade;
        if(shade==LIGHT_MIXED&&b[3]!=255){sub=shading(light_of((const int8_t *)b,sun),size*b[3]);if(stats)stats->dots++;}
        for(int dy=0;dy<2;dy++)for(int dx=0;dx<2;dx++){
          int lx=sx+dx,ly=sy+dy,p=ly*MAP_LIGHT_TILE+lx;uint8_t flags=(block[p>>1]>>((p&1)*4))&7;
          if(!(flags&3))continue;
          int x=tx+lx,y=ty+ly;bool night;
          if(sub==LIGHT_MIXED){night=map_night(light_of(normal,sun),x,y);if(stats)stats->dots++;}
          else night=night_in(sub,x,y);
          if(shade==LIGHT_MIXED)normal+=3;
          paint(pc,x,y,flags,night);if(stats)stats->painted++;
        }
      }
      classes[i]=shade;
    }
  }
  return true;
}
