#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "map_light.h"
// Relights the baked map through a sequence of Suns ("x y z" per line, the
// watch's 1024-scaled vector) and checks every map pixel against the dense
// per-pixel rule after each one. Prints "mismatches reads bytes dots painted"
// per step. The first Sun is a full paint, as the watch does after a rebuild.
static unsigned char *map,*light;static long light_size;
static int night[200*104],bad_flags;
static unsigned char *load(const char *path,long *size){FILE *f=fopen(path,"rb");if(!f)exit(2);fseek(f,0,SEEK_END);long n=ftell(f);fseek(f,0,SEEK_SET);unsigned char *b=malloc(n);if(fread(b,1,n,f)!=(size_t)n)exit(3);fclose(f);if(size)*size=n;return b;}
static bool read_light(void *c,uint32_t offset,void *buffer,uint32_t length){(void)c;if(offset+length>(uint32_t)light_size)return false;memcpy(buffer,light+offset,length);return true;}
static void paint(void *c,int x,int y,uint8_t flags,bool is_night){(void)c;if(flags!=(map[(y*200+x)*4+3]&7))bad_flags++;night[y*200+x]=is_night;}
static bool dense(int x,int y,const int16_t s[3]){const signed char *n=(const signed char *)map+(y*200+x)*4;return map_night(n[0]*s[0]+n[1]*s[1]+n[2]*s[2],x,y);}
int main(int argc,char **argv){
  if(argc<3)return 1;
  map=load(argv[1],NULL);light=load(argv[2],&light_size);
  uint8_t classes[MAP_LIGHT_TILES];int16_t s[3];int x0,y0,z0,first=1;
  while(scanf("%d %d %d",&x0,&y0,&z0)==3){
    s[0]=x0;s[1]=y0;s[2]=z0;MapLightStats st={0};
    if(first){for(int i=0;i<200*104;i++)night[i]=dense(i%200,i/200,s);map_light_update(s,read_light,NULL,NULL,NULL,classes,&st);first=0;}
    else if(!map_light_update(s,read_light,NULL,paint,NULL,classes,&st)){puts("read failed");return 4;}
    int bad=0;for(int i=0;i<200*104;i++)if((map[i*4+3]&3)&&night[i]!=dense(i%200,i/200,s))bad++;
    printf("%d %u %u %u %u %d\n",bad,st.reads,st.bytes,st.dots,st.painted,bad_flags);
  }
  return 0;
}
