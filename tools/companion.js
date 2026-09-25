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
import html from './mobile-config.generated.html';
const STORAGE='dymaxion-settings-v1';
let settings=defaults();
try{const saved=localStorage.getItem(STORAGE);if(saved)settings=validateSettings(JSON.parse(saved),zoneExists);}catch(e){console.log('Using default composition: '+e.message);}
let sending=false;const queue=[];
function enqueue(kind,message){const pending=queue.find(item=>item.kind===kind);if(pending){pending.message=message;pending.retries=0;}else queue.push({kind,message,retries:0});flush();}
const environment=environmentService({getSettings:()=>settings,storage:localStorage,send:(kind,data)=>enqueue(kind,{[kind.toUpperCase()]:Array.from(encodeEnvironment(data,kind))})});
const location=locationService({getSettings:()=>settings,storage:localStorage,send:city=>enqueue('city',{CITY:Array.from(encodeCity(city))})});
function sync(){enqueue('settings',{SETTINGS:Array.from(encodeSettings(settings)),FOOTER:Array.from(encodeFooter(settings)),DISPLAY:Array.from(encodeDisplay(settings)),PALETTE:Array.from(encodePalette(settings))});environment.refresh();location.refresh();}
function flush(){
  if(sending||!queue.length)return;
  const item=queue.shift();sending=true;
  Pebble.sendAppMessage(item.message,()=>{sending=false;flush();},()=>{sending=false;if(item.retries++<3){if(!queue.some(next=>next.kind===item.kind))queue.unshift(item);setTimeout(flush,1000*item.retries);}else{console.log('Watch sync deferred until the next connection.');flush();}});
}
Pebble.addEventListener('ready',sync);
Pebble.addEventListener('appmessage',sync);
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
