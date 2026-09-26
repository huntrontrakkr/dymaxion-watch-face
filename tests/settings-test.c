#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "settings.h"
#include "generated/palette_sizes.h"
int main(int argc,char **argv) {
  assert(calendar_ordinal(2026,9,23)-calendar_ordinal(2026,9,22)==1);
  assert(calendar_ordinal(2027,1,1)-calendar_ordinal(2026,12,31)==1);
  assert(calendar_ordinal(2028,3,1)-calendar_ordinal(2028,2,29)==1);
  assert(calendar_ordinal(2028,3,1)-calendar_ordinal(2028,2,28)==2);
  assert(calendar_ordinal(2027,3,1)-calendar_ordinal(2027,2,28)==1);
  // Quick View clock placement; the same table is asserted in tests/core.test.mjs.
  assert(clock_top_for_visible(22,40,228)==22);
  assert(clock_top_for_visible(22,40,177)==22);
  assert(clock_top_for_visible(134,40,228)==134);
  assert(clock_top_for_visible(134,40,177)==134);
  assert(clock_top_for_visible(134,46,177)==129);
  assert(clock_top_for_visible(20,84,177)==20);
  assert(clock_top_for_visible(22,40,40)==18);
  assert(clock_top_for_visible(134,46,150)==102);
  // Bluetooth buzz: disconnect only by default, reconnect when asked, off when off,
  // and a flapping link buzzes at most once per BUZZ_REST_S.
  {BuzzState b={0};
   assert(connection_buzz(&b,false,1000,BUZZ_DISCONNECT));
   assert(!connection_buzz(&b,false,1000+BUZZ_REST_S-1,BUZZ_DISCONNECT));
   assert(!connection_buzz(&b,true,5000,BUZZ_DISCONNECT));
   assert(connection_buzz(&b,false,5000,BUZZ_DISCONNECT));
   BuzzState both={0};assert(connection_buzz(&both,true,1000,BUZZ_DISCONNECT|BUZZ_RECONNECT));
   BuzzState off={0};assert(!connection_buzz(&off,false,1000,0));assert(!connection_buzz(&off,true,1000,BUZZ_RECONNECT));}
  assert(argc==3);uint8_t bytes[SETTINGS_SIZE],bad[SETTINGS_SIZE];
  for(int i=1;i<argc;i++) {FILE *f=fopen(argv[i],"rb");assert(f);assert(fread(bytes,1,sizeof(bytes),f)==sizeof(bytes));fclose(f);assert(settings_valid(bytes,sizeof(bytes)));}
  assert(!settings_valid(bytes,231));assert(!settings_valid(bytes,233));
  for(int theme=0;theme<THEME_COUNT;theme++){memcpy(bad,bytes,sizeof(bytes));bad[THEME]=theme;assert(settings_valid(bad,sizeof(bad)));}
  memcpy(bad,bytes,sizeof(bytes));bad[THEME]=THEME_COUNT;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[THEME]=255;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[VERSION]=1;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[VERSION]=2;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[VERSION]=3;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[VERSION]=4;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[VERSION]=5;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[VERSION]=6;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[TIME_X]=1;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[ORIENTATION]=1;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+16]=9;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+7]='X';assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+14]=255;bad[HEADER_SIZE+15]=127;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+70]=0x3f;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+10]=MARKER_COUNT;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+71]=1;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+17]=2;assert(!settings_valid(bad,sizeof(bad)));
  // Byte 17 of the second and third places: the battery gauge and the step line, on or off.
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+ZONE_SIZE+17]=1;assert(settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+ZONE_SIZE+17]=2;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+2*ZONE_SIZE+17]=1;assert(settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+2*ZONE_SIZE+17]=2;assert(!settings_valid(bad,sizeof(bad)));
  memcpy(bad,bytes,sizeof(bytes));bad[HEADER_SIZE+10]=MARKER_COUNT-1;bad[HEADER_SIZE+70]=0xff;assert(settings_valid(bad,sizeof(bad)));
  assert(zone_offset(bytes+HEADER_SIZE,1772953199)==-300);
  assert(zone_offset(bytes+HEADER_SIZE,1772953200)==-240);
  return 0;
}
