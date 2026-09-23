import {paletteFor} from './palette-settings.js';
import {pebbleColor} from './settings.js';
// Separate from the stable layout packet; only the active colors go to the watch.
export const PALETTE_SIZE=18;
export function encodePalette(settings){
  const p=paletteFor(settings);
  return new Uint8Array([1,settings.theme,+(settings.customPalette!=null),+!!p.zoneGlyphs,
    ...[p.bg,p.ocean,p.land,p.nightOcean,p.nightLand,p.edge,p.ink,p.accent,...p.marks,p.moonShadow,p.inactive].map(pebbleColor),0]);
}
