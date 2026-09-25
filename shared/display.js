// Numeral styles and the DISPLAY packet. Codes 5-8 are Pebble system fonts,
// 9 is Leco Delta (shared/system-clock.js).
export const DISPLAY_STYLES=['span','broad','chamfer','leco','bitham-bold','bitham-light','bitham-medium','leco-delta'];
// Wire codes. 1 was the retired triangular seven-segment style, which the watch
// migrates to Chamfer; 3 was the retired LCD style, migrated to broad.
export const DISPLAY_CODES=Object.freeze({span:0,broad:2,chamfer:4,leco:5,'bitham-bold':6,'bitham-light':7,'bitham-medium':8,'leco-delta':9});
import {MAP_BACKGROUNDS} from './map-background.js';
import {ZONE_TIMES,ZONE_POSITIONS} from './zone-column.js';
import {encodePower} from './power.js';
// Wire order for the map time size: medium first, so older packets (0) read as medium.
export const MAP_TIME_SIZE_CODES=['medium','small','large','xlarge','wide'];
// Version 3: [3, style, options, map background, power bits, night start,
// night end, low battery]. Byte 2: bit 1 no leading zero (clear by default), bits 2-3
// index ZONE_TIMES, bits 4-5 ZONE_POSITIONS, bit 6 lets map times turn 90°, bit
// 7 shows the Dymaxion nameplate; bit 0 is retired. Byte 3: bits 0-1 index
// MAP_BACKGROUNDS, bits 2-4 the map time size (0 medium 3×6, 1 small 3×5,
// 2 large 3×7, 3 extra large 3×8, 4 wide 4×8; older packets read as medium),
// bit 5 tall place times beside the clock, bit 6 hides the place icons in the
// time-zone drawer (clear in older packets, so icons show). Bytes 4-6 are power and motion (shared/power.js). The watch
// still loads 4-byte version 1 and 2 packets, with default power and motion.
export function encodeDisplay(settings){
  const style=DISPLAY_CODES[settings.clockDisplay],background=MAP_BACKGROUNDS.indexOf(settings.mapBackground??'none'),zones=ZONE_TIMES.indexOf(settings.zoneTimes??'panel');
  if(style===undefined)throw new Error('Invalid clock display.');
  if(background<0)throw new Error('Invalid map background.');
  if(zones<0)throw new Error('Invalid place-time placement.');
  const position=ZONE_POSITIONS.indexOf(settings.zonePosition??'left');
  if(position<0)throw new Error('Invalid place-time position.');
  return new Uint8Array([3,style,(settings.leadingZero===false?2:0)|zones<<2|position<<4|(settings.mapTimesTurn?64:0)|(settings.nameplate?128:0),background|MAP_TIME_SIZE_CODES.indexOf(settings.mapTimeSize??'medium')<<2|(settings.zoneTimesTall?32:0)|(settings.placeIcons===false?64:0),...encodePower(settings.power)]);
}
