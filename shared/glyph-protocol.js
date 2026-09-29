// The GLYPHS packet (docs/PROTOCOL.md): version 1, options, then each place's
// drawn glyph as five row bytes, bit 4 the leftmost pixel. Byte 1 bit 0 shows
// the place icons beside the names of the place times next to the clock.
// Places using a built-in glyph send blank rows; the watch reads a place's
// rows only when its icon is CUSTOM_MARKER.
import {CUSTOM_MARKER,MARKER_SIZE} from './markers.js';
export const GLYPHS_SIZE=2+3*MARKER_SIZE;
export function encodeGlyphs(settings){
  const out=new Uint8Array(GLYPHS_SIZE);
  out[0]=1;out[1]=settings.placeIconsBeside?1:0;
  settings.places.forEach((p,i)=>{if(p.icon!==CUSTOM_MARKER)return;p.glyph.forEach((row,y)=>{out[2+i*MARKER_SIZE+y]=parseInt(row.replaceAll('.','0').replaceAll('#','1'),2);});});
  return out;
}
