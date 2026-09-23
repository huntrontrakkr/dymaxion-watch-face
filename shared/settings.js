import {MAP_SIZE} from './map.js';
import {MARKERS,LEGACY_MARKER_IDS} from './markers.js';
import {defaultFooter,validateFooter} from './panel-settings.js';
import {validateLocation} from './city.js';
import {DISPLAY_STYLES} from './triangle-display.js';
import {THEMES} from './palettes.js';
import {paletteFor,validatePalettes} from './palette-settings.js';
export {THEMES,MOON_COLORS} from './palettes.js';
export function quantizeColor(value){
  if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw new Error('Choose a six-digit color.');
  return '#'+[1,3,5].map(i=>Math.round(parseInt(value.slice(i,i+2),16)/85)*85)
    .map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join('');
}
export function pebbleColor(value){
  const color=quantizeColor(value);
  return 0xc0|[1,3,5].reduce((bits,i,j)=>bits|(parseInt(color.slice(i,i+2),16)/85)<<(4-2*j),0);
}
export function markColor(place,settings,index){return place.color??paletteFor(settings).marks[index];}
export const PLACES = [
  ['NYC','New York','America/New_York',40.7128,-74.006],['LON','London','Europe/London',51.5074,-.1278],
  ['TYO','Tokyo','Asia/Tokyo',35.6762,139.6503],['LAX','Los Angeles','America/Los_Angeles',34.0522,-118.2437],
  ['PAR','Paris','Europe/Paris',48.8566,2.3522],['BER','Berlin','Europe/Berlin',52.52,13.405],
  ['IST','Istanbul','Europe/Istanbul',41.0082,28.9784],['DXB','Dubai','Asia/Dubai',25.2048,55.2708],
  ['DEL','Delhi','Asia/Kolkata',28.6139,77.209],['KTM','Kathmandu','Asia/Kathmandu',27.7172,85.324],
  ['SIN','Singapore','Asia/Singapore',1.3521,103.8198],['SYD','Sydney','Australia/Sydney',-33.8688,151.2093],
  ['AKL','Auckland','Pacific/Auckland',-36.8509,174.7645],['RIO','Rio de Janeiro','America/Sao_Paulo',-22.9068,-43.1729],
  ['HNL','Honolulu','Pacific/Honolulu',21.3099,-157.8581],['CPT','Cape Town','Africa/Johannesburg',-33.9249,18.4241],
  ['CAI','Cairo','Africa/Cairo',30.0444,31.2357],['NBO','Nairobi','Africa/Nairobi',-1.2921,36.8219],
  ['CHI','Chicago','America/Chicago',41.8781,-87.6298],['SFO','San Francisco','America/Los_Angeles',37.7749,-122.4194],
  ['UTC','Greenwich','Etc/UTC',51.4769,0]
].map(([label,name,tz,lat,lon])=>({label,name,tz,lat,lon}));
export const PRESETS = {
  // Meridian: a status line replaces the nameplate; the figures sit small over the map.
  meridian:{orientation:0,stacked:false,statusLine:true,time:[0,22],map:[0,73],zones:[[4,189],[70,189],[136,189]]},
  atlas:{orientation:0,stacked:false,statusLine:false,time:[0,20],map:[0,73],zones:[[4,189],[70,189],[136,189]]},
  horizon:{orientation:0,stacked:false,statusLine:false,time:[0,134],map:[0,24],zones:[[4,189],[70,189],[136,189]]}
};
export const PRESET_KEYS = ['orientation','stacked','statusLine','time','map','zones'];
export function presetFor(name){return JSON.parse(JSON.stringify(PRESETS[name]));}
export function activePreset(settings){
  return Object.keys(PRESETS).find(name=>{const p=presetFor(name,settings.clockDisplay);return PRESET_KEYS.every(k=>JSON.stringify(settings[k])===JSON.stringify(p[k]));})??null;
}
// Changing the numerals keeps a preset composition intact rather than clipping it.
export function withClockDisplay(settings,clockDisplay,segmentGrid=settings.segmentGrid){
  const preset=activePreset(settings),next={...settings,clockDisplay,segmentGrid};
  if(preset)Object.assign(next,presetFor(preset,clockDisplay));
  next.time=clampPosition(next,'time',next.time);
  return next;
}
const LEGACY_PRESETS=[{
  atlas:{orientation:0,stacked:false,time:[28,20],map:[0,73],zones:[[4,189],[70,189],[136,189]]},
  horizon:{orientation:0,stacked:false,time:[28,134],map:[0,24],zones:[[4,189],[70,189],[136,189]]}
},{
  atlas:{orientation:0,stacked:false,time:[20,18],map:[4,73],zones:[[4,189],[70,189],[136,189]]},
  horizon:{orientation:0,stacked:false,time:[20,132],map:[4,19],zones:[[4,189],[70,189],[136,189]]}
}];
export function defaults() {
  return {version:1,markerSet:2,theme:0,customPalettes:[],customPalette:null,format:1,dayNight:true,edges:false,lights:true,motion:true,sun:true,moonIndicator:true,
    ...JSON.parse(JSON.stringify(PRESETS.meridian)),clockDisplay:'chamfer',segmentGrid:true,location:validateLocation(),footer:defaultFooter(),places:PLACES.slice(0,3).map((p,i)=>({...p,on:true,icon:i===0?1:i===1?2:0,color:null}))};
}
export function blockSize(settings,key) {
  if(key==='map')return MAP_SIZE;
  if(key==='time'){
    if(settings.stacked)return [72,84];
    // Chamfer: a 40-pixel figure strip, plus the caption when there is no status line.
    if(settings.clockDisplay==='chamfer')return [200,settings.statusLine?40:52];
    return [200,46];
  }
  return [60,36];
}
export function clampPosition(settings,key,pos) {
  const [w,h]=blockSize(settings,key);
  return [Math.max(0,Math.min(200-w,Math.round(pos[0]))),Math.max(key==='map'?0:16,Math.min(228-h,Math.round(pos[1])))];
}
export function validateSettings(input,zoneExists) {
  if(!input||input.version!==1)throw new Error('Choose a Dymaxion version 1 settings file.');
  if(input.markerSet!==undefined&&input.markerSet!==1&&input.markerSet!==2)throw new Error('Unknown map glyph set.');
  const legacyMarkers=input.markerSet!==2;
  // Previously saved vertical arrangements return to the Atlas composition.
  // Keep the user's palette, places, clock format and display preferences.
  if(input.orientation===1)input={...input,...PRESETS.atlas};
  // Migrate only exact old presets; custom positions are merely constrained.
  const preset=LEGACY_PRESETS.flatMap(group=>Object.entries(group)).find(([,p])=>Object.keys(p).every(k=>JSON.stringify(input[k])===JSON.stringify(p[k])));
  if(preset)input={...input,...PRESETS[preset[0]]};
  const out=defaults();
  Object.assign(out,validatePalettes(input,quantizeColor));
  for(const [key,max] of [['theme',THEMES.length-1],['format',2],['orientation',0]]) {
    if(!Number.isInteger(input[key])||input[key]<0||input[key]>max)throw new Error('Invalid '+key+'.');
    out[key]=input[key];
  }
  for(const key of ['dayNight','edges','lights','motion','sun','stacked']) {
    if(typeof input[key]!=='boolean')throw new Error('Invalid '+key+'.');out[key]=input[key];
  }
  if(input.moonIndicator!==undefined&&typeof input.moonIndicator!=='boolean')throw new Error('Invalid moon indicator.');
  if(input.statusLine!==undefined&&typeof input.statusLine!=='boolean')throw new Error('Invalid status line.');
  out.statusLine=input.statusLine??false;
  out.moonIndicator=input.moonIndicator??true;
  out.footer=validateFooter(input.footer,zoneExists,quantizeColor);
  out.location=validateLocation(input.location);
  // Retired LCD/framing experiments return to the open broad clock. Keep all
  // other preferences, and leave the legacy framing object out of the result.
  const clockDisplay=input.clockDisplay==='lcd'?'broad':input.clockDisplay;
  if(clockDisplay!==undefined&&!DISPLAY_STYLES.includes(clockDisplay))throw new Error('Unknown clock display.');
  if(input.segmentGrid!==undefined&&typeof input.segmentGrid!=='boolean')throw new Error('Invalid segment grid.');
  out.clockDisplay=clockDisplay??'broad';out.segmentGrid=input.segmentGrid??true;
  const position=(key,pos)=>{
    if(!Array.isArray(pos)||pos.length!==2||!pos.every(Number.isFinite))throw new Error('Invalid position.');
    return clampPosition(out,key,pos);
  };
  out.time=position('time',input.time);out.map=position('map',input.map);
  if(!Array.isArray(input.zones)||input.zones.length!==3||!Array.isArray(input.places)||input.places.length!==3)throw new Error('Three place slots are required.');
  out.zones=input.zones.map(p=>position('zone',p));
  out.places=input.places.map(p=>{
    if(!p||typeof p.label!=='string'||!/^[A-Z0-9 +-]{1,7}$/.test(p.label))throw new Error('Place labels need 1–7 uppercase letters, numbers, spaces, + or -.');
    if(typeof p.tz!=='string'||p.tz.length>80||!zoneExists(p.tz))throw new Error('Unknown IANA time zone: '+String(p.tz));
    if(!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lon)||Math.abs(p.lon)>180)throw new Error('Coordinates must be latitude ±90 and longitude ±180.');
    const icon=legacyMarkers?LEGACY_MARKER_IDS[p.icon]:p.icon;
    if(!Number.isInteger(p.icon)||!Number.isInteger(icon)||icon<0||icon>=MARKERS.length||typeof p.on!=='boolean')throw new Error('Invalid place marker.');
    const color=p.color==null?null:quantizeColor(p.color);
    return {label:p.label,name:typeof p.name==='string'?p.name.slice(0,60):p.label,tz:p.tz,lat:p.lat,lon:p.lon,icon,color,on:p.on};
  });
  return out;
}
