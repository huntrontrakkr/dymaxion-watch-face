// The Dymaxion nameplate: the original pixel script (tools/generate-wordmark.py),
// shown optionally between the clock and the map, like the nameplate on an
// appliance. The watch mirrors this in watchface/src/c/nameplate.c.
import rows from '../assets/type/wordmark.json' with {type: 'json'};
import {clockTopForVisible} from './settings.js';
export const NAMEPLATE_ROWS = rows, NAMEPLATE_WIDTH = rows[0].length, NAMEPLATE_HEIGHT = rows.length;
const NET_TOP = 6, NET_BOTTOM = 97, STATUS_BOTTOM = 18, PANEL_TOP = 184, CLOCK_INK = 38, STACKED_INK = 84;
// Where the nameplate sits on screen (null when there is no room) and where the
// clock then goes. Clock above the map: centred, its last row a pixel above the
// net's top edge, below the status line. Clock below the map: two rows under
// the net's bottom edge, the clock moved down to leave two rows under it, as
// long as the clock's figures still clear the bottom panel by six pixels.
// Either way the clock's figures (after Quick View moves them) keep a pixel
// clear, or the nameplate is left out and the clock stays where it was.
export function nameplateLayout({mapY, timeY, height, stacked = false, visible = 228}) {
  const ink = stacked ? STACKED_INK : CLOCK_INK, x = (200 - NAMEPLATE_WIDTH) >> 1;
  const none = {plate: null, clockTop: clockTopForVisible(timeY, height, visible)};
  let y, shift = 0;
  if (timeY > mapY) {
    y = mapY + NET_BOTTOM + 3;
    shift = Math.max(0, y + NAMEPLATE_HEIGHT - timeY);
    if (timeY + shift + ink > PANEL_TOP - 6) return none;
  } else {
    y = mapY + NET_TOP - 1 - NAMEPLATE_HEIGHT;
    if (y < STATUS_BOTTOM) return none;
  }
  const clockTop = clockTopForVisible(timeY + shift, height, visible);
  if (clockTop + 2 < y + NAMEPLATE_HEIGHT + 1 && clockTop + ink > y - 1) return none;
  return {plate: {x, y}, clockTop};
}
// The area map times keep clear of, in map coordinates.
export const nameplateObstacle = ({x, y}, mapX, mapY) => ({x0: x - 1 - mapX, y0: y - 1 - mapY, x1: x + NAMEPLATE_WIDTH - mapX, y1: y + NAMEPLATE_HEIGHT - mapY});
