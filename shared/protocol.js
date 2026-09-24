import moment from 'moment-timezone';
import {makeMap,direction} from './map.js';
import {validateSettings,markColor,pebbleColor} from './settings.js';
export const PACKET_SIZE=232,ZONE_SIZE=72,HEADER_SIZE=16;
export const PACKET_VERSION=7; // Small map glyph set; per-place RGB222 colors unchanged.
export const zoneExists = name => !!moment.tz.zone(name);
export function encodeSettings(input,now=Date.now()) {
  const s=validateSettings(input,zoneExists),bytes=new Uint8Array(PACKET_SIZE),v=new DataView(bytes.buffer);
  const flags=(s.dayNight?1:0)|(s.edges?2:0)|(s.lights?4:0)|(s.motion?8:0)|(s.sun?16:0)|(s.stacked?32:0)|(s.connectionBuzz!=='off'?64:0)|(s.connectionBuzz==='both'?128:0);
  bytes.set([PACKET_VERSION,s.theme,flags,s.format,s.orientation,...s.time,...s.map,...s.zones.flat(),s.places.reduce((n,p,i)=>n|(p.on?1<<i:0),0)]);
  const map=makeMap();
  s.places.forEach((p,i)=>{
    const base=HEADER_SIZE+i*ZONE_SIZE,zone=moment.tz.zone(p.tz),pos=map.project(p.lat,p.lon);
    Array.from(p.label).forEach((ch,j)=>bytes[base+j]=ch.charCodeAt(0));
    bytes[base+8]=Math.max(0,Math.min(map.width-1,Math.round(pos[0])));
    bytes[base+9]=Math.max(0,Math.min(map.height-1,Math.round(pos[1])));
    bytes[base+10]=p.icon;
    bytes[base+70]=pebbleColor(markColor(p,s,i));
    direction(p.lat,p.lon).forEach((d,j)=>v.setInt8(base+11+j,Math.round(d*127)));
    v.setInt16(base+14,-zone.utcOffset(now),true);
    const transitions=[];
    for(let j=0;j<zone.untils.length-1;j++) {
      const t=zone.untils[j];
      if(t>now&&Number.isFinite(t)&&t/1000<0xffffffff)transitions.push([Math.floor(t/1000),-zone.offsets[j+1]]);
    }
    const saved=transitions.slice(0,8);bytes[base+16]=saved.length;
    // The ninth change is when this cache becomes stale; no fake future offset.
    v.setUint32(base+18,transitions[8]?.[0]??0xffffffff,true);
    saved.forEach(([until,offset],j)=>{v.setUint32(base+22+j*6,until,true);v.setInt16(base+26+j*6,offset,true);});
  });
  bytes[HEADER_SIZE+17]=s.moonIndicator?1:0;
  return bytes;
}
export function packetOffset(bytes,index,epoch) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),base=HEADER_SIZE+index*ZONE_SIZE;
  let offset=v.getInt16(base+14,true);
  for(let j=0;j<bytes[base+16];j++)if(epoch>=v.getUint32(base+22+j*6,true))offset=v.getInt16(base+26+j*6,true);
  return offset;
}
