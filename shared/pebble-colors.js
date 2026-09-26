// The 64 colors a Pebble can show (two bits per channel), with their order and
// sunlight correction from Pebble's Clay configuration library
// (https://github.com/pebble/clay, src/scripts/components/color.js;
// MIT License, Copyright (c) 2016 Pebble Technology). The sunlight table is
// Pebble's own sampling of how each color looks on a Pebble Time screen; the
// Time 2's display is similar but was not part of that sampling.
// A hexagon of hexagons: rows of 6, 7, 8, 9, 10, 9, 8 and 7 cells, each row
// offset half a cell from the next. Colors keep their places from Pebble's
// Clay layout (hues around the edge, greys in the middle), moved to the
// nearest cell by an optimal assignment.
export const WATCH_COLOR_LAYOUT = Object.freeze([
  ['55ff00', 'aaff55', 'aaff00', 'ffff55', 'ffffaa', 'ffaaaa'],
  ['aaffaa', '55ff55', '00ff00', 'aaaa55', 'ffff00', 'ffaa55', 'ff5500'],
  ['55ffaa', '00ff55', '00aa00', '55aa00', 'aaaa00', '555500', 'ffaa00', 'ff5555'],
  ['aaffff', '00ffaa', '00aa55', '55aa55', '005500', '000000', 'aa5500', 'ff0000', 'ff0055'],
  ['55ffff', '55aaaa', '00aaaa', '005555', 'aaaaaa', 'ffffff', '555555', 'aa5555', 'aa0000', 'ff55aa'],
  ['55aaff', '00ffff', '00aaff', '0055aa', '000055', '550055', '550000', 'aa0055', 'ffaaff'],
  ['0055ff', '0000ff', '0000aa', '5500ff', '5500aa', 'aa00ff', 'aa00aa', 'ff00aa'],
  ['5555aa', '5555ff', 'aaaaff', 'aa55ff', 'aa55aa', 'ff00ff', 'ff55ff']
].map(row => Object.freeze(row)));
export const SUNLIGHT = Object.freeze({
  '000000': '000000', '000055': '001e41', '0000aa': '004387', '0000ff': '0068ca',
  '005500': '2b4a2c', '005555': '27514f', '0055aa': '16638d', '0055ff': '007dce',
  '00aa00': '5e9860', '00aa55': '5c9b72', '00aaaa': '57a5a2', '00aaff': '4cb4db',
  '00ff00': '8ee391', '00ff55': '8ee69e', '00ffaa': '8aebc0', '00ffff': '84f5f1',
  '550000': '4a161b', '550055': '482748', '5500aa': '40488a', '5500ff': '2f6bcc',
  '555500': '564e36', '555555': '545454', '5555aa': '4f6790', '5555ff': '4180d0',
  '55aa00': '759a64', '55aa55': '759d76', '55aaaa': '71a6a4', '55aaff': '69b5dd',
  '55ff00': '9ee594', '55ff55': '9de7a0', '55ffaa': '9becc2', '55ffff': '95f6f2',
  'aa0000': '99353f', 'aa0055': '983e5a', 'aa00aa': '955694', 'aa00ff': '8f74d2',
  'aa5500': '9d5b4d', 'aa5555': '9d6064', 'aa55aa': '9a7099', 'aa55ff': '9587d5',
  'aaaa00': 'afa072', 'aaaa55': 'aea382', 'aaaaaa': 'ababab', 'ffffff': 'ffffff',
  'aaaaff': 'a7bae2', 'aaff00': 'c9e89d', 'aaff55': 'c9eaa7', 'aaffaa': 'c7f0c8',
  'aaffff': 'c3f9f7', 'ff0000': 'e35462', 'ff0055': 'e25874', 'ff00aa': 'e16aa3',
  'ff00ff': 'de83dc', 'ff5500': 'e66e6b', 'ff5555': 'e6727c', 'ff55aa': 'e37fa7',
  'ff55ff': 'e194df', 'ffaa00': 'f1aa86', 'ffaa55': 'f1ad93', 'ffaaaa': 'efb5b8',
  'ffaaff': 'ecc3eb', 'ffff00': 'ffeeab', 'ffff55': 'fff1b5', 'ffffaa': 'fff6d3'
});
export const WATCH_COLORS = Object.freeze(WATCH_COLOR_LAYOUT.flat());
// Nearest watch color to any #RRGGBB: each channel to the nearest of 00, 55, AA, FF.
export function snapToWatch(hex) {
  const v = String(hex).replace('#', '').padEnd(6, '0').slice(0, 6);
  return '#' + [0, 2, 4].map(i => ['00', '55', 'aa', 'ff'][Math.round(parseInt(v.slice(i, i + 2), 16) / 85)] ?? '00').join('').toUpperCase();
}
// How a watch color looks on the watch (Pebble's sunlight sampling).
export const asOnWatch = hex => '#' + SUNLIGHT[snapToWatch(hex).slice(1).toLowerCase()].toUpperCase();
