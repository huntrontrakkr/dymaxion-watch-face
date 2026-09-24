import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {geoContains} from 'd3-geo';
import {feature} from 'topojson-client';
import {makeMap} from '../shared/map.js';
import {triangleGridMask,netRows,BACKGROUND_BITS} from '../shared/map-background.js';
const atlas=JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json'));
const land=feature(atlas,atlas.objects.land);
mkdirSync('watchface/resources/maps',{recursive:true});
mkdirSync('designer/public/maps',{recursive:true});
// Re-rasterize Natural Earth at the concept's 0.5 degree cell centers.
const cache=new Map();
function isLand(dir) {
  const lat=Math.asin(dir[2])*180/Math.PI,lon=Math.atan2(dir[1],dir[0])*180/Math.PI;
  const r=Math.max(0,Math.min(359,Math.round((89.75-lat)*2)));
  const c=((Math.round((lon+179.75)*2)%720)+720)%720,key=r*720+c;
  if(!cache.has(key))cache.set(key,geoContains(land,[-179.75+c/2,89.75-r/2]));
  return cache.get(key);
}
{
  const m=makeMap(),data=new Uint8Array(m.width*m.height*4),view=new DataView(data.buffer);
  let occupied=0;
  for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++) {
    const result=m.inverse(x+.5,y+.5);if(!result)continue;
    const [dir,edge]=result,index=(y*m.width+x)*4;
    dir.forEach((v,j)=>view.setInt8(index+j,Math.round(v*127)));
    data[index+3]=(isLand(dir)?2:1)|(edge?4:0);occupied++;
  }
  // Empty pixels carry each optional background's dots as a flag bit.
  const rows=netRows(m);
  for(const pattern of ['points','lines']){
    const grid=triangleGridMask(m,pattern,rows);
    for(let i=0;i<grid.length;i++)if(grid[i]&&!(data[i*4+3]&3))data[i*4+3]|=BACKGROUND_BITS[pattern];
  }
  for(const path of ['watchface/resources/maps','designer/public/maps'])writeFileSync(`${path}/map-0.bin`,data);
  console.log(`map-0: ${m.width}×${m.height}, ${occupied} surface pixels, ${data.length} bytes`);
}
