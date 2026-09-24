#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "minute_flip.h"
#include "clock_styles.h"
// minute-flip-test <broad | chamfer-resource.bin[,style,clock-glyphs.bin]> <from> <to> <ms>...
int main(int argc,char **argv){
  assert(argc>=5);uint8_t from[4],to[4];const int positions[4]={0,1,3,4};
  for(int s=0;s<4;s++){from[s]=argv[2][positions[s]]==' '?10:argv[2][positions[s]]-'0';to[s]=argv[3][positions[s]]==' '?10:argv[3][positions[s]]-'0';assert(from[s]<=10&&to[s]<=10);}
  const ClockFace *face=&BROAD_FACE;ClockFace chamfer,styled;static uint8_t resource[65536],glyphs[65536];
  char *style=strchr(argv[1],',');if(style)*style++=0;
  if(strcmp(argv[1],"broad")){
    FILE *file=fopen(argv[1],"rb");assert(file);size_t length=fread(resource,1,sizeof(resource),file);fclose(file);
    assert(chamfer_face_init(&chamfer,resource,length));face=&chamfer;
    assert(!chamfer_face_init(&chamfer,resource,length-1));assert(chamfer_face_init(&chamfer,resource,length));
  }
  if(style){
    char *path=strchr(style,',');uint8_t code=(uint8_t)atoi(style);const uint8_t *font=NULL;int8_t box_top=0;
    if(path){
      FILE *file=fopen(path+1,"rb");assert(file);size_t length=fread(glyphs,1,sizeof(glyphs),file);fclose(file);
      font=clock_glyph_font(glyphs,length,code,&box_top);assert(font);
      assert(!clock_glyph_font(glyphs,(size_t)(font-glyphs)+80,code,NULL));assert(!clock_glyph_font(glyphs,length,4,NULL));
    }
    assert(clock_style_face(&styled,face,code,font,box_top));face=&styled;
  }
  ClockFlip flip;uint8_t *memory=malloc(clock_flip_bytes(face)),*packed=malloc(clock_frame_bytes(face)),*pixels=malloc(clock_pixels(face));
  assert(memory&&packed&&pixels);
  clock_flip_attach(&flip,face,memory);clock_flip_prepare(&flip,from,to);
  for(int i=4;i<argc;i++){
    clock_flip_sample(&flip,(uint16_t)atoi(argv[i]),packed);
    for(int p=0;p<clock_pixels(face);p++)pixels[p]=clock_frame_pixel(packed,p);
    assert(fwrite(pixels,1,clock_pixels(face),stdout)==(size_t)clock_pixels(face));
  }
  free(memory);free(packed);free(pixels);
  return 0;
}
