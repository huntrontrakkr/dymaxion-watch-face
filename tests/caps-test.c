#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "caps.h"
#include "watch_text.h"
// caps-test <caps.bin> <text-xx.bin or -> <text>... : each text rendered left
// at x=4 and right at x=195, baseline 12, with the language's glyphs if given.
static uint8_t frame[200*18];
static void span(void *context,int x,int y,int length){
  (void)context;
  for(int i=0;i<length;i++)if(x+i>=0&&x+i<200&&y>=0&&y<18)frame[y*200+x+i]=1;
}
int main(int argc,char **argv){
  static uint8_t font[8192];FILE *file=fopen(argv[1],"rb");assert(file);
  size_t length=fread(font,1,sizeof(font),file);fclose(file);
  assert(caps_valid(font,length));assert(!caps_valid(font,length-1));
  static uint8_t pack[65536];
  if(strcmp(argv[2],"-")){
    file=fopen(argv[2],"rb");assert(file);size_t n=fread(pack,1,sizeof(pack),file);fclose(file);
    assert(watch_text_valid(pack,n));assert(!watch_text_valid(pack,n-1));watch_text_use(pack,n);
  }
  for(int i=3;i<argc;i++){
    memset(frame,0,sizeof(frame));
    caps_draw(font,argv[i],4,12,false,span,NULL);caps_draw(font,argv[i],195,12,true,span,NULL);
    printf("%d\n",caps_width(font,argv[i]));
    assert(fwrite(frame,1,sizeof(frame),stdout)==sizeof(frame));
  }
  return 0;
}
