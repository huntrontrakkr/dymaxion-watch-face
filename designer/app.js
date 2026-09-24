import './style.css';
import '../shared/palette-controls.css';
import {paletteFor} from '../shared/palette-settings.js';
import {paletteControls} from '../shared/palette-controls.js';
import moment from 'moment-timezone';
import {drawBitmapText,fitLabel,textWidth} from '../shared/type.js';
import {defaults,THEMES,PLACES,PRESETS,activePreset,presetFor,withClockDisplay,validateSettings,clampPosition,blockSize,markColor,quantizeColor,clockTopForVisible,QUICK_VIEW_HEIGHT,hourText} from '../shared/settings.js';
import {MARKERS,drawMarkerPixels} from '../shared/markers.js';
import {makeMap,direction,dot,MAP_SIZE} from '../shared/map.js';
import {sunDirection} from '../shared/solar.js';
import {moonFrame,moonDescription,MOON_GLYPHS,MOON_SIZE} from '../shared/moon.js';
import {BLUETOOTH_ROWS,DAY_NIGHT_ROWS,MARKER_HALO_ROWS,PULSE_ROWS} from '../shared/status-glyphs.js';
import {drawPixelRows,drawPixelLine} from '../shared/pixels.js';
import {CITIES} from '../shared/cities.js';
import {panelControls} from '../shared/panel-controls.js';
import {drawFooter} from '../shared/panel-render.js';
import {sampleEnvironment} from '../shared/panel-data.js';
import {environmentService} from '../tools/environment-service.js';
import {PANEL_PAGES} from '../shared/panel-settings.js';
import {cityControls} from '../shared/city-controls.js';
import {cityIsUsable,cityHasPosition,clockCaption} from '../shared/city.js';
import {locationService} from '../tools/location-service.js';
import {displayControls} from '../shared/display-controls.js';
import {drawTriangleTime} from '../shared/triangle-display.js';
import {minuteFlipClock,drawFlipPixels} from '../shared/minute-flip.js';

const $=id=>document.getElementById(id),zoneExists=tz=>!!moment.tz.zone(tz);
const clone=x=>JSON.parse(JSON.stringify(x));
let settings=defaults(),offset=0,selected='time',drag=null,animation=0,activePlace=0;
let mapCache=null,cacheKey='',mapPixels=[],watchTypeface=null,watchSpan=null;
const canvas=$('screen'),ctx=canvas.getContext('2d',{willReadFrequently:true});
ctx.imageSmoothingEnabled=false;
// Centering the bezel can put its screen between physical browser pixels.
// Snap only the preview's origin; its native 200×228 buffer never resizes.
let previewNudge=[0,0];
function alignPreviewPixels(){
  const box=canvas.getBoundingClientRect(),ratio=devicePixelRatio||1;
  const origin=[box.left+scrollX-previewNudge[0],box.top+scrollY-previewNudge[1]];
  previewNudge=origin.map(n=>Math.round(n*ratio)/ratio-n);
  canvas.style.transform=`translate(${previewNudge[0]}px,${previewNudge[1]}px)`;
}
const previewSize=new ResizeObserver(alignPreviewPixels);
previewSize.observe(canvas);previewSize.observe(document.querySelector('.preview-stage'));
window.addEventListener('resize',alignPreviewPixels);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const minuteClock=minuteFlipClock({invalidate:()=>render()});
document.addEventListener('visibilitychange',()=>{minuteClock.reset();if(!document.hidden)render();});
reducedMotion.addEventListener('change',()=>{minuteClock.reset();render();});
const STORAGE='dymaxion-workshop-v1';
try {const saved=localStorage.getItem(STORAGE);if(saved)settings=validateSettings(JSON.parse(saved),zoneExists);}catch{notice('Saved settings could not be read. The default composition is loaded.');}
let footerPage=settings.footer.home,panelChanged=Date.now(),environmentMode='sample',liveData={};
let currentCity={name:'Norfolk',sample:true,lat:36.9,lon:-76.3};
const cityLocation=locationService({getSettings:()=>settings,storage:localStorage,send:city=>{currentCity=city;render();}});
const cityEditor=cityControls($('city-controls'),()=>settings,value=>{settings=validateSettings({...settings,location:value},zoneExists);save();},()=>cityLocation.refresh());
const displayEditor=displayControls($('display-controls'),()=>settings,value=>{settings={...withClockDisplay(settings,value.clockDisplay,value.segmentGrid),leadingZero:value.leadingZero};sync();save();});
const paletteEditor=paletteControls($('palette-controls'),()=>settings,patch=>{settings=validateSettings({...settings,...patch},zoneExists);sync();save();});
const environment=environmentService({getSettings:()=>settings,storage:localStorage,send:(kind,data)=>{liveData[kind]=data;render();}});
const panelEditor=panelControls($('panel-controls'),()=>settings,footer=>{
  const candidate=clone(settings);candidate.footer=footer;const previous=settings.footer.home;
  settings=validateSettings(candidate,zoneExists);if(previous!==settings.footer.home||!settings.footer.pages.includes(footerPage))footerPage=settings.footer.home;
  panelChanged=Date.now();save();if(environmentMode==='live')environment.refresh();
});
function nextPanel(){const pages=settings.footer.pages;footerPage=pages[(pages.indexOf(footerPage)+1)%pages.length];panelChanged=Date.now();render();}
$('next-panel').onclick=nextPanel;
$('sample-data').onclick=()=>{environmentMode='sample';render();};
$('live-data').onclick=()=>{environmentMode='live';environment.refresh();render();};

function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function save(){
  try{settings=validateSettings(settings,zoneExists);localStorage.setItem(STORAGE,JSON.stringify(settings));$('save-state').textContent='SAVED LOCALLY';notice('Your composition is saved in this browser.');}
  catch(e){$('save-state').textContent='NOT SAVED';notice(e.message,true);}
  cacheKey='';render();
}
function getPosition(key){return key.startsWith('zone')?settings.zones[+key.slice(-1)]:settings[key];}
function move(key,pos){const clamped=clampPosition(settings,key,pos);if(key.startsWith('zone'))settings.zones[+key.slice(-1)]=clamped;else settings[key]=clamped;}
function positionFields(){
  const pos=getPosition(selected),[w,h]=blockSize(settings,selected);
  $('element').value=selected;$('pos-x').value=pos[0];$('pos-y').value=pos[1];
  $('pos-x').max=200-w;$('pos-y').max=228-h;$('pos-y').min=selected==='map'?0:16;
}
const drawings={meridian:'M4 4H20M28 4H36M7 8H33V20H7ZM3 26 13 23 19 30 28 24 37 31 26 38 15 33 6 37ZM4 43H11M16 43H23M28 43H35',horizon:'M3 7 13 4 19 12 28 5 37 13 26 22 15 16 6 21ZM5 28H35V34H5ZM4 40H11M16 40H23M28 40H35'};
for(const [id,name] of [['meridian','Meridian'],['horizon','Horizon']]){
  const button=document.createElement('button');button.type='button';button.dataset.preset=id;button.setAttribute('aria-pressed','false');
  button.innerHTML=`<svg viewBox="0 0 40 46" aria-hidden="true"><path d="${drawings[id]}"/></svg><span>${name}</span>`;
  button.onclick=()=>{Object.assign(settings,presetFor(id,settings.clockDisplay));sync();save();pulse();};$('presets').append(button);
}
THEMES.forEach((t,i)=>{
  const button=document.createElement('button');button.type='button';button.dataset.theme=i;button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label',t.name);
  button.innerHTML=`<span class="swatches" aria-hidden="true">${[t.bg,t.ink,t.ocean,t.land,t.nightLand,t.accent].map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="theme-name">${t.name}</span><span class="theme-note">${t.description}</span>`;
  button.onclick=()=>{settings.theme=i;settings.customPalette=null;sync();save();};$('themes').append(button);
});
function markerSample(canvas,icon,color,bg='#000000'){
  const g=canvas.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,9,9);
  drawMarkerPixels(g,icon,4,4,color);
}
function markerGallery(){
  const gallery=$('marker-gallery');gallery.replaceChildren();
  MARKERS.forEach((symbol,i)=>{
    const tile=document.createElement('article');tile.className='marker-tile';
    const preview=document.createElement('canvas');preview.width=preview.height=9;
    preview.setAttribute('aria-hidden','true');markerSample(preview,i,'#00FFAA');tile.append(preview);
    const copy=document.createElement('div'),name=document.createElement('strong'),meaning=document.createElement('small');
    name.textContent=symbol.name;meaning.textContent=symbol.meaning;copy.append(name,meaning);
    tile.append(copy);gallery.append(tile);
  });
}
function placesUI(){
  $('place-list').replaceChildren();
  settings.places.forEach((p,i)=>{
    const card=document.createElement('div');card.className='place-card';
    card.innerHTML=`<label class="toggle"><span><i class="place-dot"></i>Place 0${i+1}</span><input type="checkbox" aria-label="Enable place ${i+1}" data-field="on"></label><label class="field">City<select data-field="city" aria-label="City for place ${i+1}"></select></label><div class="place-fields"><label class="field">Short label<input data-field="label" aria-label="Label for place ${i+1}" maxlength="7" pattern="[A-Z0-9 +\\-]{1,7}"></label><label class="field">Map glyph<select data-field="icon" aria-label="Symbol for place ${i+1}"></select></label></div><div class="marker-control"><canvas width="9" height="9" aria-hidden="true"></canvas><span class="marker-description"></span></div><div class="marker-color"><label class="field">Marker color<input data-field="color" type="color" aria-label="Color for place ${i+1}"></label><output data-color-name></output><button type="button" data-color-reset aria-label="Use theme color for place ${i+1}">Use theme color</button></div><details><summary>Coordinates & named time zone</summary><div class="place-fields"><label class="field wide">IANA time zone<input data-field="tz" aria-label="Time zone for place ${i+1}" type="text"></label><label class="field">Latitude<input data-field="lat" aria-label="Latitude for place ${i+1}" type="number" step="0.0001" min="-90" max="90"></label><label class="field">Longitude<input data-field="lon" aria-label="Longitude for place ${i+1}" type="number" step="0.0001" min="-180" max="180"></label></div></details>`;
    const city=card.querySelector('[data-field=city]'),symbol=card.querySelector('[data-field=icon]');
    PLACES.forEach((place,n)=>city.add(new Option(`${place.name} / ${place.label}`,String(n))));city.add(new Option('Custom location','custom'));
    MARKERS.forEach((mark,n)=>symbol.add(new Option(mark.name,String(n))));
    const match=PLACES.findIndex(place=>place.tz===p.tz&&place.lat===p.lat&&place.lon===p.lon);city.value=match<0?'custom':String(match);
    const refreshMarker=()=>{
      const place=settings.places[i],ink=markColor(place,settings,i);
      card.querySelector('.place-dot').style.background=ink;
      card.querySelector('[data-field=color]').value=ink;
      card.querySelector('[data-color-name]').textContent=place.color?`${ink} · custom`:`${ink} · theme`;
      card.querySelector('[data-color-reset]').disabled=place.color===null;
      card.querySelector('.marker-description').textContent=MARKERS[place.icon].meaning;
      markerSample(card.querySelector('.marker-control canvas'),place.icon,ink,paletteFor(settings).bg);
    };
    for(const key of ['on','label','icon','tz','lat','lon']){
      const input=card.querySelector(`[data-field=${key}]`);if(key==='on')input.checked=p.on;else input.value=p[key];
      input.onchange=()=>{
        const candidate=clone(settings);
        candidate.places[i][key]=key==='on'?input.checked:['lat','lon','icon'].includes(key)?Number(input.value):key==='label'?input.value.trim().toUpperCase():input.value.trim();
        try{settings=validateSettings(candidate,zoneExists);input.setCustomValidity('');input.value=settings.places[i][key];refreshMarker();save();if(['lat','lon','tz'].includes(key))city.value='custom';}
        catch(e){input.setCustomValidity(e.message);input.reportValidity();notice(e.message,true);}
      };
      input.oninput=()=>input.setCustomValidity('');
    }
    const pick=card.querySelector('[data-field=color]');pick.onchange=()=>{
      try{const candidate=clone(settings);candidate.places[i].color=quantizeColor(pick.value);settings=validateSettings(candidate,zoneExists);refreshMarker();save();}
      catch(e){notice(e.message,true);}
    };
    card.querySelector('[data-color-reset]').onclick=()=>{settings.places[i].color=null;refreshMarker();save();};
    city.onchange=()=>{
      if(city.value==='custom'){card.querySelector('details').open=true;return;}
      settings.places[i]={...PLACES[+city.value],on:settings.places[i].on,icon:settings.places[i].icon,color:settings.places[i].color};placesUI();save();
    };
    refreshMarker();$('place-list').append(card);
  });
}
markerGallery();
function sync(){
  for(const key of ['dayNight','edges','lights','sun','motion','stacked','moonIndicator'])$(key).checked=settings[key];
  $('format').value=settings.format;$('connectionBuzz').value=settings.connectionBuzz;
  document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(settings.customPalette===null&&+b.dataset.theme===settings.theme)));
  const current=activePreset(settings);document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===current)));
  positionFields();placesUI();panelEditor.refresh();cityEditor.refresh();displayEditor.refresh();paletteEditor.refresh();
}
for(const key of ['dayNight','edges','lights','sun','motion','stacked','moonIndicator'])$(key).onchange=()=>{settings[key]=$(key).checked;move('time',settings.time);positionFields();displayEditor.refresh();save();};
$('format').onchange=()=>{settings.format=+$('format').value;save();};
$('connectionBuzz').onchange=()=>{settings.connectionBuzz=$('connectionBuzz').value;save();};
$('element').onchange=()=>{selected=$('element').value;positionFields();$('guides').checked=true;render();};
for(const axis of ['x','y'])$('pos-'+axis).onchange=()=>{const value=Number($('pos-'+axis).value);if(!Number.isFinite(value))return;const p=getPosition(selected).slice();p[axis==='x'?0:1]=value;move(selected,p);positionFields();save();};
const tabs=[...document.querySelectorAll('[role=tab]')];
function switchTab(tab){tabs.forEach(b=>{const active=b===tab;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')).hidden=!active;});}
tabs.forEach((b,i)=>{b.onclick=()=>switchTab(b);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;switchTab(tabs[n]);tabs[n].focus();};});

function paintText(text,x,y,size,color,align='left'){
  if(size===50){drawBitmapText(ctx,watchSpan.lining.large,text,x,y,color,align);return;}
  const role=size===48?'large':size===16?'zone':'small';
  drawBitmapText(ctx,watchTypeface[role==='small'?'text':'lining'][role],text,x,y,color,align);
}
function strokeLine(x1,y1,x2,y2,color){drawPixelLine(ctx,x1,y1,x2,y2,color);}
function drawMoonIndicator(now){
  if(!settings.moonIndicator)return;
  const pal=paletteFor(settings),rows=MOON_GLYPHS[moonFrame(now)],colors=[pal.bg,pal.moonShadow,pal.ink];
  for(let y=0;y<MOON_SIZE;y++)for(let x=0;x<MOON_SIZE;x++){
    const pixel=rows[y][x];
    if(pixel!=='.'){ctx.fillStyle=colors[pixel==='#'?2:1];ctx.fillRect(134+x,3+y,1,1);}
  }
}
function drawBluetoothIndicator(){
  drawPixelRows(ctx,BLUETOOTH_ROWS,148,2,paletteFor(settings).ink);
}
function marker(x,y,icon,color,bg){
  drawPixelRows(ctx,MARKER_HALO_ROWS,x-3,y-3,bg);
  drawMarkerPixels(ctx,icon,x,y,color);
}
function mapImage(now,pal,sun){
  const key=[pal.bg,pal.ocean,pal.land,pal.nightOcean,pal.nightLand,pal.edge,settings.dayNight,settings.edges,Math.floor(now/300000)].join('/');
  if(key===cacheKey&&mapCache)return mapCache;
  const [w,h]=MAP_SIZE,data=mapPixels;
  const offscreen=document.createElement('canvas');offscreen.width=w;offscreen.height=h;
  const g=offscreen.getContext('2d'),img=g.createImageData(w,h),signed=new Int8Array(data.buffer);
  const colors=[pal.bg,pal.ocean,pal.land,pal.nightOcean,pal.nightLand,pal.edge].map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
  let best=-Infinity,sunPoint=[0,0];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,kind=data[i+3]&3;let c=0;
    if(kind){const light=(signed[i]*sun[0]+signed[i+1]*sun[1]+signed[i+2]*sun[2])/127;
      if(light>best){best=light;sunPoint=[x,y];}
      let night=settings.dayNight&&light<0;
      if(settings.dayNight&&Math.abs(light)<.05)night=(x+y)&1?light<.05:light<-.05;
      c=kind+(night?2:0);if(settings.edges&&(data[i+3]&4))c=5;
    }
    img.data.set([...colors[c],255],i);
  }
  g.putImageData(img,0,0);cacheKey=key;mapCache={canvas:offscreen,sunPoint};return mapCache;
}
function statusWidth(){return settings.moonIndicator?126:140;}
function use24(){return settings.format===1||(settings.format===0&&!new Intl.DateTimeFormat(undefined,{hour:'numeric'}).resolvedOptions().hour12);}
const two=n=>String(n).padStart(2,'0');
function clockParts(date){let h=date.hours();return {h:use24()?h:h%12||12,m:date.minutes(),ampm:h<12?'AM':'PM'};}
// Chart day/night follows the wearer's location when the phone knows it,
// otherwise the forecast place.
function daylightPlace(){
  if(settings.location.mode==='auto'&&cityHasPosition(currentCity))return direction(currentCity.lat,currentCity.lon);
  const place=settings.places[settings.footer.weather.place];return direction(place.lat,place.lon);
}
function render(){
  if(!mapPixels.length||!watchTypeface||!watchSpan)return;
  if(!settings.footer.pages.includes(footerPage))footerPage=settings.footer.home;
  if(settings.footer.enabled&&settings.footer.rotationMinutes&&Date.now()-panelChanged>=settings.footer.rotationMinutes*60000){footerPage=settings.footer.pages[(settings.footer.pages.indexOf(footerPage)+1)%settings.footer.pages.length];panelChanged=Date.now();}
  const now=new Date(Date.now()+offset*3600000),local=moment(now),sun=sunDirection(new Date(Math.floor(+now/300000)*300000)),pal=paletteFor(settings);
  ctx.clearRect(0,0,200,228);ctx.fillStyle=pal.bg;ctx.fillRect(0,0,200,228);
  const m=makeMap(),[mx,my]=settings.map,cached=mapImage(now,pal,sun);
  ctx.drawImage(cached.canvas,mx,my);
  if(settings.lights&&settings.dayNight)for(const [lat,lon]of CITIES){if(dot(direction(lat,lon),sun)>=-.03)continue;const [x,y]=m.project(lat,lon);ctx.fillStyle=pal.accent;ctx.fillRect(mx+Math.round(x),my+Math.round(y),1,1);}
  if(settings.sun&&settings.dayNight)marker(mx+cached.sunPoint[0],my+cached.sunPoint[1],0,pal.accent,pal.bg);
  settings.places.forEach((p,i)=>{if(!p.on)return;const [x,y]=m.project(p.lat,p.lon).map(Math.round),ink=markColor(p,settings,i);marker(mx+x,my+y,p.icon,ink,pal.bg);if(animation&&i===activePlace){const frame=Math.floor((performance.now()-animation)/260);if(frame<4)drawPixelRows(ctx,PULSE_ROWS[frame],mx+x-8,my+y-8,ink);}});
  // Quick View preview: the bottom band hides and the clock stays above the card.
  const visible=$('quick-view').checked?228-QUICK_VIEW_HEIGHT:228;
  const [tx,timeY]=settings.time,[tw,th]=blockSize(settings,'time'),ty=clockTopForVisible(timeY,th,visible),{h,m:minute,ampm}=clockParts(local);
  const city=settings.location.mode==='manual'?settings.location.name:currentCity.sample?currentCity.name:cityIsUsable(currentCity)?currentCity.name+(currentCity.stale||Date.now()/1000-currentCity.fetched>7200?'?':''):'';
  const caption=clockCaption(settings.stacked?'':local.format('ddd DD MMM'),city,use24()?'':ampm,tw-4,t=>textWidth(watchTypeface.text.small,t));
  // Status line: lining capitals, date and city at the top left.
  // AM/PM belongs to the clock when it can show it (Chamfer or stacked).
  const clockAmpm=settings.stacked||settings.clockDisplay==='chamfer';
  const status=clockCaption(local.format('ddd DD MMM').toUpperCase(),city.toUpperCase(),use24()||clockAmpm?'':ampm,statusWidth(),t=>textWidth(watchTypeface.lining.small,t),'  ');
  ctx.fillStyle=pal.bg;ctx.fillRect(tx,ty,tw,th);
  if(settings.stacked||!['broad','chamfer'].includes(settings.clockDisplay))minuteClock.reset();
  if(settings.stacked){paintText(hourText(h,settings.leadingZero).trim(),tx+tw/2,ty+30,48,pal.ink,'center');paintText(two(minute),tx+tw/2,ty+65,48,pal.ink,'center');strokeLine(tx+25,ty+35,tx+47,ty+35,pal.accent);paintText(caption,tx+tw/2,ty+81,11,pal.accent,'center');}
  else{
    const value=hourText(h,settings.leadingZero)+':'+two(minute);
    if(settings.clockDisplay==='broad'||settings.clockDisplay==='chamfer'){
      const chamfer=settings.clockDisplay==='chamfer';
      minuteClock.update(value,Math.floor(+now/60000),[pal.ink,pal.bg,settings.format,tx,ty,offset].join('/'),settings.motion&&!reducedMotion.matches&&!document.hidden,settings.clockDisplay);
      drawFlipPixels(ctx,minuteClock.frame(),tx,chamfer?ty:ty-2,{ink:pal.ink,background:pal.bg});
      if(chamfer&&!use24())drawBitmapText(ctx,watchTypeface.lining.small,ampm,tx+167,ty+9,pal.accent);
    }else if(settings.clockDisplay==='triangles')drawTriangleTime(ctx,value,tx,ty-1,pal.ink,pal.inactive,settings.segmentGrid);
    // Span keeps fixed 45-pixel slots (as on the watch): draw the full readout,
    // then clear the first slot when the leading zero is off.
    else{paintText(value.replace(/^ /,'0'),tx+tw/2,ty+30,50,pal.ink,'center');if(value[0]===' '){ctx.fillStyle=pal.bg;ctx.fillRect(tx+5,ty,45,th);}}
  }
  canvas.dataset.clockDisplay=settings.stacked?'draft':settings.clockDisplay;
  canvas.dataset.clockAnimating=String(minuteClock.active);
  canvas.dataset.clockCaption=settings.stacked?caption:status;
  $('city-state').textContent=settings.location.mode==='manual'?'The clock uses your entered city name.':currentCity.sample?'Norfolk is an example city in this preview. The watch uses your phone’s location.':city?`Current city: ${currentCity.name}${currentCity.stale?' (last known location)':''}.`:'City unavailable. Allow location in the phone app, or enter a city name.';
  const band=visible>=228&&settings.footer.enabled;
  if(band){ctx.fillStyle=pal.bg;ctx.fillRect(0,184,200,44);}
  if(!band||footerPage==='zones')settings.places.forEach((p,i)=>{
    if(!p.on||settings.zones[i][1]+36>visible)return;const [x,y]=settings.zones[i],there=moment(now).tz(p.tz),time=clockParts(there);
    const delta=Math.round((Date.UTC(there.year(),there.month(),there.date())-Date.UTC(local.year(),local.month(),local.date()))/86400000);
    const ink=markColor(p,settings,i);
    ctx.fillStyle=pal.bg;ctx.fillRect(x,y,60,36);drawPixelRows(ctx,DAY_NIGHT_ROWS[+(dot(direction(p.lat,p.lon),sun)>=0)],x+1,y+5,ink);
    if(pal.zoneGlyphs)drawMarkerPixels(ctx,p.icon,x+10,y+7,ink);
    paintText(fitLabel(watchTypeface.text.small,p.label,pal.zoneGlyphs?28:34),x+(pal.zoneGlyphs?16:9),y+12,11,ink);if(delta)paintText((delta>0?'+':'')+delta,x+60,y+12,11,pal.accent,'right');
    paintText(two(time.h)+':'+two(time.m),x+2,y+31,16,pal.ink);if(!use24())paintText(time.ampm[0],x+53,y+30,11,pal.accent);
    if(animation&&i===activePlace)strokeLine(x,y+35,x+59,y+35,ink);
  });
  if(band)drawFooter(ctx,settings,footerPage,{...(environmentMode==='sample'?sampleEnvironment(+now):liveData),palette:pal,daylight:daylightPlace()},+now,watchTypeface.lining.small,use24());
  $('panel-preview-label').textContent=settings.footer.enabled?PANEL_PAGES.find(([id])=>id===footerPage)[1]:'Time zones';
  $('data-state').textContent=environmentMode==='sample'?'Example curves for layout preview. Live data is available below.':`Live forecast for ${settings.places[settings.footer.weather.place].name}. ${liveData.weather?.error?'Weather update unavailable; cached data is marked OLD.':''} ${liveData.tide?.error?'NOAA update unavailable.':''}`;
  ctx.fillStyle=pal.bg;ctx.fillRect(0,0,200,18);
  drawBitmapText(ctx,watchTypeface.lining.small,status,4,12,pal.accent);drawBitmapText(ctx,watchTypeface.lining.small,'86%',195,12,pal.ink,'right');
  drawMoonIndicator(now);drawBluetoothIndicator();
  if(visible<228){ctx.fillStyle=pal.ink;ctx.fillRect(0,visible,200,228-visible);ctx.fillStyle=pal.bg;ctx.fillRect(8,visible+10,110,7);ctx.fillRect(8,visible+24,160,5);ctx.fillRect(8,visible+34,130,5);}
  canvas.dataset.quickView=String(visible<228);canvas.dataset.clockTop=String(ty);
  // All watch pixels already come from RGB222 colors and native bitmap masks.
  // Avoid a final quantization pass that would hide accidental antialiasing.
  if($('guides').checked){const [x,y]=getPosition(selected),[w,h]=blockSize(settings,selected);ctx.fillStyle='#FF5500';for(let i=0;i<w;i++)if(i%4<2){ctx.fillRect(x+i,y,1,1);ctx.fillRect(x+i,y+h-1,1,1);}for(let i=0;i<h;i++)if(i%4<2){ctx.fillRect(x,y+i,1,1);ctx.fillRect(x+w-1,y+i,1,1);}}
  $('preview-time').textContent=local.format('ddd HH:mm')+(offset?' / PREVIEW':' / LIVE');
  const lunar=moonDescription(now);$('moon-state').textContent=settings.moonIndicator?`${lunar.name} · ${lunar.illumination}% lit. `:'';
  if(animation){if(performance.now()-animation>1040)animation=0;setTimeout(render,65);}
}
function pulse(){const enabled=settings.places.map((p,i)=>p.on?i:-1).filter(i=>i>=0);if(!enabled.length)return;activePlace=enabled[(enabled.indexOf(activePlace)+1)%enabled.length];if(settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches)animation=performance.now();render();}
$('pulse').onclick=pulse;$('guides').onchange=render;$('quick-view').onchange=render;
$('scale').onclick=()=>{const actual=$('scale').getAttribute('aria-pressed')!=='true';$('scale').setAttribute('aria-pressed',actual);$('scale').textContent=actual?'Enlarge preview':'Actual size';document.querySelector('.preview-stage').classList.toggle('actual',actual);};
$('scrub').oninput=()=>{offset=+$('scrub').value;render();};$('live').onclick=()=>{offset=0;$('scrub').value=0;render();};
function point(e){const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*200/b.width,(e.clientY-b.top)*228/b.height];}
canvas.onpointerdown=e=>{const [x,y]=point(e);const keys=['zone2','zone1','zone0','time','map'];const key=keys.find(k=>{if(k.startsWith('zone')&&!settings.places[+k.slice(-1)].on)return false;const [px,py]=getPosition(k),[w,h]=blockSize(settings,k);return x>=px&&x<px+w&&y>=py&&y<py+h;});if(!key)return;selected=key;const [px,py]=getPosition(key);drag={dx:x-px,dy:y-py};positionFields();canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!drag)return;const [x,y]=point(e);move(selected,[x-drag.dx,y-drag.dy]);$('guides').checked=true;positionFields();render();};
canvas.onpointerup=()=>{if(drag){drag=null;save();}};canvas.onpointercancel=()=>{drag=null;save();};
canvas.onkeydown=e=>{const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!deltas[e.key])return;e.preventDefault();const p=getPosition(selected),d=deltas[e.key],n=e.shiftKey?5:1;move(selected,[p[0]+d[0]*n,p[1]+d[1]*n]);$('guides').checked=true;positionFields();save();};
$('export').onclick=()=>{const data=validateSettings(settings,zoneExists);const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dymaxion-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Exported. Open Import settings in the watch’s phone configuration to use this file.');};
$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>50000)throw new Error('That file is too large for watch settings.');settings=validateSettings(JSON.parse(await file.text()),zoneExists);sync();save();notice('Composition imported.');}catch(e){notice(e.message,true);}$('import-file').value='';};
$('reset').onclick=()=>{settings=defaults();footerPage=settings.footer.home;offset=0;$('scrub').value=0;sync();save();};

sync();
function nextMinute(){setTimeout(()=>{if(!document.hidden)render();nextMinute();},60000-Date.now()%60000+1);}
try{const response=await fetch(`${import.meta.env.BASE_URL}maps/map-0.bin`);if(!response.ok)throw new Error('Map data could not be loaded.');mapPixels=new Uint8Array(await response.arrayBuffer());if(mapPixels.length!==MAP_SIZE[0]*MAP_SIZE[1]*4)throw new Error('Map data is incomplete.');const typeResponse=await fetch(`${import.meta.env.BASE_URL}type/proofs.json`);if(!typeResponse.ok)throw new Error('Watch typography could not be loaded.');const type=await typeResponse.json();watchTypeface=type.draft;watchSpan=type.span;render();nextMinute();}
catch(e){notice(e.message,true);}
