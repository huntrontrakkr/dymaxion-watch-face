// The Dymaxion nameplate: the original pixel script (tools/generate-wordmark.py),
// shown optionally between the clock and the map, like the nameplate on an
// appliance. The watch mirrors this in watchface/src/c/nameplate.c.
import rows from '../assets/type/wordmark.json' with {type: 'json'};
export const NAMEPLATE_ROWS = rows, NAMEPLATE_WIDTH = rows[0].length, NAMEPLATE_HEIGHT = rows.length;
const NET_TOP = 6, STATUS_BOTTOM = 18, CLOCK_INK = 38, STACKED_INK = 84;
// Where it sits on screen, or null when there is no room: centred, its last
// row a pixel above the map net's top edge, clear of the status line and of
// the clock's figures by at least a pixel.
export function nameplateSpot({mapY, clockTop, stacked = false}) {
  const x = (200 - NAMEPLATE_WIDTH) >> 1, y = mapY + NET_TOP - 1 - NAMEPLATE_HEIGHT;
  if (y < STATUS_BOTTOM) return null;
  const clockBottom = clockTop + (stacked ? STACKED_INK : CLOCK_INK);
  if (clockTop < y + NAMEPLATE_HEIGHT + 1 && clockBottom > y - 1) return null;
  return {x, y};
}
// The area map times keep clear of, in map coordinates.
export const nameplateObstacle = ({x, y}, mapX, mapY) => ({x0: x - 1 - mapX, y0: y - 1 - mapY, x1: x + NAMEPLATE_WIDTH - mapX, y1: y + NAMEPLATE_HEIGHT - mapY});
