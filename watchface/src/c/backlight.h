#pragma once
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#define BACKLIGHT_SIZE 6
bool backlight_valid(const uint8_t *p,size_t length);
// Restore the system tint outside our foreground session or on stale settings.
void backlight_apply(const uint8_t *p,uint8_t theme,bool focused);
