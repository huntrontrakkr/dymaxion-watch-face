// Numeral styles and the DISPLAY packet. Codes 5-8 are Pebble system fonts,
// 9 is Leco Delta (shared/system-clock.js).
export const DISPLAY_STYLES=['span','broad','chamfer','leco','bitham-bold','bitham-light','bitham-medium','leco-delta'];
// Wire codes. 1 was the retired triangular seven-segment style, which the watch
// migrates to Chamfer; 3 was the retired LCD style, migrated to broad.
export const DISPLAY_CODES=Object.freeze({span:0,broad:2,chamfer:4,leco:5,'bitham-bold':6,'bitham-light':7,'bitham-medium':8,'leco-delta':9});
import {MAP_BACKGROUNDS} from './map-background.js';
import {ZONE_TIMES,ZONE_POSITIONS} from './zone-column.js';
// Version 2: [2, style, options, map background]. Byte 2: bit 1 no leading zero
// (clear by default), bits 2-3 index ZONE_TIMES, bits 4-5 ZONE_POSITIONS, bit 6
// lets map times turn 90°, bit 7 shows the Dymaxion nameplate; bit 0 is retired. Byte 3
// indexes MAP_BACKGROUNDS.
export function encodeDisplay(settings){
  const style=DISPLAY_CODES[settings.clockDisplay],background=MAP_BACKGROUNDS.indexOf(settings.mapBackground??'none'),zones=ZONE_TIMES.indexOf(settings.zoneTimes??'panel');
  if(style===undefined)throw new Error('Invalid clock display.');
  if(background<0)throw new Error('Invalid map background.');
  if(zones<0)throw new Error('Invalid place-time placement.');
  const position=ZONE_POSITIONS.indexOf(settings.zonePosition??'left');
  if(position<0)throw new Error('Invalid place-time position.');
  return new Uint8Array([2,style,(settings.leadingZero===false?2:0)|zones<<2|position<<4|(settings.mapTimesTurn?64:0)|(settings.nameplate?128:0),background]);
}
