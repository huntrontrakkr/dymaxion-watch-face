import mapBase64 from '../designer/public/maps/map-0.bin';
import font from '../designer/public/type/draft.json' with {type:'json'};
import {MAP_SIZE,makeMap,direction,dot} from '../shared/map.js';
import {paletteFor} from '../shared/palette-settings.js';
import {clockMask,drawFlipPixels,flipOffset} from '../shared/minute-flip.js';
import {drawBitmapText,fitLabel} from '../shared/type.js';
import {markColor,hourText,blockSize} from '../shared/settings.js';
import {drawMarkerPixels} from '../shared/markers.js';
import {sunDirection} from '../shared/solar.js';
import {CITIES} from '../shared/cities.js';
import {drawFooter} from '../shared/panel-render.js';
import {sampleEnvironment} from '../shared/panel-data.js';
import {MOON_GLYPHS,moonFrame} from '../shared/moon.js';
import {BLUETOOTH_ROWS,SUN_ROWS} from '../shared/status-glyphs.js';
import {drawPixelRows} from '../shared/pixels.js';
import {BACKGROUND_BITS} from '../shared/map-background.js';
import {nameplateLayout,NAMEPLATE_ROWS} from '../shared/nameplate.js';
import {zonesBeside,zonesOnMap,zoneColumn,zoneRow,zoneRowBaseline,tallPixels} from '../shared/zone-column.js';
import {placeMapTimes,mapTimeTemplate,mapTimeText,tinyPixels,routePixels,MAP_TIME_SIZES} from '../shared/map-times.js';
import {layoutMarkers} from '../shared/map-markers.js';

const pixels=Uint8Array.from(atob(mapBase64),c=>c.charCodeAt(0)),signed=new Int8Array(pixels.buffer),map=makeMap();
const two=n=>String(n).padStart(2,'0');
const zoned=(date,tz)=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
  const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));return {h:+p.hour%24,m:+p.minute,day:Date.UTC(+p.year,+p.month-1,+p.day)};
};
export function renderConfigPreview(canvas,s,{evening=false,page=s.footer.home,city=null}={}){
  const ctx=canvas.getContext('2d'),pal=paletteFor(s),now=new Date();now.setHours(evening?22:10,8,0,0);
  const sun=sunDirection(now),[w,h]=MAP_SIZE,[mx,my]=s.map;
  ctx.imageSmoothingEnabled=false;ctx.fillStyle=pal.bg;ctx.fillRect(0,0,200,228);
  const image=ctx.createImageData(w,h),colors=[pal.bg,pal.ocean,pal.land,pal.nightOcean,pal.nightLand,pal.edge].map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
  let best=-Infinity,sunPoint=[0,0];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,kind=pixels[i+3]&3;let color=0;
    if(kind){const light=(signed[i]*sun[0]+signed[i+1]*sun[1]+signed[i+2]*sun[2])/127;
      if(light>best){best=light;sunPoint=[x,y];}let night=s.dayNight&&light<0;
      if(s.dayNight&&Math.abs(light)<.05)night=(x+y)&1?light<.05:light<-.05;
      color=kind+(night?2:0);if(s.edges&&(pixels[i+3]&4))color=5;
    }else if(pixels[i+3]&BACKGROUND_BITS[s.mapBackground])color=5;
    image.data.set([...colors[color],255],i);
  }
  ctx.putImageData(image,mx,my);
  if(s.dayNight&&s.lights)for(const [la,lo]of CITIES){if(dot(direction(la,lo),sun)>=-.03)continue;const [x,y]=map.project(la,lo);ctx.fillStyle=pal.accent;ctx.fillRect(mx+Math.round(x),my+Math.round(y),1,1);}
  if(s.dayNight&&s.sun)drawPixelRows(ctx,SUN_ROWS,mx+sunPoint[0]-2,my+sunPoint[1]-2,pal.accent);
  const clock24=s.format===1||(s.format===0&&!new Intl.DateTimeFormat(undefined,{hour:'numeric'}).resolvedOptions().hour12);
  const local={h:now.getHours(),m:now.getMinutes(),day:Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())};
  const times=s.places.map(p=>zoned(now,p.tz)),time=t=>`${hourText(clock24?t.h:t.h%12||12,s.leadingZero)}:${two(t.m)}`;
  const panelZones=!s.footer.enabled||page==='zones',beside=zonesBeside(s,panelZones),onMap=zonesOnMap(s,panelZones);
  const enabled=s.places.map((p,i)=>({p,i})).filter(({p})=>p.on);
  const points=enabled.map(({p})=>{const [x,y]=map.project(p.lat,p.lon);return {x:Math.round(x),y:Math.round(y),half:2};});
  const spots=layoutMarkers(points,w,h);
  if(onMap){
    const templates=spots.map((point,j)=>({...point,template:mapTimeTemplate(clock24,times[enabled[j].i].h!==local.h)}));
    const labels=placeMapTimes(templates,(x,y)=>!!(pixels[(y*w+x)*4+3]&3),w,h,{turn:s.mapTimesTurn,size:MAP_TIME_SIZES.indexOf(s.mapTimeSize)});
    labels.forEach((label,j)=>{if(!label)return;const {p,i}=enabled[j],t=times[i],color=markColor(p,s,i);
      for(const [x,y]of routePixels(label.points)){ctx.fillStyle=pal.bg;ctx.fillRect(mx+x-1,my+y-1,3,3);}
      ctx.fillStyle=color;for(const [x,y]of routePixels(label.points))ctx.fillRect(mx+x,my+y,1,1);
      for(const [x,y]of tinyPixels(mapTimeText({hour:t.h,minute:t.m,clock24,delta:Math.round((t.day-local.day)/86400000)}),label.orientation,label.total,label.size))ctx.fillRect(mx+label.x+x,my+label.y+y,1,1);
    });
  }
  spots.forEach((point,j)=>{const {p,i}=enabled[j];ctx.fillStyle=pal.bg;ctx.fillRect(mx+point.x-3,my+point.y-3,7,7);drawMarkerPixels(ctx,p.icon,mx+point.x,my+point.y,markColor(p,s,i));});
  const [tx,timeY]=s.time,[tw,th]=blockSize(s,'time');
  const {plate,clockTop:ty}=s.nameplate?nameplateLayout({mapY:my,timeY,height:th,stacked:s.stacked,visible:228}):{plate:null,clockTop:timeY};
  if(plate)drawPixelRows(ctx,NAMEPLATE_ROWS,plate.x,plate.y,pal.accent);
  ctx.fillStyle=pal.bg;ctx.fillRect(tx,ty,tw,th);
  if(s.stacked){drawBitmapText(ctx,font.lining.large,hourText(clock24?local.h:local.h%12||12,s.leadingZero).trim(),tx+36,ty+30,pal.ink,'center');drawBitmapText(ctx,font.lining.large,two(local.m),tx+36,ty+65,pal.ink,'center');}
  else drawFlipPixels(ctx,clockMask(time(local),s.clockDisplay),tx+(beside?zoneColumn(s.zonePosition).shift:0),ty+flipOffset(s.clockDisplay),{ink:pal.ink,background:pal.bg});
  if(beside)enabled.forEach(({p,i},row)=>{
    const t=times[i],r=zoneRow({label:p.label,hour:t.h,minute:t.m,clock24,delta:Math.round((t.day-local.day)/86400000),side:s.zonePosition,tall:s.zoneTimesTall},text=>[...text].reduce((n,c)=>n+(font.lining.small[c]||font.lining.small['?']).a,0)),base=ty+zoneRowBaseline(row,enabled.length,s.zoneTimesTall);
    drawBitmapText(ctx,font.lining.small,r.label,tx+r.labelX,base,markColor(p,s,i));
    if(s.zoneTimesTall){ctx.fillStyle=pal.ink;for(const [x,y] of tallPixels(r.time))ctx.fillRect(tx+r.timeX+x,base+y,1,1);}
    else drawBitmapText(ctx,font.lining.small,r.time,tx+r.timeX,base,pal.ink);
  });
  if(s.footer.enabled){ctx.fillStyle=pal.bg;ctx.fillRect(0,184,200,44);}
  if(panelZones)enabled.forEach(({p,i})=>{const [x,y]=s.zones[i],t=times[i],ink=markColor(p,s,i);ctx.fillStyle=pal.bg;ctx.fillRect(x,y,60,36);
    if(s.placeIcons)drawMarkerPixels(ctx,p.icon,x+5,y+7,ink);
    drawBitmapText(ctx,font.text.small,fitLabel(font.text.small,p.label),x+12,y+12,ink);
    drawBitmapText(ctx,font.lining.zone,`${two(clock24?t.h:t.h%12||12)}:${two(t.m)}`,x+2,y+31,pal.ink);
  });
  const forecastPlace=s.footer.weather.place==='current'?city:s.places[s.footer.weather.place];
  const daylight=Number.isFinite(forecastPlace?.lat)&&Number.isFinite(forecastPlace?.lon)?direction(forecastPlace.lat,forecastPlace.lon):null;
  if(s.footer.enabled)drawFooter(ctx,s,page,{...sampleEnvironment(+now),palette:pal,daylight},+now,font.lining.small,clock24);
  ctx.fillStyle=pal.bg;ctx.fillRect(0,0,200,18);
  const cityName=s.location.mode==='manual'?s.location.name:city?.name||'YOUR CITY';
  drawBitmapText(ctx,font.lining.small,`${['SUN','MON','TUE','WED','THU','FRI','SAT'][now.getDay()]} ${two(now.getDate())} ${cityName.toUpperCase().slice(0,10)}`,4,12,pal.accent);
  ctx.fillStyle=pal.bg;ctx.fillRect(130,0,70,18);
  if(s.moonIndicator)MOON_GLYPHS[moonFrame(now)].forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel!=='.'){ctx.fillStyle=pixel==='#'?pal.ink:pal.moonShadow;ctx.fillRect(134+x,3+y,1,1);}}));
  drawPixelRows(ctx,BLUETOOTH_ROWS,148,2,pal.ink);drawBitmapText(ctx,font.lining.small,'86%',195,12,pal.ink,'right');
}
