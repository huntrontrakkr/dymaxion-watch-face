// The right end of the top bar: Quiet Time beside the Bluetooth rune, and the
// battery; and the step line under the bar. The watch draws the same pixels
// (main.c draw_status_section).
import {drawBitmapText,textWidth} from './type.js';
import {drawPixelRows} from './pixels.js';
import {QUIET_ROWS,CHARGE_ROWS} from './status-glyphs.js';
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
// At or below the low-battery level (where animations stop) the battery
// takes the accent color; while charging a bolt stands in for the % sign.
export function drawBatteryStatus(ctx,font,percent,{gauge,quiet,charging=false,low=false,ink,bg,accent}){
  if(quiet)drawPixelRows(ctx,QUIET_ROWS,QUIET_X,QUIET_Y,ink);
  const text=percent+'%',color=low?accent:ink;let right=195;
  if(gauge){
    const g=batteryGauge(textWidth(font,text),percent);right=g.text;
    ctx.fillStyle=dimColor(bg,color);ctx.fillRect(g.left+1,g.top+1,g.fill,g.bottom-g.top-1);
    ctx.fillStyle=color;
    ctx.fillRect(g.left,g.top,g.right-g.left+1,1);ctx.fillRect(g.left,g.bottom,g.right-g.left+1,1);
    ctx.fillRect(g.left,g.top,1,g.bottom-g.top+1);ctx.fillRect(g.right,g.top,1,g.bottom-g.top+1);
    ctx.fillRect(g.right+1,6,2,5);
  }
  if(!charging){drawBitmapText(ctx,font,text,right,12,color,'right');return;}
  const sign=textWidth(font,'%');
  drawBitmapText(ctx,font,String(percent),right-sign,12,color,'right');drawPixelRows(ctx,CHARGE_ROWS,right-sign,5,color);
}
// Steps today against a typical day's total, as a line under the top bar
// that reaches the right edge at the typical total. Without a typical day,
// 10,000 steps.
export const STEP_LINE_Y=17;
export const stepLineWidth=(steps,typical)=>Math.min(200,Math.trunc(steps*200/(typical>0?typical:10000)));
