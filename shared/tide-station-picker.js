import {TIDE_STATIONS} from './panel-settings.js';
import {NEARBY_TIDE_KM,tideStationLookup} from './tide-stations.js';
import {devicePosition} from '../tools/device-position.js';

// A setup suggestion, saved as an ordinary fixed station. Travelling never
// silently swaps the waterway behind an existing tide chart.
export function tideStationPicker(root,{getTide,onSelect,onCustom,getPosition=devicePosition,lookup=tideStationLookup()}){
  root.innerHTML=`<button type="button" data-nearby-tides>Find nearby NOAA stations</button><p class="micro" role="status" aria-live="polite" data-tide-status>The nearest station with hourly tides is suggested. You can pick a different one.</p><label class="field">Tide station<select data-station aria-label="Tide station"></select></label><p class="micro" data-tide-selected></p>`;
  const select=root.querySelector('[data-station]'),button=root.querySelector('[data-nearby-tides]'),status=root.querySelector('[data-tide-status]'),selected=root.querySelector('[data-tide-selected]');
  let nearby=[],known=new Map(),generation=0,signature='',attempted=false,busy=false;
  const fingerprint=()=>JSON.stringify([getTide().station,getTide().label,getTide().tz]);
  const distance=s=>`${s.distanceKm<10?s.distanceKm.toFixed(1):Math.round(s.distanceKm)} km away`;
  function message(text){status.textContent=text;}
  function cancel(){generation++;busy=false;button.disabled=false;}
  function refresh(){
    const next=fingerprint();if(next!==signature){cancel();signature=next;}
    const tide=getTide();select.replaceChildren(new Option('Choose a station',''));
    if(nearby.length){
      const group=document.createElement('optgroup');group.label='Near your location';
      nearby.forEach((s,i)=>group.append(new Option(`${s.name} · ${distance(s)}${i===0?' · nearest':''}`,s.id)));select.append(group);
    }
    const presets=document.createElement('optgroup');presets.label='Coastal presets';
    TIDE_STATIONS.filter(s=>!nearby.some(n=>n.id===s.id)).forEach(s=>presets.append(new Option(s.name,s.id)));select.append(presets);
    if(tide.station&&!nearby.some(s=>s.id===tide.station)&&!TIDE_STATIONS.some(s=>s.id===tide.station))select.add(new Option(known.get(tide.station)?.name||'NOAA '+tide.station,tide.station));
    select.add(new Option('Custom NOAA harmonic station','custom'));select.value=tide.station;
    const found=nearby.find(s=>s.id===tide.station),name=known.get(tide.station)?.name||TIDE_STATIONS.find(s=>s.id===tide.station)?.name;
    selected.textContent=tide.station?[name||'NOAA '+tide.station,tide.station,found?distance(found):'',tide.tz.replace(/_/g,' ')].filter(Boolean).join(' · '):'';
    button.disabled=busy;
  }
  async function choose(s,token){
    const details=await lookup.resolve(s);
    if(token!==generation)return false;
    known.set(s.id,details);busy=false;
    onSelect({station:details.station,label:details.label,tz:details.tz});refresh();
    return true;
  }
  async function find(){
    cancel();const token=generation,fillDefault=!getTide().station;
    attempted=true;busy=true;button.disabled=true;message('Finding your location and nearby hourly tide stations…');
    try{
      const p=await getPosition();if(token!==generation)return;
      const found=await lookup.nearby({lat:p?.coords?.latitude,lon:p?.coords?.longitude});
      if(token!==generation)return;
      nearby=found;
      refresh();
      if(!nearby.length){message(`No hourly NOAA tide stations within ${NEARBY_TIDE_KM} km. Choose a coastal station manually.`);return;}
      if(fillDefault&&!getTide().station){
        if(await choose(nearby[0],token))message('Nearest hourly station selected. Its label and time zone are filled in; choose another if it better matches your waterway.');
      }else message(`${nearby.length} nearby hourly stations found. Your saved station remains selected.`);
    }catch(error){
      if(token===generation)message(error?.message||'Nearby station lookup is unavailable. You can choose a station manually.');
    }finally{if(token===generation){busy=false;button.disabled=false;}}
  }
  select.onchange=async()=>{
    const value=select.value;cancel();attempted=true;
    if(value==='custom'){onCustom();return;}
    if(!value){onSelect({station:''});refresh();message('Choose a station or find nearby NOAA stations.');return;}
    const preset=TIDE_STATIONS.find(s=>s.id===value);
    if(preset){onSelect({station:preset.id,label:preset.label,tz:preset.tz});refresh();message('Station selected.');return;}
    const found=nearby.find(s=>s.id===value);if(!found)return;
    const token=generation;busy=true;button.disabled=true;message('Filling in this station’s time zone…');
    try{if(await choose(found,token))message('Station selected. Its label and time zone are filled in.');}
    catch(error){if(token===generation){refresh();message(error?.message||'Station lookup failed.');}}
    finally{if(token===generation){busy=false;button.disabled=false;}}
  };
  button.onclick=find;
  refresh();
  return {refresh,suggest:()=>{if(!attempted&&!getTide().station)find();}};
}
