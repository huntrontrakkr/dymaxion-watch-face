import {PANEL_PAGES,panelColors} from './panel-settings.js';
import {HOLIDAY_REGIONS} from './calendar.js';
import {tideStationPicker} from './tide-station-picker.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const get=(f,path)=>path.split('.').reduce((o,k)=>o[k],f);
const set=(f,path,value)=>{const keys=path.split('.');keys.slice(0,-1).reduce((o,k)=>o[k],f)[keys.at(-1)]=value;};
export function panelControls(root,getSettings,onChange,{getPosition}={}){
  const toggle=(path,title,note='')=>`<label class="toggle"><span>${title}${note?`<small>${note}</small>`:''}</span><input type="checkbox" data-panel="${path}" aria-label="${title}"></label>`;
  const select=(path,title,entries)=>`<label class="field">${title}<select data-panel="${path}" aria-label="${title}">${entries.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label>`;
  const number=(path,title,min,max,step=1)=>`<label class="field">${title}<input type="number" data-panel="${path}" aria-label="${title}" min="${min}" max="${max}" step="${step}"></label>`;
  const input=(path,title,max=80)=>`<label class="field">${title}<input type="text" data-panel="${path}" aria-label="${title}" maxlength="${max}"></label>`;
  root.classList.add('panel-controls');
  root.innerHTML=toggle('enabled','Enable bottom panels','Choose which panels show below the map.')
    +`<div class="panel-order" data-order></div>`
    +select('home','Starting panel',PANEL_PAGES)
    +toggle('shake','Flick to change panels','Uses wrist flicks, not screen taps.')+select('flicks','Panel gesture',[[2,'Two flicks, within 2 seconds'],[1,'One flick'],[3,'Three flicks, each within 2 seconds']])
    +`<p class="micro" data-gesture-help></p>`
    +select('rotationMinutes','Automatic rotation',[[0,'Off — keep the panel until changed'],['smart','Smart — what matters now'],...[1,2,5,10,15,30,60].map(n=>[n,`Every ${n} minute${n===1?'':'s'}`])])
    +`<p class="micro">Choose up to five panels. Turn off flicks and rotation to keep one in place.</p>`
    +`<details><summary>Weather & humidity</summary>`+toggle('weather.enabled','Fetch weather','By default, weather follows your phone’s current location.')
    +select('weather.place','Forecast location',[['current','Current location · follows your phone'],[0,'Place 1'],[1,'Place 2'],[2,'Place 3']])+`<p class="micro">Current location uses the phone’s location permission and clock time zone. Choosing a saved city is optional. A manually entered clock city name only changes that caption.</p>`+select('horizon','Chart horizon',[[12,'12 hours'],[24,'24 hours'],[48,'48 hours']])
    +select('weather.temperatureUnit','Temperature units',[['c','Celsius'],['f','Fahrenheit']])+select('weather.precipitation','Rain overlay',[['off','Off'],['probability','Precipitation probability'],['amount','Precipitation amount']])
    +select('weather.rainUnit','Rain amount units',[['mm','Millimeters'],['in','Inches']])+toggle('weather.daylight','Daylight strip & night shading')+toggle('weather.solarTimes','Sunrise and sunset times','Turn off to show peak rain probability or rate in the weather heading.')
    +select('weather.refreshMinutes','Weather refresh',[[30,'30 minutes'],[60,'1 hour'],[120,'2 hours'],[180,'3 hours']])
    +`<details><summary>Chart scales & detail</summary>`+select('weather.temperatureScale','Temperature scale',[['auto','Fit the forecast'],['fixed','Fixed bounds in selected units']])
    +`<div class="panel-pair">`+number('weather.temperatureMin','Temperature minimum',-150,149)+number('weather.temperatureMax','Temperature maximum',-149,150)+`</div>`
    +number('weather.rainMax','Rain chart maximum (mm/hour)',.1,100,.1)+select('weather.humidityScale','Humidity scale',[['percent','Fixed 0–100%'],['auto','Fit the forecast']])
    +toggle('weather.humidityLine','Humidity on the weather chart','A dotted line on a fixed 0–100% scale; the header gives the value.')+toggle('weather.rangeLabels','Show range labels')+toggle('weather.grid','Show a faint midline')+`</details></details>`
    +`<details><summary>Two-week calendar</summary>`+select('calendar.weekStart','First day of week',[[0,'Sunday'],[1,'Monday'],[6,'Saturday']])+select('calendar.weeks','Calendar weeks',[['current-next','This week and next'],['previous-current','Last week and this week']])
    +select('calendar.weekends','Weekend highlighting',[['sat-sun','Saturday and Sunday'],['fri-sat','Friday and Saturday'],['none','Off']])+select('calendar.holidays','Holiday highlighting',HOLIDAY_REGIONS.map(([id,name])=>[id,id==='us'?'United States — federal, observed dates':id==='none'?name:name+' — national public holidays']))+select('calendar.todayStyle','Today highlight',[['fill','Filled cell'],['outline','Outline']])+`</details>`
    +`<details data-tide-section><summary>NOAA tides</summary><div data-tide-picker></div><details data-tide-details><summary>Station details & custom station</summary>`
    +input('tide.station','NOAA station ID',7)+input('tide.label','Tide label',7)+input('tide.tz','Tide station time zone')+`</details>`+select('tide.unit','Tide height units',[['m','Meters relative to MLLW'],['ft','Feet relative to MLLW']])
    +toggle('tide.zeroLine','Show tide zero line')+select('tide.scale','Tide scale',[['auto','Fit the prediction'],['fixed','Fixed bounds in selected units']])+`<div class="panel-pair">`+number('tide.min','Tide minimum',-100,99,.1)+number('tide.max','Tide maximum',-99,100,.1)+`</div>`
    +`<p class="micro">Hourly NOAA harmonic predictions, refreshed every six hours. H/L times use the station’s time zone. These are astronomical predictions, not observed water levels or storm surge. <a href="https://tidesandcurrents.noaa.gov/tide_predictions.html" target="_blank" rel="noreferrer">Find a NOAA station</a>.</p></details>`
    +`<details><summary>Panel colors</summary><div class="panel-pair"><span data-color-mode></span><button type="button" data-theme-colors>Use theme colors</button></div><div class="panel-color-grid">${[['temperature','Temperature'],['rain','Rain'],['humidity','Humidity'],['tide','Tide'],['saturday','Weekend'],['holiday','Holiday'],['today','Today']].map(([key,title])=>`<label class="field">${title}<input type="color" data-panel="colors.${key}" aria-label="${title} panel color"></label>`).join('')}</div><p class="micro">Panel colors follow the palette until you edit one. Custom colors stay with you when you change palettes.</p></details><p data-panel-error role="alert" class="notice error"></p>`;
  function commit(f,input){try{onChange(f);root.querySelector('[data-panel-error]').textContent='';input?.setCustomValidity('');refresh();}catch(e){root.querySelector('[data-panel-error]').textContent=e.message;if(input){input.setCustomValidity(e.message);input.reportValidity();}}}
  const tidePicker=tideStationPicker(root.querySelector('[data-tide-picker]'),{
    getTide:()=>getSettings().footer.tide,getPosition,
    onSelect:station=>{const f=clone(getSettings().footer);Object.assign(f.tide,station);commit(f);},
    onCustom:()=>{root.querySelector('[data-tide-details]').open=true;root.querySelector('[data-panel="tide.station"]').focus();}
  });
  root.querySelector('[data-tide-section]').ontoggle=e=>{if(e.target.open)tidePicker.suggest();};
  root.querySelectorAll('[data-panel]').forEach(el=>{
    el.oninput=()=>el.setCustomValidity('');
    el.onchange=()=>{
      const f=clone(getSettings().footer),path=el.dataset.panel,old=get(f,path);let value=el.type==='checkbox'?el.checked:typeof old==='number'?Number(el.value):el.value;
      if(path==='weather.place')value=el.value==='current'?'current':Number(el.value);
      if(path==='rotationMinutes')value=el.value==='smart'?'smart':Number(el.value);
      if(path.startsWith('colors.')){if(f.colorMode!=='custom')f.colors={...panelColors(getSettings())};f.colorMode='custom';}
      if(path==='tide.station'||path==='tide.label')value=value.trim().toUpperCase();if(path==='tide.tz')value=value.trim();
      set(f,path,value);
      if(path==='weather.temperatureUnit'&&value!==old)for(const k of ['temperatureMin','temperatureMax'])f.weather[k]=Math.round(value==='f'?f.weather[k]*1.8+32:(f.weather[k]-32)/1.8);
      if(path==='tide.unit'&&value!==old)for(const k of ['min','max'])f.tide[k]=Math.round(f.tide[k]*(value==='ft'?3.28084:1/3.28084)*10)/10;
      commit(f,el);
    };
  });
  root.querySelector('[data-theme-colors]').onclick=()=>{const f=clone(getSettings().footer);f.colorMode='theme';commit(f);};
  function refresh(){
    const settings=getSettings(),f=settings.footer;
    const shown={...f,colors:panelColors(settings)};
    root.querySelectorAll('[data-panel]').forEach(el=>{const value=get(shown,el.dataset.panel);if(el.type==='checkbox')el.checked=value;else el.value=value;});
    root.querySelector('[data-theme-colors]').disabled=f.colorMode==='theme';
    root.querySelector('[data-color-mode]').textContent=f.colorMode==='theme'?'Follows palette':'Custom colors';
    root.querySelector('[data-panel="flicks"]').disabled=!f.enabled||!f.shake||f.pages.length<2;
    root.querySelector('[data-gesture-help]').textContent=f.flicks===1?'A single flick is also the watch’s own wake gesture, so waking the screen can change the panel too.':'Pause briefly between flicks. Tapping the screen only turns on the backlight, because Pebble doesn’t send touch input to watch faces.';
    const home=root.querySelector('[data-panel="home"]');home.replaceChildren();f.pages.forEach(id=>home.add(new Option(PANEL_PAGES.find(([p])=>p===id)[1],id)));home.value=f.home;
    root.querySelector('[data-panel="weather.place"]').querySelectorAll('option').forEach(o=>{if(o.value!=='current')o.textContent=`Place ${+o.value+1} / ${settings.places[+o.value].name}`;});
    tidePicker.refresh();
    if(f.enabled&&f.pages.includes('tide'))tidePicker.suggest();
    const order=root.querySelector('[data-order]');order.replaceChildren();
    [...f.pages,...PANEL_PAGES.map(([id])=>id).filter(id=>!f.pages.includes(id))].forEach(id=>{
      const row=document.createElement('div');row.className='panel-order-row';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=f.pages.includes(id);check.setAttribute('aria-label','Include '+PANEL_PAGES.find(([p])=>p===id)[1]);label.append(check,document.createTextNode(PANEL_PAGES.find(([p])=>p===id)[1]));row.append(label);
      check.onchange=()=>{const next=clone(getSettings().footer);next.pages=check.checked?[...next.pages,id]:next.pages.filter(p=>p!==id);if(!next.pages.includes(next.home))next.home=next.pages[0];commit(next,check);};
      for(const [dir,arrow]of [[-1,'↑'],[1,'↓']]){const button=document.createElement('button');button.type='button';button.textContent=arrow;button.setAttribute('aria-label',`Move ${id} ${dir<0?'earlier':'later'}`);const i=f.pages.indexOf(id);button.disabled=i<0||i+dir<0||i+dir>=f.pages.length;button.onclick=()=>{const next=clone(getSettings().footer),index=next.pages.indexOf(id);[next.pages[index],next.pages[index+dir]]=[next.pages[index+dir],next.pages[index]];commit(next);};row.append(button);}
      order.append(row);
    });
  }
  refresh();return {refresh};
}
