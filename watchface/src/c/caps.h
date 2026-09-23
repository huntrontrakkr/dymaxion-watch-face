#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "generated/caps_font.h"
// Status-line capitals drawn from generated pixel runs (resources/data/caps.bin).
typedef void (*CapsSpan)(void *context, int x, int y, int length);
bool caps_valid(const uint8_t *font, size_t length);
int caps_width(const uint8_t *font, const char *text);
// Draws text with its baseline at `baseline`; right-aligned when `right` is set.
void caps_draw(const uint8_t *font, const char *text, int x, int baseline, bool right, CapsSpan span, void *context);
