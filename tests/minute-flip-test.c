#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "minute_flip.h"
// minute-flip-test <broad | chamfer-resource.bin> <from> <to> <ms>...
int main(int argc,char **argv){
  assert(argc>=5);uint8_t from[4],to[4];const int positions[4]={0,1,3,4};
  for(int s=0;s<4;s++){from[s]=argv[2][positions[s]]==' '?10:argv[2][positions[s]]-'0';to[s]=argv[3][positions[s]]==' '?10:argv[3][positions[s]]-'0';assert(from[s]<=10&&to[s]<=10);}
  const ClockFace *face=&BROAD_FACE;ClockFace chamfer;static uint8_t resource[65536];
  if(strcmp(argv[1],"broad")){
    FILE *file=fopen(argv[1],"rb");assert(file);size_t length=fread(resource,1,sizeof(resource),file);fclose(file);
    assert(chamfer_face_init(&chamfer,resource,length));face=&chamfer;
    assert(!chamfer_face_init(&chamfer,resource,length-1));assert(chamfer_face_init(&chamfer,resource,length));
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
