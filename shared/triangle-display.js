// Seven electrodes: the six edges of a hexagon, plus its horizontal waist.
// Each electrode is a group of complete cells in ONE equilateral lattice.
// Source geometry stays equilateral; only the final pixel-center sampling is square.
export const SEGMENT_DIGITS=[63,6,91,79,102,109,125,7,127,111];
export const DISPLAY_STYLES=['span','triangles','broad','chamfer'];
// Wire codes. 3 was the retired LCD style, which the watch migrates to broad.
export const DISPLAY_CODES=Object.freeze({span:0,triangles:1,broad:2,chamfer:4});
export {INACTIVE_SEGMENTS} from './palettes.js';
export const SEGMENT_NAMES=['Top','Upper right','Lower right','Bottom','Lower left','Upper left','Waist'];
const SQRT3=Math.sqrt(3),EDGE=7,HEIGHT=EDGE*SQRT3/2,WIDTH=196,ROWS=6;
const STARTS=[0,49,105,154];
export const HEXAGON=[[10.5,0],[31.5,0],[42,3*HEIGHT],[31.5,6*HEIGHT],[10.5,6*HEIGHT],[0,3*HEIGHT]];
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function inside(vertices,p){const sides=vertices.map((a,i)=>cross(a,vertices[(i+1)%vertices.length],p));return sides.every(s=>s>=-1e-8)||sides.every(s=>s<=1e-8);}
function edgeDistance(p,a,b){return Math.abs(cross(a,b,p))/Math.hypot(b[0]-a[0],b[1]-a[1]);}
function inset(vertices,amount){
  const center=[0,1].map(k=>vertices.reduce((sum,v)=>sum+v[k],0)/3),scale=1-amount/(HEIGHT/3);
  return vertices.map(p=>p.map((v,k)=>center[k]+(v-center[k])*scale));
}
function cellRuns(vertices,group){
  const runs=[];
  for(let y=Math.floor(Math.min(...vertices.map(p=>p[1])));y<Math.ceil(Math.max(...vertices.map(p=>p[1])));y++){
    let start=-1,end=-1;
    for(let x=Math.floor(Math.min(...vertices.map(p=>p[0])));x<Math.ceil(Math.max(...vertices.map(p=>p[0])));x++)if(inside(vertices,[x+.5,y+.5])){if(start<0)start=x;end=x;}
    if(start>=0)runs.push({x:start,y,length:end-start+1,group});
  }
  return runs;
}
export function triangleGrid(){
  const cells=[],columns=WIDTH/(EDGE/2)-1;
  for(let row=0;row<ROWS;row++)for(let column=0;column<columns;column++){
    const x=column*EDGE/2,y=row*HEIGHT,down=!!((row+column)&1);
    const vertices=down?[[x,y],[x+EDGE,y],[x+EDGE/2,y+HEIGHT]]:[[x+EDGE/2,y],[x+EDGE,y+HEIGHT],[x,y+HEIGHT]];
    const center=[x+EDGE/2,y+HEIGHT*(down?1/3:2/3)];let group=0;
    const slot=STARTS.findIndex(start=>inside(HEXAGON,[center[0]-start,center[1]]));
    if(slot>=0){
      const local=[center[0]-STARTS[slot],center[1]],distances=HEXAGON.map((a,i)=>edgeDistance(local,a,HEXAGON[(i+1)%6]));
      const nearest=Math.min(...distances);
      // A one-cell border leaves large counters. The raised waist keeps
      // the lower counter open; every diagonal still follows lattice edges.
      if(nearest<HEIGHT-.01)group=1+slot*7+distances.indexOf(nearest);
      else if(row===2)group=1+slot*7+6;
    }else if(center[0]===98&&(row===1||row===4))group=29;
    const electrode=inset(vertices,.5);
    cells.push({row,column,vertices,electrode,center,group,runs:cellRuns(electrode,group)});
  }
  return {edge:EDGE,height:HEIGHT,rows:ROWS,columns,width:WIDTH,pixelHeight:Math.ceil(ROWS*HEIGHT),cells,runs:cells.flatMap(c=>c.runs)};
}
export const TRIANGLE_GRID=/* @__PURE__ */ triangleGrid();
export function groupLit(group,digits){
  if(group===29)return true;if(!group)return false;
  return !!(SEGMENT_DIGITS[digits[Math.floor((group-1)/7)]]&(1<<((group-1)%7)));
}
export function drawTriangleTime(ctx,time,x,y,ink,inactive,showInactive=true){
  const digits=time.replace(':','').split('').map(c=>c===' '?10:Number(c)); // 10: blank slot
  for(const run of TRIANGLE_GRID.runs){
    const lit=groupLit(run.group,digits);if(!lit&&!showInactive)continue;
    ctx.fillStyle=lit?ink:inactive;ctx.fillRect(x+2+run.x,y+run.y,run.length,1);
  }
}
export function encodeDisplay(settings){
  const style=DISPLAY_CODES[settings.clockDisplay];
  if(style===undefined||typeof settings.segmentGrid!=='boolean')throw new Error('Invalid clock display.');
  // Byte 2: bit 0 unlit segments, bit 1 no leading zero (clear by default).
  return new Uint8Array([1,style,+settings.segmentGrid|(settings.leadingZero===false?2:0),0]);
}
