// Numeral styles and the DISPLAY packet. Codes 5-8 are Pebble system fonts,
// 9 is Leco Delta (shared/system-clock.js).
export const DISPLAY_STYLES=['span','broad','chamfer','leco','bitham-bold','bitham-light','bitham-medium','leco-delta'];
// Wire codes. 1 was the retired triangular seven-segment style, which the watch
// migrates to Chamfer; 3 was the retired LCD style, migrated to broad.
export const DISPLAY_CODES=Object.freeze({span:0,broad:2,chamfer:4,leco:5,'bitham-bold':6,'bitham-light':7,'bitham-medium':8,'leco-delta':9});
export function encodeDisplay(settings){
  const style=DISPLAY_CODES[settings.clockDisplay];
  if(style===undefined)throw new Error('Invalid clock display.');
  // Byte 2: bit 1 no leading zero (clear by default); bit 0 is retired.
  return new Uint8Array([1,style,settings.leadingZero===false?2:0,0]);
}
