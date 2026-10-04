#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "watch_text.h"
// watch-text-test <text-xx.bin or -> : every string, one per line, then the
// date and calendar patterns filled for Wednesday 7 October 2026.
int main(int argc,char **argv){
  (void)argc;static uint8_t pack[65536];
  if(strcmp(argv[1],"-")){
    FILE *file=fopen(argv[1],"rb");assert(file);size_t n=fread(pack,1,sizeof(pack),file);fclose(file);
    assert(watch_text_valid(pack,n));watch_text_use(pack,n);
    // A corrupt resource falls back to English.
    pack[0]='X';assert(!watch_text_valid(pack,n));pack[0]='W';
  }
  for(int i=0;i<WT_STRING_COUNT;i++)printf("%s\n",watch_text(i));
  char out[64];
  watch_text_fill(out,sizeof(out),watch_text(WT_DATE),watch_text(WT_WEEKDAYS+3),7,watch_text(WT_MONTHS+9),"",0);printf("%s\n",out);
  watch_text_fill(out,sizeof(out),watch_text(WT_CALENDAR_TITLE),"",0,watch_text(WT_MONTHS+9),"",2026);printf("%s\n",out);
  watch_text_fill(out,sizeof(out),watch_text(WT_CALENDAR_SPAN),"",0,watch_text(WT_MONTHS+9),watch_text(WT_MONTHS+10),0);printf("%s\n",out);
  // Filling stops at the buffer's end.
  char small[4];watch_text_fill(small,sizeof(small),"{y}{y}","",0,"","",2026);assert(!strcmp(small,"202"));
  // UTF-8 decoding, including a malformed byte.
  const char *t="A\xc3\xa9\xe6\x9c\x88\xff";
  assert(watch_text_next(&t)=='A');assert(watch_text_next(&t)==0xe9);assert(watch_text_next(&t)==0x6708);assert(watch_text_next(&t)=='?');assert(watch_text_next(&t)==0);
  return 0;
}
