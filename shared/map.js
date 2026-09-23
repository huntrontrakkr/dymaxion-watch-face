// Extracted from the user's original face designer (September 2026).
// Preserve Gray's orientation, the 22 placements, LCD split selection and
// gnomonic barycentric mapping. This is not the exact Gray-Fuller transform.
export const V = [[.420152,.078145,.904083],[.995005,-.091348,.040147],[.518837,.835420,.181332],[-.414682,.655962,.630676],[-.515456,-.381717,.767201],[.355781,-.843580,.402234],[.414682,-.655962,-.630676],[.515456,.381717,-.767201],[-.355781,.843580,-.402234],[-.995009,.091348,-.040147],[-.518837,-.835420,-.181332],[-.420152,-.078145,-.904083]].map(v => v.map(x => x / Math.hypot(...v)));
export const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub = (a,b) => a.map((v,i) => v-b[i]);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const S3 = Math.sqrt(3);
export const GF = [[1,3,2],[1,4,3],[1,5,4],[1,6,5],[1,2,6],[2,3,8],[3,9,8],[3,4,9],[4,10,9],[4,5,10],[5,11,10],[5,6,11],[6,7,11],[2,7,6],[2,8,7],[8,9,12],[9,10,12],[10,11,12],[11,7,12],[8,12,7]].map(f => f.map(v => v-1));
export const GPLACE = [
  [1,240,2,7/(2*S3),null],[2,300,2,5/(2*S3),null],[3,0,2.5,2/S3,null],
  [4,60,3,5/(2*S3),null],[5,180,2.5,4*S3/3,null],[6,300,1.5,4*S3/3,null],
  [7,300,1,5/(2*S3),null],[8,0,1.5,2/S3,null],
  [9,300,1.5,1/S3,[3,4,5,6]],[9,0,2,1/(2*S3),[1,2]],
  [10,60,2.5,1/S3,null],[11,60,3.5,1/S3,null],[12,120,3.5,2/S3,null],
  [13,60,4,5/(2*S3),null],[14,0,4,7/(2*S3),null],[15,0,5,7/(2*S3),null],
  [16,60,.5,1/S3,[1,2,3]],[16,0,5.5,2/S3,[4,5,6]],
  [17,0,1,1/(2*S3),null],[18,120,4,1/(2*S3),null],
  [19,120,4.5,2/S3,null],[20,300,5,5/(2*S3),null]
];
export function lcdOf(a,b,c) {
  if(a>=b&&b>=c)return 1; if(a>=c&&c>=b)return 6;
  if(b>=a&&a>=c)return 2; if(b>=c&&c>=a)return 3;
  if(c>=a&&a>=b)return 5; return 4;
}
export function buildNetFuller() {
  const template = [[0,1/S3],[.5,-1/(2*S3)],[-.5,-1/(2*S3)]];
  return GPLACE.map(([tri,rot,tx,ty,lcd]) => {
    const a=rot*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
    return {f:GF[tri-1],tri,p:template.map(([x,y]) => [x*ca-y*sa+tx,x*sa+y*ca+ty]),lcd};
  });
}
export function netToDir(T,x,y,eps=0) {
  for(const t of T) {
    const p=t.p, d=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[2][0]-p[0][0])*(p[1][1]-p[0][1]);
    const u=((x-p[0][0])*(p[2][1]-p[0][1])-(p[2][0]-p[0][0])*(y-p[0][1]))/d;
    const w=((p[1][0]-p[0][0])*(y-p[0][1])-(x-p[0][0])*(p[1][1]-p[0][1]))/d, s=1-u-w;
    if(u < -1e-9 || w < -1e-9 || s < -1e-9 || (t.lcd&&!t.lcd.includes(lcdOf(s,u,w))))continue;
    const [A,B,C]=t.f.map(i=>V[i]);
    const P=A.map((v,i)=>s*v+u*B[i]+w*C[i]), n=Math.hypot(...P);
    return [P.map(v=>v/n),Math.min(s,u,w)*S3/2<eps];
  }
  return null;
}
export function direction(lat,lon) {
  const la=lat*Math.PI/180,lo=lon*Math.PI/180;
  return [Math.cos(la)*Math.cos(lo),Math.cos(la)*Math.sin(lo),Math.sin(la)];
}
export function lonLatToNet(T,lat,lon) {
  const D=direction(lat,lon);
  let best=null,score=-2;
  for(const t of T) {
    const [A,B,C]=t.f.map(i=>V[i]), ct=A.map((v,i)=>(v+B[i]+C[i])/3);
    const d=dot(D,ct)/Math.hypot(...ct);
    if(d>score){score=d;best=t.f;}
  }
  const ds=best.map(v=>-Math.hypot(...sub(D,V[v]))), lcd=lcdOf(...ds);
  const ent=T.find(t=>t.f===best&&(!t.lcd||t.lcd.includes(lcd)));
  const [A,B,C]=ent.f.map(i=>V[i]), n=cross(sub(B,A),sub(C,A)), t=dot(n,A)/dot(n,D);
  const v0=sub(B,A),v1=sub(C,A),v2=sub(D.map(v=>v*t),A);
  const d00=dot(v0,v0),d01=dot(v0,v1),d11=dot(v1,v1),d20=dot(v2,v0),d21=dot(v2,v1);
  const den=d00*d11-d01*d01,u=(d11*d20-d01*d21)/den,w=(d00*d21-d01*d20)/den;
  return [0,1].map(i=>(1-u-w)*ent.p[0][i]+u*ent.p[1][i]+w*ent.p[2][i]);
}
export const MAP_SIZE = [200,104];
function visibleVertices(T) {
  // A split placement contains only its selected LCD sixths. Including the
  // unused half of triangle 16 used to reserve an extra half-edge of space.
  const weights=[[1,0,0],[0,1,0],[0,0,1],[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]];
  const corners={1:[0,3,6],2:[1,3,6],3:[1,4,6],4:[2,4,6],5:[2,5,6],6:[0,5,6]};
  return T.flatMap(t=>t.lcd?[...new Set(t.lcd.flatMap(l=>corners[l]))].map(i=>[0,1].map(c=>weights[i].reduce((s,v,j)=>s+v*t.p[j][c],0))):t.p);
}
export function makeMap() {
  const T=buildNetFuller(),[width,height]=MAP_SIZE;
  const pts=visibleVertices(T),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const k=Math.min((width-4)/(x1-x0),(height-4)/(y1-y0));
  const ox=(width-k*(x1-x0))/2,oy=(height-k*(y1-y0))/2;
  const toPixel=([x,y]) => [ox+(x-x0)*k,oy+(y1-y)*k];
  const toNet=(x,y) => [x0+(x-ox)/k,y1-(y-oy)/k];
  return {width,height,T,k,toPixel,project:(lat,lon)=>toPixel(lonLatToNet(T,lat,lon)),
    inverse:(x,y)=>netToDir(T,...toNet(x,y),.42/k)};
}
