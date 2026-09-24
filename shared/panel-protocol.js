import {HOLIDAY_REGIONS} from './calendar.js';
import {pebbleColor} from './settings.js';
import {PANEL_PAGES,PANEL_COLOR_ROLES,panelColors} from './panel-settings.js';
import {environmentIsValid} from './panel-data.js';
export const FOOTER_SIZE=64,WEATHER_SIZE=424,TIDE_SIZE=244;
const ids=PANEL_PAGES.map(([id])=>id);
export function encodeFooter(s){
  const f=s.footer,w=f.weather,c=f.calendar,t=f.tide,b=new Uint8Array(FOOTER_SIZE),v=new DataView(b.buffer);
  b.set([1,+f.enabled,f.pages.length,ids.indexOf(f.home),...Array.from({length:5},(_,i)=>f.pages[i]?ids.indexOf(f.pages[i]):255)]);
  b[9]=f.rotationMinutes;b[10]=f.horizon;b[11]=+(w.temperatureUnit==='f');b[12]=['off','probability','amount'].indexOf(w.precipitation);
  b[13]=+w.daylight;b[14]=+w.grid;b[15]=+w.solarTimes;b[16]=c.weekStart;b[17]=+(c.weeks==='previous-current');b[18]=['sat-sun','fri-sat','none'].indexOf(c.weekends);b[19]=HOLIDAY_REGIONS.findIndex(([id])=>id===c.holidays);b[20]=+(c.todayStyle==='outline');
  const colors=panelColors(s);PANEL_COLOR_ROLES.forEach((role,i)=>b[21+i]=pebbleColor(colors[role]));
  b[29]=+(w.temperatureScale==='fixed');b[30]=+(w.humidityScale==='auto');v.setInt16(31,Math.round(w.temperatureMin*10),true);v.setInt16(33,Math.round(w.temperatureMax*10),true);
  b[35]=+(w.rainUnit==='in');b[36]=+(t.unit==='ft');b[37]=w.refreshMinutes;b[38]=+w.enabled;b[39]=+w.rangeLabels;b[40]=+t.zeroLine;b[41]=+!!t.station;b[42]=+f.shake;
  v.setUint16(43,Math.round(w.rainMax*10),true);b[45]=+(t.scale==='fixed');v.setInt16(46,Math.round(t.min*100),true);v.setInt16(48,Math.round(t.max*100),true);b[50]=w.place;b[51]=+w.humidityLine;b[52]=f.flicks;
  return b;
}
const putText=(b,offset,text)=>[...(text||'').slice(0,7)].forEach((ch,i)=>b[offset+i]=ch.charCodeAt(0));
export function encodeEnvironment(data,kind){
  if(data?.samples?.length&&!environmentIsValid(data,kind))throw new Error('Invalid '+kind+' data packet.');
  const weather=kind==='weather',b=new Uint8Array(weather?WEATHER_SIZE:TIDE_SIZE),v=new DataView(b.buffer),d=data||{};
  b[0]=1;b[1]=d.samples?.length||0;b[2]=(d.demo?1:0)|(d.error?2:0);b[3]=1;
  v.setUint32(4,d.fetched||0,true);v.setUint32(8,d.start||0,true);
  if(weather){
    v.setUint32(12,d.rise||0,true);v.setUint32(16,d.set||0,true);v.setUint16(20,d.riseMinute||0,true);v.setUint16(22,d.setMinute||0,true);putText(b,24,d.label);
    (d.samples||[]).forEach((p,i)=>{const j=32+i*8;v.setInt16(j,p.temperature,true);b[j+2]=p.humidity;b[j+3]=p.probability;v.setUint16(j+4,p.rain,true);b[j+6]=p.day;b[j+7]=p.hour;});
  }else{
    v.setUint32(12,d.high||0,true);v.setUint32(16,d.low||0,true);v.setInt16(20,d.highHeight||0,true);v.setInt16(22,d.lowHeight||0,true);v.setUint16(24,d.highMinute||0,true);v.setUint16(26,d.lowMinute||0,true);putText(b,28,d.label);putText(b,36,d.station);
    (d.samples||[]).forEach((p,i)=>{const j=48+i*4;v.setInt16(j,p.height,true);b[j+2]=p.hour;});
  }
  return b;
}
