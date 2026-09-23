export function cityControls(root,getSettings,onChange,onLocate){
  root.innerHTML='<label class="field">Clock location<select data-city-mode aria-label="Clock location"><option value="auto">Current city from phone</option><option value="manual">Enter a city name</option></select></label><label class="field" data-city-label>City name<input data-city-name aria-label="Clock city name" maxlength="80" placeholder="Norfolk"></label><p class="micro">Automatic mode uses the phone’s location, refreshed at most once an hour. A manual name needs no location access. The main clock always follows the watch’s time.</p><p class="micro">City lookup: <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.</p><p data-city-error class="notice error" role="alert"></p>';
  const mode=root.querySelector('[data-city-mode]'),name=root.querySelector('[data-city-name]'),error=root.querySelector('[data-city-error]');
  function commit(){try{onChange({mode:mode.value,name:name.value});error.textContent='';refresh();}catch(e){error.textContent=e.message;}}
  mode.onchange=commit;name.onchange=commit;
  if(onLocate){const button=document.createElement('button');button.type='button';button.textContent='Preview my current city';button.dataset.locate='';button.onclick=async()=>{button.disabled=true;try{await onLocate();}finally{refresh();}};root.append(button);}
  function refresh(){const value=getSettings().location;mode.value=value.mode;name.value=value.name;root.querySelector('[data-city-label]').hidden=value.mode==='auto';const button=root.querySelector('[data-locate]');if(button)button.disabled=value.mode!=='auto';}
  refresh();return {refresh};
}
