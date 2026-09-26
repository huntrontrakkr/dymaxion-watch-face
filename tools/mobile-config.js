import {defaults,PLACES,THEMES,PRESETS,presetFor,withClockDisplay,validateSettings,blockSize,clampPosition,markColor,quantizeColor} from '../shared/settings.js';
import {MARKERS} from '../shared/markers.js';
import {panelControls} from '../shared/panel-controls.js';
import {cityControls} from '../shared/city-controls.js';
import {displayControls} from '../shared/display-controls.js';
import {powerControls} from '../shared/power-controls.js';
import {paletteControls} from '../shared/palette-controls.js';
import {paletteFor} from '../shared/palette-settings.js';
import {citySearch} from '../shared/place-search.js';
import {renderConfigPreview} from './config-preview.js';
import {PANEL_PAGES} from '../shared/panel-settings.js';
import {quoteOfTheDay} from '../shared/fuller-quotes.js';
import {installWatchColorPicker} from '../shared/color-picker.js';
import {colorView,setColorView,onColorViewChange,watchViewOverlay} from '../shared/watch-view.js';
installWatchColorPicker();
const $=id=>document.getElementById(id),data=window.DYMAXION_CONFIG;
{const q=quoteOfTheDay();$('fuller-quote').textContent=q.text;$('fuller-source').textContent=q.source;}
const exists=zone=>data.zoneNames.indexOf(zone)>=0;
let s=validateSettings(data.settings||defaults(),exists);
let searches=[],previewPage=s.footer.home,evening=false,previewFrame=0;
function preview(){
  cancelAnimationFrame(previewFrame);
  previewFrame=requestAnimationFrame(()=>{
    if(!s.footer.pages.includes(previewPage))previewPage=s.footer.home;
    try{renderConfigPreview($('watch-preview'),s,{evening,page:previewPage,city:data.city});$('preview-error').textContent='';}
    catch{$('preview-error').textContent='Preview unavailable. Your settings can still be saved.';}
    $('preview-palette').textContent=paletteFor(s).name;
    $('preview-caption').textContent=(s.footer.enabled?PANEL_PAGES.find(([id])=>id===previewPage)[1]:'World clocks')+' · Sample readings';
    $('preview-next').disabled=!s.footer.enabled||s.footer.pages.length<2;
  });
}
function changed(){preview();$('save-status').textContent='Changes ready to save';}
const panelEditor=panelControls($('panel-controls'),()=>s,footer=>{const before=s.footer.home;s.footer=validateSettings({...s,footer},exists).footer;if(before!==s.footer.home)previewPage=s.footer.home;changed();},{getPosition:async()=>{
  const p=data.position,age=Date.now()-p?.fetched;
  if(!p||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lon)||Math.abs(p.lon)>180||!(age>=0&&age<15*60000))throw new Error('Phone location unavailable. Enable location for Pebble, then reopen settings. You can also choose a station manually.');
  return {coords:{latitude:p.lat,longitude:p.lon}};
}});
const cityEditor=cityControls($('city-controls'),()=>s,location=>{s.location=validateSettings({...s,location},exists).location;changed();});
const displayEditor=displayControls($('display-controls'),()=>s,value=>{s={...withClockDisplay(s,value.clockDisplay),leadingZero:value.leadingZero,zoneTimes:value.zoneTimes,zonePosition:value.zonePosition,mapTimesTurn:value.mapTimesTurn,mapTimeSize:value.mapTimeSize,zoneTimesTall:value.zoneTimesTall,placeIcons:value.placeIcons,nameplate:value.nameplate};refresh();});
for(const selector of ['[data-zone-times]','[data-zone-position]','[data-map-turn]'])$('place-clock-options').append($('display-controls').querySelector(selector).closest('label'));
$('place-clock-options').append($('display-controls').querySelector('[data-zone-note]'));
const powerEditor=powerControls($('power-controls'),()=>s,power=>{s=validateSettings({...s,power},exists);refresh();});
const paletteEditor=paletteControls($('palette-controls'),()=>s,patch=>{s=validateSettings({...s,...patch},exists);refresh();});
function options(select,entries){select.replaceChildren();entries.forEach(([label,value])=>select.add(new Option(label,value)));}
for(const [key,title] of [['moonIndicator','Moon in top bar'],['dayNight','Day and night'],['lights','City lights'],['sun','Sun on the map'],['edges','Triangle edges']]){
  const label=document.createElement('label');label.className='toggle';const span=document.createElement('span');span.textContent=title;const input=document.createElement('input');input.type='checkbox';input.id=key;label.append(span,input);$('switches').append(label);
}
function swatches(root,p){root.replaceChildren();for(const color of [p.bg,p.ocean,p.land,p.nightOcean,p.nightLand,p.ink]){const i=document.createElement('i');i.style.background=color;root.append(i);}}
function paletteChoices(){
  const palette=paletteFor(s);$('palette-name').textContent=palette.name;swatches($('palette-swatches'),palette);
  $('palette-options').replaceChildren();THEMES.forEach((p,i)=>{
    if(p.hidden&&i!==s.theme)return;
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',p.name);button.setAttribute('aria-pressed',String(s.customPalette===null&&s.theme===i));
    const colors=document.createElement('span');colors.className='palette-swatches';colors.setAttribute('aria-hidden','true');swatches(colors,p);
    const name=document.createElement('span');name.textContent=p.name;button.append(colors,name);
    button.onclick=()=>{s.theme=i;s.customPalette=null;$('palette-picker').open=false;refresh();$('palette-picker').querySelector('summary').focus();};$('palette-options').append(button);
  });
}
function refresh(){
  options($('theme'),THEMES.flatMap((t,i)=>!t.hidden||i===s.theme?[[t.name,i]]:[]));
  panelEditor.refresh();
  cityEditor.refresh();
  displayEditor.refresh();
  powerEditor.refresh();
  paletteEditor.refresh();
  paletteChoices();
  $('theme').value=s.theme;$('format').value=s.format;$('connectionBuzz').value=s.connectionBuzz;$('mapBackground').value=s.mapBackground;
  for(const k of ['moonIndicator','dayNight','lights','sun','edges','motion'])$(k).checked=s[k];
  const openPlaces=[...$('places').querySelectorAll('details')].map(d=>d.open);
  searches.forEach(search=>search.destroy());searches=[];$('places').replaceChildren();
  s.places.forEach((p,i)=>{
    const set=document.createElement('fieldset');set.className='place-card';set.innerHTML=`<legend>PLACE 0${i+1}</legend><label class="toggle"><span>Show this place</span><input type="checkbox" data-key="on" aria-label="Enable place ${i+1}"></label><div data-search></div><label>Saved city<select data-city aria-label="City for place ${i+1}"></select></label><div class="place-selected"><strong data-name></strong><span data-zone></span></div><div class="pair"><label>Short label<input data-key="label" aria-label="Label for place ${i+1}" maxlength="7" pattern="[A-Z0-9 +\\-]{1,7}" required></label><label>Map glyph<select data-key="icon" aria-label="Symbol for place ${i+1}"></select></label></div><div class="symbol-preview"><canvas data-symbol-preview width="9" height="9" aria-hidden="true"></canvas><small data-symbol-meaning></small></div><div class="marker-color-row"><label>Marker color<input type="color" data-color aria-label="Color for place ${i+1}"></label><button type="button" class="quiet" data-reset-color>Use theme color</button></div><small data-color-label></small><details><summary>Advanced: coordinates & time zone</summary><p class="micro">Filled in when you choose a city. Edit these only for a custom point on the map.</p><label>IANA time zone<input data-key="tz" aria-label="Time zone for place ${i+1}" required></label><div class="xy"><label>Latitude<input data-key="lat" aria-label="Latitude for place ${i+1}" type="number" step="any" min="-90" max="90" required></label><label>Longitude<input data-key="lon" aria-label="Longitude for place ${i+1}" type="number" step="any" min="-180" max="180" required></label></div></details>`;
    set.querySelector('details').open=!!openPlaces[i];
    const city=set.querySelector('[data-city]');options(city,[...PLACES.map((p,n)=>[p.name+' · '+p.label,n]),['Custom / searched city','custom']]);
    options(set.querySelector('[data-key=icon]'),MARKERS.map((mark,n)=>[mark.name,n]));
    const n=PLACES.findIndex(z=>z.tz===p.tz&&z.lat===p.lat&&z.lon===p.lon);city.value=n<0?'custom':n;
    set.querySelector('[data-name]').textContent=p.name;set.querySelector('[data-zone]').textContent=(p.region?p.region+' · ':'')+p.tz.replace(/_/g,' ')+' · '+p.label;
    const selectPlace=place=>{s.places[i]={...place,on:p.on,icon:p.icon,color:p.color};refresh();panelEditor.refresh();};
    searches.push(citySearch(set.querySelector('[data-search]'),{label:`Search city for place ${i+1}`,zoneExists:exists,near:()=>data.city,onSelect:selectPlace}));
    const updateSymbol=()=>{const g=set.querySelector('[data-symbol-preview]').getContext('2d');g.fillStyle=paletteFor(s).bg;g.fillRect(0,0,9,9);g.fillStyle=markColor(p,s,i);MARKERS[p.icon].rows.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='#')g.fillRect(x+2,y+2,1,1);}));set.querySelector('[data-symbol-meaning]').textContent=MARKERS[p.icon].meaning;};
    set.querySelectorAll('[data-key]').forEach(input=>{const k=input.dataset.key;if(k==='on')input.checked=p[k];else input.value=p[k];input.oninput=()=>input.setCustomValidity('');input.onchange=()=>{if(input.type==='number'&&!input.validity.valid)return;const value=k==='on'?input.checked:['icon','lat','lon'].includes(k)?Number(input.value):k==='label'?input.value.trim().toUpperCase():input.value.trim();if(k!=='on')input.value=value;if(!input.validity.valid)return;if(k==='tz'&&!exists(value)){input.setCustomValidity('Choose a valid time zone, or use city search.');return;}p[k]=value;if(k==='icon')updateSymbol();if(['tz','lat','lon'].includes(k))city.value='custom';set.querySelector('[data-zone]').textContent=(p.region?p.region+' · ':'')+p.tz.replace(/_/g,' ')+' · '+p.label;changed();};});
    const color=set.querySelector('[data-color]'),updateColor=()=>{color.value=markColor(p,s,i);set.querySelector('[data-color-label]').textContent=`${color.value.toUpperCase()} · ${p.color?'custom':'theme default'} · Pebble RGB222`;set.querySelector('[data-reset-color]').disabled=p.color===null;updateSymbol();};
    color.onchange=()=>{p.color=quantizeColor(color.value);updateColor();changed();};set.querySelector('[data-reset-color]').onclick=()=>{p.color=null;updateColor();changed();};updateColor();
    city.onchange=()=>{if(city.value==='custom'){set.querySelector('details').open=true;return;}selectPlace(PLACES[+city.value]);};$('places').append(set);
  });
  $('positions').replaceChildren();
  for(const [key,label]of [['time','Local time'],['map','Map'],['zone0','Place 1'],['zone1','Place 2'],['zone2','Place 3']]){
    const row=document.createElement('div');row.className='xy';const pos=key.startsWith('zone')?s.zones[+key.slice(-1)]:s[key],size=blockSize(s,key);
    ['X','Y'].forEach((axis,j)=>{const labelEl=document.createElement('label');labelEl.textContent=label+' '+axis;const input=document.createElement('input');input.type='number';input.value=pos[j];input.min=j&&key!=='map'?16:0;input.max=(j?228:200)-size[j];input.required=true;input.onchange=()=>{pos[j]=Number(input.value);changed();};labelEl.append(input);row.append(labelEl);});$('positions').append(row);
  }
  preview();
}
$('preset').onchange=()=>{const preset=$('preset').value;if(preset!=='custom')Object.assign(s,presetFor(preset,s.clockDisplay));refresh();};
$('connectionBuzz').onchange=()=>{s.connectionBuzz=$('connectionBuzz').value;};
$('mapBackground').onchange=()=>{s.mapBackground=$('mapBackground').value;changed();};
for(const key of ['theme','format'])$(key).onchange=()=>{s[key]=Number($(key).value);if(key==='theme'){s.customPalette=null;refresh();}changed();};
for(const key of ['moonIndicator','dayNight','lights','sun','edges','motion'])$(key).onchange=()=>{s[key]=$(key).checked;powerEditor.refresh();changed();};
function importText(text){try{s=validateSettings(JSON.parse(text),exists);$('error').textContent='Composition loaded.';$('preset').value='custom';refresh();}catch(e){$('error').textContent=e.message;}}
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;if(file.size>50000){$('error').textContent='Settings file is too large.';return;}importText(await file.text());};
$('import').onclick=()=>importText($('json').value);
$('config').addEventListener('invalid',event=>{for(let node=event.target.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;},true);
$('config').onsubmit=e=>{e.preventDefault();try{s=validateSettings(s,exists);location.href='pebblejs://close#'+encodeURIComponent(JSON.stringify(s));}catch(e){$('error').textContent=e.message;}};
$('preview-next').onclick=()=>{const pages=s.footer.pages;previewPage=pages[(pages.indexOf(previewPage)+1)%pages.length];preview();};
// Screen colors or as on the watch: shared with the color picker.
watchViewOverlay($('watch-preview'));
const showWatchView=()=>$('preview-watch-colors').setAttribute('aria-pressed',String(colorView()==='watch'));
$('preview-watch-colors').onclick=()=>setColorView(colorView()==='watch'?'screen':'watch');onColorViewChange(showWatchView);showWatchView();
for(const [id,value]of [['preview-day',false],['preview-night',true]])$(id).onclick=()=>{evening=value;$('preview-day').setAttribute('aria-pressed',String(!value));$('preview-night').setAttribute('aria-pressed',String(value));preview();};
refresh();
