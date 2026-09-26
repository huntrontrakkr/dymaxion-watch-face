// Original narrow optical cut for the range labels and the hour axis.
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
// Narrow figures for the range labels up the chart's left edge: seven pixels
// tall like the hour labels but three wide (the 1 two), so the scale takes
// little of the chart's width.
export const RANGE_GLYPHS={
  '0':['.#.','#.#','#.#','#.#','#.#','#.#','.#.'],
  '1':['.#','##','.#','.#','.#','.#','.#'],
  '2':['.#.','#.#','..#','..#','.#.','#..','###'],
  '3':['##.','..#','..#','.#.','..#','..#','##.'],
  '4':['#.#','#.#','#.#','###','..#','..#','..#'],
  '5':['###','#..','#..','##.','..#','..#','##.'],
  '6':['.##','#..','#..','##.','#.#','#.#','.#.'],
  '7':['###','..#','..#','.#.','.#.','.#.','.#.'],
  '8':['.#.','#.#','#.#','.#.','#.#','#.#','.#.'],
  '9':['.#.','#.#','#.#','.##','..#','..#','##.'],
  '-':['..','..','..','##','..','..','..'],
  '.':['.','.','.','.','.','.','#'],
  '?':['##.','..#','..#','.#.','.#.','...','.#.']
};
// Glyphs before the times in a chart's header, five pixels square: a solid
// triangle up for high water and down for low, as tide tables mark them, and
// the same over a horizon for sunrise and sunset.
export const HEADER_GLYPHS={
  high:['.....','..#..','.###.','#####','.....'],low:['.....','#####','.###.','..#..','.....'],
  rise:['..#..','.###.','#####','.....','#####'],set:['#####','.###.','..#..','.....','#####']
};
export const HEADER_GLYPH_ORDER=['high','low','rise','set'];
// Range labels end two pixels short of the chart, one pixel from the edge.
export const RANGE_GAP=2;
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
const rangeGlyph=char=>RANGE_GLYPHS[char]||RANGE_GLYPHS['?'];
export function rangeTextWidth(text){return Math.max(0,[...String(text)].reduce((w,c)=>w+rangeGlyph(c)[0].length+1,0)-1);}
// Right-aligned so its last column sits RANGE_GAP pixels left of the chart.
export function drawRangeText(ctx,text,layout,y,color){
  text=String(text);let x=layout.left-RANGE_GAP-rangeTextWidth(text);
  ctx.fillStyle=color;
  for(const char of text){const rows=rangeGlyph(char);rows.forEach((row,ry)=>[...row].forEach((p,rx)=>{if(p==='#')ctx.fillRect(x+rx,y+ry,1,1);}));x+=rows[0].length+1;}
}
export function axisValue(value,decimal=false){
  const rounded=Math.trunc((value+(value<0?-5:5))/10);
  return decimal?`${rounded<0?'-':''}${Math.trunc(Math.abs(rounded)/10)}.${Math.abs(rounded)%10}`:String(rounded);
}
export function axisHour(hour,clock24){return clock24?String(hour).padStart(2,'0'):`${hour%12||12}${hour<12?'A':'P'}`;}
export function chartLayout(upper,lower,count,rangeLabels=true,hourWidth=12){
  const left=rangeLabels?1+Math.max(rangeTextWidth(upper),rangeTextWidth(lower))+RANGE_GAP:2;
  const span=count-1,width=CHART.right-left;
  // Leave room for the final label to shift inward at the display edge.
  const spacing=Math.max(20,Math.ceil(hourWidth*1.5)+2);
  const step=HOUR_STEPS.find(n=>Math.trunc(n*width/span)>=spacing)||24;
  return {...CHART,left,step,count};
}
export const chartX=(layout,index)=>layout.left+Math.trunc(index*(layout.right-layout.left)/(layout.count-1));
export const chartY=(value,lo,hi,top=CHART.top,bottom=CHART.bottom)=>bottom-Math.max(0,Math.min(bottom-top,Math.trunc((value-lo)*(bottom-top)/Math.max(1,hi-lo))));
export function chartHourLabels(layout,hours,clock24){
  const labels=[];
  for(let index=0;index<layout.count;index+=layout.step){
    const text=axisHour(hours[index],clock24),width=axisTextWidth(text),tick=chartX(layout,index);
    const x=Math.max(CHART.labelLeft,Math.min(CHART.labelRight-width,tick-Math.floor(width/2)));
    labels.push({index,tick,x,width,text});
  }
  return labels;
}
// High and low tides on the tide chart. Each event is {seconds after the
// chart's first hour, value in chart units, high}. A mark sits at the event's
// time and height; a high tide also gets its height in the narrow figures,
// above the peak when there is room, else just below it, else none (and none
// where it would run into the label before). The watch does the same
// (chart_axis.c).
export const TIDE_LABEL_GAP=2;
// Where a value label `width` wide goes for a point at (x,y): over it, two
// pixels clear, or under it, whichever is tried first and fits the plot;
// null when neither does. Centred on x, kept inside the chart.
export function labelSpot(layout,x,y,width,aboveFirst=true){
  const lx=Math.max(layout.left,Math.min(layout.right-width+1,x-Math.floor(width/2)));
  const above=y-7-TIDE_LABEL_GAP>=layout.top-1?y-7-TIDE_LABEL_GAP:null,below=y+TIDE_LABEL_GAP+7<=layout.bottom?y+TIDE_LABEL_GAP+1:null;
  const ly=aboveFirst?above??below:below??above;
  return ly===null?null:{x:lx,y:ly};
}
export function tideMarks(layout,lo,hi,events){
  const span=(layout.count-1)*3600,marks=[];let last=-99;
  for(const e of events){
    if(e.seconds<0||e.seconds>span)continue;
    const x=layout.left+Math.trunc(e.seconds*(layout.right-layout.left)/span),y=chartY(e.value,lo,hi,layout.top,layout.bottom);
    const mark={x,y,high:e.high,label:'',labelX:0,labelY:0};
    if(e.high){
      const text=axisValue(e.value,true),spot=labelSpot(layout,x,y,rangeTextWidth(text));
      if(spot&&spot.x>last+1){Object.assign(mark,{label:text,labelX:spot.x,labelY:spot.y});last=spot.x+rangeTextWidth(text)-1;}
    }
    marks.push(mark);
  }
  return marks;
}
// The warmest and coolest readings on the weather chart: the first of each,
// labelled over the peak and under the trough where there is room (else the
// other side). The low is left out if it would touch the high's label. The
// watch does the same (chart_extremes).
export function chartExtremes(layout,lo,hi,values){
  const out=[];let max=0,min=0;
  values.forEach((v,i)=>{if(v>values[max])max=i;if(v<values[min])min=i;});
  for(const [i,above] of min===max?[[max,true]]:[[max,true],[min,false]]){
    const text=axisValue(values[i]),width=rangeTextWidth(text),x=chartX(layout,i),y=chartY(values[i],lo,hi,layout.top,layout.bottom),spot=labelSpot(layout,x,y,width,above);
    if(!spot)continue;
    const a=out[0];if(a&&spot.x<=a.x+a.width&&a.x<=spot.x+width&&spot.y<=a.y+7&&a.y<=spot.y+7)continue;
    out.push({text,width,x:spot.x,y:spot.y});
  }
  return out;
}
export function drawNarrowText(ctx,text,x,y,color){
  ctx.fillStyle=color;
  for(const char of String(text)){const rows=rangeGlyph(char);rows.forEach((row,ry)=>[...row].forEach((p,rx)=>{if(p==='#')ctx.fillRect(x+rx,y+ry,1,1);}));x+=rows[0].length+1;}
}
