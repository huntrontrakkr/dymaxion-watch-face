#pragma once
#include <stdbool.h>
// The map pixel (before any rotation) that holds a direction: the Sun's or
// the Moon's. Mirrors projectToMap() in shared/map-net.js.
void map_net_project(const float direction[3],int *x,int *y);
