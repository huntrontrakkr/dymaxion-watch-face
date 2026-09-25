import {HOLIDAY_REGIONS} from './calendar.js';
import {paletteFor,PANEL_COLOR_ROLES,DEFAULT_PANEL_COLORS as LEGACY_COLORS} from './palette-settings.js';
export {PANEL_COLOR_ROLES} from './palette-settings.js';
export const PANEL_PAGES=[['zones','Time zones'],['weather','Weather'],['calendar','Two-week calendar'],['humidity','Humidity'],['tide','Tide'],['health','Health']];
export function panelColors(settings){
  return settings.footer.colorMode==='custom'?settings.footer.colors:paletteFor(settings).panelColors||LEGACY_COLORS;
}
export const TIDE_STATIONS=[
  ['8518750','The Battery, New York','BATTERY','America/New_York'],
  ['8443970','Boston, Massachusetts','BOSTON','America/New_York'],
  ['8658120','Wilmington, North Carolina','WILMNGT','America/New_York'],
  ['8724580','Key West, Florida','KEYWEST','America/New_York'],
  ['8771450','Galveston Pier 21, Texas','GALVSTN','America/Chicago'],
  ['9410170','San Diego, California','SANDIEG','America/Los_Angeles'],
  ['9414290','San Francisco, California','SFO BAY','America/Los_Angeles'],
  ['9447130','Seattle, Washington','SEATTLE','America/Los_Angeles'],
  ['9455920','Anchorage, Alaska','ANCHORG','America/Anchorage'],
  ['1612340','Honolulu, Hawaii','HONOLUL','Pacific/Honolulu'],
  ['9755371','San Juan, Puerto Rico','SANJUAN','America/Puerto_Rico']
].map(([id,name,label,tz])=>({id,name,label,tz}));
export function defaultFooter(){return {
  // Humidity and tide ride on the weather chart, so their own panels are optional,
  // outside the default rotation.
  flicks:2,enabled:true,pages:PANEL_PAGES.map(([id])=>id).filter(id=>id!=='humidity'&&id!=='tide'),home:'zones',rotationMinutes:0,shake:true,horizon:24,
  weather:{enabled:true,place:'current',temperatureUnit:'c',precipitation:'probability',rainUnit:'mm',rainMax:5,daylight:true,solarTimes:true,grid:false,rangeLabels:true,humidityLine:true,temperatureScale:'auto',temperatureMin:-10,temperatureMax:40,humidityScale:'percent',refreshMinutes:60},
  calendar:{weekStart:0,weeks:'current-next',weekends:'sat-sun',holidays:'none',todayStyle:'fill'},
  tide:{station:'',label:'TIDE',tz:'America/New_York',unit:'m',zeroLine:true,scale:'auto',min:-1,max:3},
  colorMode:'theme',colors:{...LEGACY_COLORS}
};}
export function validateFooter(input,zoneExists,quantize){
  const d=defaultFooter();if(input===undefined)return d;
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid bottom panel settings.');
  const f={...d,...input,weather:{...d.weather,...input.weather},calendar:{...d.calendar,...input.calendar},tide:{...d.tide,...input.tide},colors:{...d.colors,...input.colors}};
  const choice=(o,key,values)=>{if(!values.includes(o[key]))throw new Error('Invalid panel '+key+'.');};
  const bool=(o,key)=>{if(typeof o[key]!=='boolean')throw new Error('Invalid panel '+key+'.');};
  bool(f,'enabled');bool(f,'shake');choice(f,'flicks',[1,2,3]);
  if(!Array.isArray(f.pages)||!f.pages.length||f.pages.length>5||new Set(f.pages).size!==f.pages.length||f.pages.some(p=>!PANEL_PAGES.some(([id])=>id===p)))throw new Error('Choose one to five different bottom panels.');
  choice(f,'home',f.pages);choice(f,'rotationMinutes',[0,1,2,5,10,15,30,60]);choice(f,'horizon',[12,24,48]);
  const w=f.weather,c=f.calendar,t=f.tide;
  for(const k of ['enabled','daylight','solarTimes','grid','rangeLabels','humidityLine'])bool(w,k);
  choice(w,'place',['current',0,1,2]);choice(w,'temperatureUnit',['c','f']);choice(w,'precipitation',['off','probability','amount']);choice(w,'rainUnit',['mm','in']);
  choice(w,'temperatureScale',['auto','fixed']);choice(w,'humidityScale',['percent','auto']);choice(w,'refreshMinutes',[30,60,120,180]);
  if(!Number.isFinite(w.temperatureMin)||!Number.isFinite(w.temperatureMax)||w.temperatureMin< -150||w.temperatureMax>150||w.temperatureMax-w.temperatureMin<1)throw new Error('Temperature bounds need a minimum below the maximum, between −150 and 150.');
  if(!Number.isFinite(w.rainMax)||w.rainMax<.1||w.rainMax>100)throw new Error('Rain scale must be between 0.1 and 100 mm/hour.');
  choice(c,'weekStart',[0,1,6]);choice(c,'weeks',['current-next','previous-current']);choice(c,'weekends',['sat-sun','fri-sat','none']);choice(c,'holidays',HOLIDAY_REGIONS.map(([id])=>id));choice(c,'todayStyle',['fill','outline']);
  if(typeof t.station!=='string'||!/^([A-Z0-9]{7})?$/.test(t.station))throw new Error('Enter a seven-character NOAA tide station ID.');
  if(typeof t.label!=='string'||!/^[A-Z0-9 -]{1,7}$/.test(t.label))throw new Error('Tide labels need 1–7 uppercase letters or numbers.');
  if(typeof t.tz!=='string'||t.tz.length>80||!zoneExists(t.tz))throw new Error('Choose the tide station’s IANA time zone.');
  choice(t,'unit',['m','ft']);bool(t,'zeroLine');
  choice(t,'scale',['auto','fixed']);if(!Number.isFinite(t.min)||!Number.isFinite(t.max)||t.min< -100||t.max>100||t.max-t.min<.1)throw new Error('Tide scale needs increasing bounds between −100 and 100.');
  for(const k of Object.keys(d.colors))f.colors[k]=quantize(f.colors[k]);
  // Older exports had no mode. Preserve edited colors; let untouched defaults
  // follow the palette. Explicit custom mode stays custom even at default values.
  if(input.colorMode===undefined)f.colorMode=PANEL_COLOR_ROLES.some(k=>f.colors[k]!==d.colors[k])?'custom':'theme';
  choice(f,'colorMode',['theme','custom']);
  // Explicit fields keep old/unknown imported properties out of exported settings.
  return {enabled:f.enabled,pages:[...f.pages],home:f.home,rotationMinutes:f.rotationMinutes,shake:f.shake,flicks:f.flicks,horizon:f.horizon,
    weather:Object.fromEntries(Object.keys(d.weather).map(k=>[k,w[k]])),calendar:Object.fromEntries(Object.keys(d.calendar).map(k=>[k,c[k]])),
    tide:Object.fromEntries(Object.keys(d.tide).map(k=>[k,t[k]])),colorMode:f.colorMode,colors:Object.fromEntries(PANEL_COLOR_ROLES.map(k=>[k,f.colors[k]]))};
}
