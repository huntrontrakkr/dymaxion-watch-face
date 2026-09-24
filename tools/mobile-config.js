import {defaults,PLACES,THEMES,PRESETS,presetFor,withClockDisplay,validateSettings,blockSize,clampPosition,markColor,quantizeColor} from '../shared/settings.js';
import {MARKERS} from '../shared/markers.js';
import {panelControls} from '../shared/panel-controls.js';
import {cityControls} from '../shared/city-controls.js';
import {displayControls} from '../shared/display-controls.js';
import {paletteControls} from '../shared/palette-controls.js';
import {paletteFor} from '../shared/palette-settings.js';
const $=id=>document.getElementById(id),data=window.DYMAXION_CONFIG;
const exists=zone=>data.zoneNames.indexOf(zone)>=0;
let s=validateSettings(data.settings||defaults(),exists);
const panelEditor=panelControls($('panel-controls'),()=>s,footer=>{s.footer=validateSettings({...s,footer},exists).footer;});
const cityEditor=cityControls($('city-controls'),()=>s,location=>{s.location=validateSettings({...s,location},exists).location;});
const displayEditor=displayControls($('display-controls'),()=>s,value=>{s={...withClockDisplay(s,value.clockDisplay),leadingZero:value.leadingZero};refresh();});
const paletteEditor=paletteControls($('palette-controls'),()=>s,patch=>{s=validateSettings({...s,...patch},exists);refresh();});
function options(select,entries){select.replaceChildren();entries.forEach(([label,value])=>select.add(new Option(label,value)));}
options($('theme'),THEMES.map((t,i)=>[t.name,i]));
for(const [key,title] of [['moonIndicator','Moon in top bar'],['dayNight','Day and night'],['lights','City lights'],['sun','Subsolar diamond'],['edges','Face edges'],['motion','Brief animations'],['stacked','Stack hours and minutes']]){
  const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type='checkbox';input.id=key;label.append(input);$('switches').append(label);
}
function refresh(){
  panelEditor.refresh();
  cityEditor.refresh();
  displayEditor.refresh();
  paletteEditor.refresh();
  $('theme').value=s.theme;$('format').value=s.format;$('connectionBuzz').value=s.connectionBuzz;$('mapBackground').value=s.mapBackground;
  for(const k of ['moonIndicator','dayNight','lights','sun','edges','motion','stacked'])$(k).checked=s[k];
  $('places').replaceChildren();
  s.places.forEach((p,i)=>{
    const set=document.createElement('fieldset');set.innerHTML=`<legend>Place ${i+1}</legend><label>Show this place<input type="checkbox" data-key="on"></label><label>City<select data-city></select></label><label>Short label<input data-key="label" maxlength="7" required></label><label>Map glyph<select data-key="icon"></select></label><div class="symbol-preview"><canvas data-symbol-preview width="9" height="9" aria-hidden="true"></canvas><small data-symbol-meaning></small></div><label>Marker color<input type="color" data-color aria-label="Color for place ${i+1}"></label><small data-color-label></small><button type="button" class="quiet" data-reset-color>Use theme color</button><details><summary>Custom location</summary><label>IANA time zone<input data-key="tz" required></label><div class="xy"><label>Latitude<input data-key="lat" type="number" step="any" min="-90" max="90" required></label><label>Longitude<input data-key="lon" type="number" step="any" min="-180" max="180" required></label></div></details>`;
    const city=set.querySelector('[data-city]');options(city,[...PLACES.map((p,n)=>[p.name,n]),['Custom','custom']]);
    options(set.querySelector('[data-key=icon]'),MARKERS.map((mark,n)=>[mark.name,n]));
    const n=PLACES.findIndex(z=>z.tz===p.tz&&z.lat===p.lat&&z.lon===p.lon);city.value=n<0?'custom':n;
    const updateSymbol=()=>{const g=set.querySelector('[data-symbol-preview]').getContext('2d');g.fillStyle=paletteFor(s).bg;g.fillRect(0,0,9,9);g.fillStyle=markColor(p,s,i);MARKERS[p.icon].rows.forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='#')g.fillRect(x+2,y+2,1,1);}));set.querySelector('[data-symbol-meaning]').textContent=MARKERS[p.icon].meaning;};
    set.querySelectorAll('[data-key]').forEach(input=>{const k=input.dataset.key;if(k==='on')input.checked=p[k];else input.value=p[k];input.onchange=()=>{p[k]=k==='on'?input.checked:['icon','lat','lon'].includes(k)?Number(input.value):k==='label'?input.value.toUpperCase():input.value.trim();if(k==='icon')updateSymbol();};});
    const color=set.querySelector('[data-color]'),updateColor=()=>{color.value=markColor(p,s,i);set.querySelector('[data-color-label]').textContent=`${color.value.toUpperCase()} · ${p.color?'custom':'theme default'} · Pebble RGB222`;set.querySelector('[data-reset-color]').disabled=p.color===null;updateSymbol();};
    color.onchange=()=>{p.color=quantizeColor(color.value);updateColor();};set.querySelector('[data-reset-color]').onclick=()=>{p.color=null;updateColor();};updateColor();
    city.onchange=()=>{if(city.value==='custom'){set.querySelector('details').open=true;return;}s.places[i]={...PLACES[+city.value],on:p.on,icon:p.icon,color:p.color};refresh();};$('places').append(set);
  });
  $('positions').replaceChildren();
  for(const [key,label]of [['time','Local time'],['map','Map'],['zone0','Place 1'],['zone1','Place 2'],['zone2','Place 3']]){
    const row=document.createElement('div');row.className='xy';const pos=key.startsWith('zone')?s.zones[+key.slice(-1)]:s[key],size=blockSize(s,key);
    ['X','Y'].forEach((axis,j)=>{const labelEl=document.createElement('label');labelEl.textContent=label+' '+axis;const input=document.createElement('input');input.type='number';input.value=pos[j];input.min=j&&key!=='map'?16:0;input.max=(j?228:200)-size[j];input.required=true;input.onchange=()=>pos[j]=Number(input.value);labelEl.append(input);row.append(labelEl);});$('positions').append(row);
  }
}
$('preset').onchange=()=>{const preset=$('preset').value;if(preset!=='custom')Object.assign(s,presetFor(preset,s.clockDisplay));refresh();};
$('connectionBuzz').onchange=()=>{s.connectionBuzz=$('connectionBuzz').value;};
$('mapBackground').onchange=()=>{s.mapBackground=$('mapBackground').value;};
for(const key of ['theme','format'])$(key).onchange=()=>{s[key]=Number($(key).value);if(key==='theme'){s.customPalette=null;refresh();}};
for(const key of ['moonIndicator','dayNight','lights','sun','edges','motion','stacked'])$(key).onchange=()=>{s[key]=$(key).checked;if(key==='stacked'){s.time=clampPosition(s,'time',s.time);refresh();}};
function importText(text){try{s=validateSettings(JSON.parse(text),exists);$('error').textContent='Composition loaded.';$('preset').value='custom';refresh();}catch(e){$('error').textContent=e.message;}}
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;if(file.size>50000){$('error').textContent='Settings file is too large.';return;}importText(await file.text());};
$('import').onclick=()=>importText($('json').value);
$('config').onsubmit=e=>{e.preventDefault();try{s=validateSettings(s,exists);location.href='pebblejs://close#'+encodeURIComponent(JSON.stringify(s));}catch(e){$('error').textContent=e.message;}};
refresh();
