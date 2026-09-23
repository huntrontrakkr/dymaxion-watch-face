import {textWidth} from './type.js';
// Original narrow optical cut for the vertical range labels.
// Horizontal labels use the existing Draft Micro font at its native size.
export const AXIS_GLYPHS={
  '0':['.##.','#..#','#..#','#..#','#..#','#..#','.##.'],
  '1':['..#.','.##.','..#.','..#.','..#.','..#.','.###'],
  '2':['.##.','#..#','...#','..#.','.#..','#...','####'],
  '3':['###.','...#','...#','.##.','...#','...#','###.'],
  '4':['..#.','.##.','#.#.','#.#.','####','..#.','..#.'],
  '5':['####','#...','#...','###.','...#','#..#','.##.'],
  '6':['..##','.#..','#...','###.','#..#','#..#','.##.'],
  '7':['####','...#','..#.','..#.','.#..','.#..','.#..'],
  '8':['.##.','#..#','#..#','.##.','#..#','#..#','.##.'],
  '9':['.##.','#..#','#..#','.###','...#','..#.','##..'],
  '-':['...','...','...','###','...','...','...'],
  '.':['.','.','.','.','.','.','#'],
  'A':['...','...','.#.','#.#','###','#.#','#.#'],
  'P':['...','...','##.','#.#','##.','#..','#..'],
  '?':['.##.','#..#','...#','..#.','..#.','....','..#.']
};
export const CHART={top:193,bottom:214,right:197,daylight:192,axis:215,labelBaseline:225,labelLeft:1,labelRight:199};
export const HOUR_STEPS=[1,2,3,4,6,8,12,24];
const glyph=char=>AXIS_GLYPHS[char]||AXIS_GLYPHS['?'];
export function axisTextWidth(text){return Math.max(0,[...String(text)].reduce((w,c)=>w+glyph(c)[0].length+1,0)-1);}
export function drawAxisText(ctx,text,x,y,color,align='left'){
  text=String(text);const width=axisTextWidth(text);
  x=Math.floor(x-(align==='right'?width:align==='center'?width/2:0));
  ctx.fillStyle=color;
  for(const char of text){const rows=glyph(char);rows.forEach((row,ry)=>[...row].forEach((p,rx)=>{if(p==='#')ctx.fillRect(x+rx,y+ry,1,1);}));x+=rows[0].length+1;}
}
export function axisValue(value,decimal=false){
  const rounded=Math.trunc((value+(value<0?-5:5))/10);
  return decimal?`${rounded<0?'-':''}${Math.trunc(Math.abs(rounded)/10)}.${Math.abs(rounded)%10}`:String(rounded);
}
export function axisHour(hour,clock24){return clock24?String(hour).padStart(2,'0'):`${hour%12||12}${hour<12?'A':'P'}`;}
export function chartLayout(upper,lower,count,rangeLabels=true,hourWidth=12){
  const left=rangeLabels?2+Math.max(axisTextWidth(upper),axisTextWidth(lower))+3:2;
  const span=count-1,width=CHART.right-left;
  // Leave room for the final label to shift inward at the display edge.
  const spacing=Math.max(20,Math.ceil(hourWidth*1.5)+2);
  const step=HOUR_STEPS.find(n=>Math.trunc(n*width/span)>=spacing)||24;
  return {...CHART,left,step,count};
}
export const chartX=(layout,index)=>layout.left+Math.trunc(index*(layout.right-layout.left)/(layout.count-1));
export const chartY=(value,lo,hi)=>CHART.bottom-Math.max(0,Math.min(CHART.bottom-CHART.top,Math.trunc((value-lo)*(CHART.bottom-CHART.top)/Math.max(1,hi-lo))));
export function chartHourLabels(layout,hours,clock24,font){
  const labels=[];
  for(let index=0;index<layout.count;index+=layout.step){
    const text=axisHour(hours[index],clock24),width=textWidth(font,text),tick=chartX(layout,index);
    const x=Math.max(CHART.labelLeft,Math.min(CHART.labelRight-width,tick-Math.floor(width/2)));
    labels.push({index,tick,x,width,text});
  }
  return labels;
}
