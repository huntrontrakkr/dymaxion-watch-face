import moment from 'moment-timezone';
import {defaults,validateSettings} from '../shared/settings.js';
import {encodeSettings,zoneExists} from '../shared/protocol.js';
import {encodeFooter,encodeEnvironment} from '../shared/panel-protocol.js';
import {environmentService} from './environment-service.js';
import {locationService} from './location-service.js';
import {devicePosition} from './device-position.js';
import {encodeCity} from '../shared/city.js';
import {encodeDisplay} from '../shared/display.js';
import {encodePalette} from '../shared/palette-protocol.js';
import {encodeGlyphs} from '../shared/glyph-protocol.js';
import {encodeLanguage,resolveLanguage} from '../shared/watch-text.js';
import {watchSync} from './watch-sync.js';
import html from './mobile-config.generated.html';
const STORAGE='dymaxion-settings-v1';
let settings=defaults();
try{const saved=localStorage.getItem(STORAGE);if(saved)settings=validateSettings(JSON.parse(saved),zoneExists);}catch(e){console.log('Using default composition: '+e.message);}
const transport=watchSync({send:(message,ok,fail)=>Pebble.sendAppMessage(message,ok,fail)});
const enqueue=(kind,message)=>transport.enqueue(kind,message);
const environment=environmentService({getSettings:()=>settings,storage:localStorage,send:(kind,data)=>enqueue(kind,{[kind.toUpperCase()]:Array.from(encodeEnvironment(data,kind))})});
const location=locationService({getSettings:()=>settings,storage:localStorage,send:city=>enqueue('city',{CITY:Array.from(encodeCity(city))})});
// The face's language: the chosen one, or the phone's (as the settings page
// last saw it, else this runtime's own).
function faceLanguage(){const own=typeof navigator!=='undefined'&&navigator.language||'';return resolveLanguage(settings.language,[settings.deviceLanguage,own]);}
function sync(full=false){if(full)transport.forgetAcknowledged();enqueue('settings',{SETTINGS:Array.from(encodeSettings(settings)),FOOTER:Array.from(encodeFooter(settings)),DISPLAY:Array.from(encodeDisplay(settings)),PALETTE:Array.from(encodePalette(settings)),GLYPHS:Array.from(encodeGlyphs(settings)),LANGUAGE:Array.from(encodeLanguage(faceLanguage()))});environment.refresh();location.refresh();}
Pebble.addEventListener('ready',()=>sync(true));
// REQUEST=2 is a routine update. Older watches, launch and reconnect request
// full state with 1; unknown requests also safely receive a full sync.
Pebble.addEventListener('appmessage',event=>sync((event?.payload?.REQUEST??event?.payload?.[10001])!==2));
Pebble.addEventListener('showConfiguration',async()=>{
  let city=null;
  try{const cached=JSON.parse(localStorage.getItem('dymaxion-current-city-v1')||'null');if(cached&&Number.isFinite(cached.lat)&&Number.isFinite(cached.lon))city={name:cached.name,lat:cached.lat,lon:cached.lon};}catch{}
  // Data-URL configuration pages cannot reliably request location themselves.
  // Reuse the phone's low-power fix, also shared by weather and city naming.
  let position=null;
  try{const p=await devicePosition();position={lat:+p.coords.latitude.toFixed(3),lon:+p.coords.longitude.toFixed(3),fetched:Date.now()};}catch{}
  const config=JSON.stringify({settings,zoneNames:moment.tz.names(),city,position}).replace(/</g,'\\u003c');
  Pebble.openURL('data:text/html;charset=utf-8,'+encodeURIComponent(html.replace('__CONFIG__',()=>config)));
});
Pebble.addEventListener('webviewclosed',event=>{
  if(!event||!event.response||event.response==='CANCELLED')return;
  try{
    const raw=event.response[0]==='{'?event.response:decodeURIComponent(event.response);
    settings=validateSettings(JSON.parse(raw),zoneExists);
    localStorage.setItem(STORAGE,JSON.stringify(settings));sync();
  }catch(e){console.log('Settings were not applied: '+e.message);}
});
