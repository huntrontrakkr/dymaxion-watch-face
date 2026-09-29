// Projects a direction (the Sun's, the Moon's) onto the map: the face whose
// centre is nearest, the placement holding that part of it (split faces are
// placed twice), then the point's gnomonic barycentrics on that placement's
// corners. The same steps as lonLatToNet (map.js), on the integer net that the
// watch uses too (watchface/src/c/map_net.c), so both land on the same pixel.
import {NET_VERTICES,NET_FACES,NET_PLACEMENTS,NET_V_SCALE,NET_PX_SCALE} from './map-net-data.js';
import {MAP_SIZE} from './map.js';
const V=NET_VERTICES.map(v=>v.map(c=>c/NET_V_SCALE));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// The LCD sixth of a face (map.js lcdOf), from the point's closeness to each corner.
function lcdOf(a,b,c){
  if(a>=b&&b>=c)return 1;if(a>=c&&c>=b)return 6;
  if(b>=a&&a>=c)return 2;if(b>=c&&c>=a)return 3;
  if(c>=a&&a>=b)return 5;return 4;
}
// The map pixel [x,y] (before any rotation) that holds direction D.
export function projectToMap(D){
  let face=0,score=-Infinity;
  NET_FACES.forEach((f,i)=>{const s=dot(D,V[f[0]])+dot(D,V[f[1]])+dot(D,V[f[2]]);if(s>score){score=s;face=i;}});
  const [A,B,C]=NET_FACES[face].map(i=>V[i]),lcd=lcdOf(dot(D,A),dot(D,B),dot(D,C));
  const p=NET_PLACEMENTS.find(p=>p.face===face&&(!p.lcd||(p.lcd>>(lcd-1))&1));
  const v0=sub(B,A),v1=sub(C,A),n=cross(v0,v1),t=dot(n,A)/dot(n,D),v2=sub(D.map(v=>v*t),A);
  const d00=dot(v0,v0),d01=dot(v0,v1),d11=dot(v1,v1),d20=dot(v2,v0),d21=dot(v2,v1),den=d00*d11-d01*d01;
  const u=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den,s=1-u-w;
  return [0,1].map(i=>{
    const at=(s*p.corners[0][i]+u*p.corners[1][i]+w*p.corners[2][i])/NET_PX_SCALE;
    return Math.max(0,Math.min(MAP_SIZE[i]-1,Math.floor(at)));
  });
}
