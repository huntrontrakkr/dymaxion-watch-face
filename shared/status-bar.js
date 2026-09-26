// The right end of the top bar: Quiet Time beside the Bluetooth rune, and the
// battery. The watch draws the same pixels (main.c draw_status_section).
import {drawBitmapText,textWidth} from './type.js';
import {drawPixelRows} from './pixels.js';
import {QUIET_ROWS} from './status-glyphs.js';
import {dimColor} from './panel-render.js';

export const QUIET_X=157,QUIET_Y=1;
// The battery gauge: a battery outline around the percentage, filled from the
// left as far as the charge, one step from the ground toward the ink. The
// percentage moves one pixel in to make room for the cap. `width` is the
// percentage's text width.
export function batteryGauge(width,percent){
  const left=192-width,inner=193-left;
  return {text:194,left,right:194,top:3,bottom:13,fill:Math.trunc((inner*Math.max(0,Math.min(100,percent))+50)/100)};
}
export function drawBatteryStatus(ctx,font,percent,{gauge,quiet,ink,bg}){
  if(quiet)drawPixelRows(ctx,QUIET_ROWS,QUIET_X,QUIET_Y,ink);
  const text=percent+'%';
  if(!gauge){drawBitmapText(ctx,font,text,195,12,ink,'right');return;}
  const g=batteryGauge(textWidth(font,text),percent);
  ctx.fillStyle=dimColor(bg,ink);ctx.fillRect(g.left+1,g.top+1,g.fill,g.bottom-g.top-1);
  ctx.fillStyle=ink;
  ctx.fillRect(g.left,g.top,g.right-g.left+1,1);ctx.fillRect(g.left,g.bottom,g.right-g.left+1,1);
  ctx.fillRect(g.left,g.top,1,g.bottom-g.top+1);ctx.fillRect(g.right,g.top,1,g.bottom-g.top+1);
  ctx.fillRect(g.right+1,6,2,5);
  drawBitmapText(ctx,font,text,g.text,12,ink,'right');
}
