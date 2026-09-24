import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNetFuller,makeMap} from '../shared/map.js';
import {triangleGridMask,netRows,BACKGROUND_BITS,MAP_BACKGROUNDS} from '../shared/map-background.js';
const m=makeMap(),rows=netRows(m),bytes=readFileSync('watchface/resources/maps/map-0.bin');
const masks={points:triangleGridMask(m,'points',rows),lines:triangleGridMask(m,'lines',rows)};
const pixelOf=point=>{let [x,y]=m.toPixel(point).map(v=>Math.floor(v+1e-7));return [x,Math.min(rows[1],Math.max(rows[0],y))];};
const on=(mask,[x,y])=>mask[y*m.width+x]===1;
test('both backgrounds span the strip edge to edge, from the top of the net to its bottom',()=>{
  assert.deepEqual(MAP_BACKGROUNDS,['none','points','lines']);assert.deepEqual(BACKGROUND_BITS,{none:0,points:8,lines:16});
  const [top,bottom]=rows;assert(top>0&&bottom<m.height-1,'the net leaves a margin above and below');
  for(const mask of Object.values(masks)){
    const lit=[...mask.keys()].filter(i=>mask[i]).map(i=>[i%m.width,Math.floor(i/m.width)]);
    assert.equal(Math.min(...lit.map(p=>p[1])),top,'reaches the top of the net and no higher');
    assert.equal(Math.max(...lit.map(p=>p[1])),bottom,'reaches the bottom of the net and no lower');
    assert(Math.min(...lit.map(p=>p[0]))<=4&&Math.max(...lit.map(p=>p[0]))>=m.width-5,'edge to edge');
  }
});
test('points sit where the split triangles meet; lines dot every edge between them',()=>{
  // Net corners and edge midpoints are lattice vertices of the split grid.
  for(const t of buildNetFuller())for(let a=0;a<3;a++){
    const p=t.p[a],q=t.p[(a+1)%3];
    for(const point of [p,[(p[0]+q[0])/2,(p[1]+q[1])/2]]){
      const pixel=pixelOf(point),y=m.toPixel(point)[1];
      if(pixel[0]<0||pixel[0]>=m.width||y<rows[0]-.5||y>rows[1]+1.5)continue;
      assert(on(masks.points,pixel)&&on(masks.lines,pixel),`vertex ${point}`);
    }
  }
  // Points are isolated single pixels, about half a face apart; lines add the edges.
  const count=mask=>mask.reduce((s,v)=>s+v,0);
  for(let i=0;i<masks.points.length;i++)if(masks.points[i]){
    assert(masks.lines[i],'every point is on a line');
    const x=i%m.width,y=Math.floor(i/m.width);
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if((dx||dy)&&x+dx>=0&&x+dx<m.width&&y+dy>=0&&y+dy<m.height)assert(!masks.points[(y+dy)*m.width+x+dx]);
  }
  assert(count(masks.lines)>5*count(masks.points)&&count(masks.lines)<m.width*m.height/6);
});
test('the baked map flags each background only where the net leaves the strip empty',()=>{
  for(let i=0;i<bytes.length/4;i++){
    const flags=bytes[i*4+3],empty=!(flags&3);
    for(const [id,mask] of Object.entries(masks))assert.equal(!!(flags&BACKGROUND_BITS[id]),empty&&!!mask[i]);
    if(!empty)assert.equal(flags&(BACKGROUND_BITS.points|BACKGROUND_BITS.lines),0);
  }
  assert.deepEqual(readFileSync('designer/public/maps/map-0.bin'),bytes);
});
