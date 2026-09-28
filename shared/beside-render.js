// Drawing for the icosahedron beside the clock and the place times between the
// clock and the map, shared by the workshop and the phone preview. Layout comes
// from shared/clock-art.js and shared/zone-column.js; the watch draws the same.
import {drawBitmapText,textWidth} from './type.js';
import {drawPixelRows} from './pixels.js';
import {drawMarkerPixels} from './markers.js';
import {ICOSAHEDRON_ROWS,clockArtSpot} from './clock-art.js';
import {ZONE_STRIP,zoneStrip,zoneStripEntry,tallPixels} from './zone-column.js';
export function drawClockArt(ctx,side,tx,ty,color){const {x,y}=clockArtSpot(side);drawPixelRows(ctx,ICOSAHEDRON_ROWS,tx+x,ty+y,color);}
// places: [{icon,label,hour,minute,delta,color}] for the enabled places.
export function drawZoneStrip(ctx,top,places,{font,clock24,ink,accent,bg,compact=false}){
  ctx.fillStyle=bg;ctx.fillRect(0,top,ZONE_STRIP.width,ZONE_STRIP.height);
  const items=zoneStrip(places.map(p=>zoneStripEntry({...p,clock24})),t=>textWidth(font,t),compact),base=top+(compact?ZONE_STRIP.compactBaseline:ZONE_STRIP.baseline);
  items.forEach((item,i)=>{
    const p=places[i];drawMarkerPixels(ctx,p.icon,item.glyphX,top+(compact?ZONE_STRIP.compactGlyphY:ZONE_STRIP.glyphY),p.color);
    if(item.label)drawBitmapText(ctx,font,item.label,item.labelX,base,p.color);
    if(compact)drawBitmapText(ctx,font,item.time,item.timeX,base,ink);
    else{ctx.fillStyle=ink;for(const [x,y] of tallPixels(item.time))ctx.fillRect(item.timeX+x,base+y,1,1);}
    if(item.suffix)drawBitmapText(ctx,font,item.suffix,item.suffixX,base,accent);
    if(item.day)drawBitmapText(ctx,font,item.day,item.dayX,base,accent);
  });
  return items;
}
