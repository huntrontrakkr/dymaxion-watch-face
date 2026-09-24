import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNetFuller,makeMap} from '../shared/map.js';
import {triangleGridMask,foldTabMask,netFreeEdges,netRows,BACKGROUND_BITS,MAP_BACKGROUNDS} from '../shared/map-background.js';
const m=makeMap(),rows=netRows(m),bytes=readFileSync('watchface/resources/maps/map-0.bin');
const masks={points:triangleGridMask(m,'points',rows),lines:triangleGridMask(m,'lines',rows),'fine-points':triangleGridMask(m,'fine-points',rows),folds:foldTabMask(m,rows)};
const pixelOf=point=>{let [x,y]=m.toPixel(point).map(v=>Math.floor(v+1e-7));return [x,Math.min(rows[1],Math.max(rows[0],y))];};
const on=(mask,[x,y])=>mask[y*m.width+x]===1;
test('both backgrounds span the strip edge to edge, from the top of the net to its bottom',()=>{
  assert.deepEqual(MAP_BACKGROUNDS,['none','points','lines','fine-points','folds']);assert.deepEqual(BACKGROUND_BITS,{none:0,points:8,lines:16,'fine-points':32,folds:64});
  const [top,bottom]=rows;assert(top>0&&bottom<m.height-1,'the net leaves a margin above and below');
  for(const mask of [masks.points,masks.lines,masks['fine-points']]){
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
      assert(on(masks.points,pixel)&&on(masks.lines,pixel)&&on(masks['fine-points'],pixel),`vertex ${point}`);
    }
  }
  // Points are isolated single pixels, about half a face apart; lines add the edges.
  const count=mask=>mask.reduce((s,v)=>s+v,0);
  for(let i=0;i<masks.points.length;i++)if(masks.points[i]){
    assert(masks.lines[i]&&masks['fine-points'][i],'every point is on a line and among the fine points');
    const x=i%m.width,y=Math.floor(i/m.width);
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if((dx||dy)&&x+dx>=0&&x+dx<m.width&&y+dy>=0&&y+dy<m.height)assert(!masks.points[(y+dy)*m.width+x+dx]);
  }
  assert(count(masks.lines)>5*count(masks.points)&&count(masks.lines)<m.width*m.height/6);
  // Splitting once more quadruples the vertices; fine points stay isolated too.
  const ratio=count(masks['fine-points'])/count(masks.points);assert(ratio>3&&ratio<5,`fine/points ${ratio}`);
  for(let i=0;i<masks['fine-points'].length;i++)if(masks['fine-points'][i]){
    const x=i%m.width,y=Math.floor(i/m.width);
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if((dx||dy)&&x+dx>=0&&x+dx<m.width&&y+dy>=0&&y+dy<m.height)assert(!masks['fine-points'][(y+dy)*m.width+x+dx]);
  }
});
test('fold tabs: one dashed tab per glued pair of free edges, facing the open ground',()=>{
  const edges=netFreeEdges(),tabs=edges.filter(e=>e.tab);
  assert.equal(edges.length,26,'the outline of the net, split faces included');assert.equal(tabs.length,13,'one tab per glued pair');
  const k3=v=>v.map(x=>x.toFixed(4)).join(','),pairs=new Map();
  for(const e of edges){const k=[k3(e.P),k3(e.Q)].sort().join('|');pairs.set(k,(pairs.get(k)??0)+1);}
  assert([...pairs.values()].every(n=>n===2),'every free edge glues to exactly one other');
  const mask=masks.folds,lit=[...mask.keys()].filter(i=>mask[i]);
  assert(lit.length>150&&lit.length<400,`${lit.length} tab pixels`);
  // Each tab pixel sits within a tab height of the net's outline, in the strip.
  for(const i of lit){const x=i%m.width,y=Math.floor(i/m.width);assert(y>=rows[0]&&y<=rows[1]);
    let near=false;for(let dy=-6;dy<=6&&!near;dy++)for(let dx=-6;dx<=6&&!near;dx++)if(m.inverse(x+dx+.5,y+dy+.5))near=true;assert(near,`tab pixel ${x},${y} is near the net`);}
  // Dashed: well under the pixels a solid outline of every tab would need.
  const solid=foldTabMask(m,rows,{height:4,inset:4,offset:.8,dash:1e9}).reduce((s,v)=>s+v,0);
  assert(lit.length<.75*solid,`dashed ${lit.length} vs solid ${solid}`);
});
test('the baked map flags each background only where the net leaves the strip empty',()=>{
  for(let i=0;i<bytes.length/4;i++){
    const flags=bytes[i*4+3],empty=!(flags&3);
    for(const [id,mask] of Object.entries(masks))assert.equal(!!(flags&BACKGROUND_BITS[id]),empty&&!!mask[i]);
    if(!empty)assert.equal(flags&~7,0,'map pixels carry no background bits');
  }
  assert.deepEqual(readFileSync('designer/public/maps/map-0.bin'),bytes);
});
