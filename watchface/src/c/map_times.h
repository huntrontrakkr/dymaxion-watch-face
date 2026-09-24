#pragma once
#include <stdbool.h>
#include <stdint.h>
// Place times on the map (shared/map-times.js): tiny 3x5 figures in the
// nearest open gap of the net, joined to the place glyph by a leader of flat
// and 45-degree runs. Masks are 200x104 bits, bit i = y*200+x, LSB first.
#define MAP_TIMES_W 200
#define MAP_TIMES_H 104
#define MAP_TIMES_MASK_BYTES (MAP_TIMES_W*MAP_TIMES_H/8)
#define MAP_TIME_TEXT 12
enum {MAP_TIME_H,MAP_TIME_V};
typedef struct {bool present;int16_t x,y;char template_text[MAP_TIME_TEXT];} MapTimePlace;
typedef struct {bool ok,diagonal_first;uint8_t orientation;int16_t x,y,ax,ay;int32_t cost;uint8_t total;} MapTimeSpot;
typedef void (*MapTimePixel)(void *context,int x,int y);
int tiny_width(const char *text);
// The label text: HH:MM, A/P in 12-hour time, then " +1" / " -1" / " ?".
void map_time_text(char out[MAP_TIME_TEXT],int hour,int minute,bool clock24,int delta,bool stale);
void map_time_template(char out[MAP_TIME_TEXT],bool clock24,bool reserve_day);
// Calls `pixel` for each lit pixel of `text` laid out at (x, y).
void map_time_pixels(const char *text,uint8_t orientation,int total,int x,int y,MapTimePixel pixel,void *context);
void map_time_leader(int ax,int ay,int bx,int by,bool diagonal_first,MapTimePixel pixel,void *context);
// `blocked` marks map pixels; `taken` is scratch of MAP_TIMES_MASK_BYTES.
void map_times_place(const uint8_t *blocked,const MapTimePlace places[3],bool turn,uint8_t *taken,MapTimeSpot out[3]);
