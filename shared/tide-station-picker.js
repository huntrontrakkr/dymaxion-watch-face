import {TIDE_STATIONS} from './panel-settings.js';
import {NEARBY_TIDE_KM,tideStationLookup} from './tide-stations.js';
import {devicePosition} from '../tools/device-position.js';
import {citySearch} from './place-search.js';
// A tide label from a place name: up to seven capitals (tideStationDetails).
const tideLabel=name=>String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 -]/g,' ').replace(/\s+/g,' ').trim().slice(0,7).trim()||'TIDE';

// Setup previews the automatic choice. Explicit choices pin a fixed station;
// the phone companion keeps following location only in automatic mode.
// Anywhere else, a place chosen by search gets Open-Meteo's modelled tides.
export function tideStationPicker(root,{getTide,onSelect,onCustom,getPosition=devicePosition,lookup=tideStationLookup(),zoneExists=()=>true}){
  root.innerHTML=`<button type="button" data-nearby-tides>Find nearby NOAA stations</button><p class="micro" role="status" aria-live="polite" data-tide-status>The nearest station with hourly tides is suggested. You can pick a different one.</p><label class="field">Tide station<select data-station aria-label="Tide station"></select></label><div data-model-search hidden></div><p class="micro" data-tide-selected></p>`;
  const modelSearch=root.querySelector('[data-model-search]');
  citySearch(modelSearch,{label:'Search for a coastal place',zoneExists,onSelect:place=>{
    cancel();attempted=true;modelSearch.hidden=true;
    onSelect({station:'',point:{lat:place.lat,lon:place.lon},label:tideLabel(place.name),tz:place.tz,mode:'fixed'});refresh();
    message(`Modelled tides for ${place.name}, from Open-Meteo's sea-level forecast: good for the day's shape, not for navigation.`);
  }});
  const select=root.querySelector('[data-station]'),button=root.querySelector('[data-nearby-tides]'),status=root.querySelector('[data-tide-status]'),selected=root.querySelector('[data-tide-selected]');
  let nearby=[],known=new Map(),generation=0,signature='',attempted=false,busy=false,lastMode=getTide().mode;
  const fingerprint=()=>JSON.stringify([getTide().mode,getTide().station,getTide().point,getTide().label,getTide().tz]);
  const distance=s=>`${s.distanceKm<10?s.distanceKm.toFixed(1):Math.round(s.distanceKm)} km away`;
  function message(text){status.textContent=text;}
  function cancel(){generation++;busy=false;button.disabled=false;}
  function refresh(){
    const next=fingerprint();if(next!==signature){cancel();signature=next;}
    const tide=getTide();if(tide.mode!==lastMode){lastMode=tide.mode;attempted=false;}
    select.replaceChildren(new Option('Choose a station',''));
    if(nearby.length){
      const group=document.createElement('optgroup');group.label='Near your location';
      nearby.forEach((s,i)=>group.append(new Option(`${s.name} · ${distance(s)}${i===0?' · nearest':''}`,s.id)));select.append(group);
    }
    const presets=document.createElement('optgroup');presets.label='Coastal presets';
    TIDE_STATIONS.filter(s=>!nearby.some(n=>n.id===s.id)).forEach(s=>presets.append(new Option(s.name,s.id)));select.append(presets);
    if(tide.station&&!nearby.some(s=>s.id===tide.station)&&!TIDE_STATIONS.some(s=>s.id===tide.station))select.add(new Option(known.get(tide.station)?.name||'NOAA '+tide.station,tide.station));
    if(tide.point)select.add(new Option(`Modelled tides at ${tide.label}`,'point'));
    select.add(new Option('Anywhere: modelled tides (Open-Meteo)','model'));
    select.add(new Option('Custom NOAA harmonic station','custom'));select.value=tide.point?'point':tide.station;
    const found=nearby.find(s=>s.id===tide.station),name=known.get(tide.station)?.name||TIDE_STATIONS.find(s=>s.id===tide.station)?.name;
    if(tide.point){selected.textContent=[tide.mode==='auto'?'Automatic':'Fixed place','Modelled by Open-Meteo',tide.label,`${tide.point.lat.toFixed(2)}, ${tide.point.lon.toFixed(2)}`,tide.tz.replace(/_/g,' ')].join(' · ');button.disabled=busy;return;}
    selected.textContent=tide.station?[tide.mode==='auto'?'Automatic estimate':'Fixed station',name||'NOAA '+tide.station,tide.station,found?distance(found):'',tide.tz.replace(/_/g,' ')].filter(Boolean).join(' · '):'';
    button.disabled=busy;
  }
  async function choose(s,token,manual=false){
    const details=await lookup.resolve(s);
    if(token!==generation)return false;
    known.set(s.id,details);busy=false;
    onSelect({station:details.station,point:null,label:details.label,tz:details.tz,...(manual?{mode:'fixed'}:{})});refresh();
    return true;
  }
  async function find(){
    cancel();const token=generation,automatic=getTide().mode==='auto',fillDefault=automatic||!getTide().station;
    attempted=true;busy=true;button.disabled=true;message('Finding your location and nearby hourly tide stations…');
    try{
      const p=await getPosition();if(token!==generation)return;
      const found=await lookup.nearby({lat:p?.coords?.latitude,lon:p?.coords?.longitude});
      if(token!==generation)return;
      nearby=found;
      refresh();
      if(!nearby.length){if(automatic){onSelect({station:'',point:null,label:'TIDE'});refresh();}message(automatic?`No hourly NOAA station within ${NEARBY_TIDE_KM} km, so the watch will show Open-Meteo's modelled tides for where you are.`:`No hourly NOAA tide stations within ${NEARBY_TIDE_KM} km. Choose a coastal station, or modelled tides for any place.`);return;}
      if(fillDefault&&(automatic||!getTide().station)){
        if(await choose(nearby[0],token))message(automatic?'Nearest hourly station selected for this location. The watch will follow your phone as you travel. Choosing a different station fixes it in place.':'Nearest hourly station selected. Its label and time zone are filled in; choose another if it better matches your waterway.');
      }else message(`${nearby.length} nearby hourly stations found. Your saved station remains selected.`);
    }catch(error){
      if(token===generation)message(error?.message||'Nearby station lookup is unavailable. You can choose a station manually.');
    }finally{if(token===generation){busy=false;button.disabled=false;}}
  }
  select.onchange=async()=>{
    const value=select.value;cancel();attempted=true;
    modelSearch.hidden=value!=='model';
    if(value==='point')return;
    if(value==='model'){message('Search for a place on the coast. Its tides come from Open-Meteo\'s model.');modelSearch.querySelector('input').focus();return;}
    if(value==='custom'){onCustom();return;}
    if(!value){onSelect({station:'',point:null,mode:'fixed'});refresh();message('Choose a station or find nearby NOAA stations.');return;}
    const preset=TIDE_STATIONS.find(s=>s.id===value);
    if(preset){onSelect({station:preset.id,point:null,label:preset.label,tz:preset.tz,mode:'fixed'});refresh();message('Fixed station selected.');return;}
    const found=nearby.find(s=>s.id===value);if(!found)return;
    const token=generation;busy=true;button.disabled=true;message('Filling in this station’s time zone…');
    try{if(await choose(found,token,true))message('Fixed station selected. Its label and time zone are filled in.');}
    catch(error){if(token===generation){refresh();message(error?.message||'Station lookup failed.');}}
    finally{if(token===generation){busy=false;button.disabled=false;}}
  };
  button.onclick=find;
  refresh();
  return {refresh,suggest:()=>{if(!attempted&&(getTide().mode==='auto'||!getTide().station))find();}};
}
