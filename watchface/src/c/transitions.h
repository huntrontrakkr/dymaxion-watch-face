#pragma once
#include <stdbool.h>
#include <stdint.h>
// Transitions between states of the face (shared/transitions.js): the bottom
// tray swiping to its next page, and the clock making room for the place
// times beside it.
#define TRAY_MS 300
#define BESIDE_MS 500
#define TRANSITION_FRAME_MS 33
#define TRAY_Y 184
#define TRAY_H 44
int transition_ease_out(int t);
int tray_slide(int32_t elapsed);
void tray_slide_row(const uint8_t *old_row,uint8_t *row,int slide);
int beside_progress(int from,bool toward,int32_t elapsed);
int beside_shift(int p,int shift);
int column_alpha(int p);
uint8_t mix_color(uint8_t from,uint8_t to,int alpha);
