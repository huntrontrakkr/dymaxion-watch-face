// Reproducible compositions for the public gallery. Randomize choices, not
// arbitrary coordinates: every example keeps a usable watch layout.
import {defaults,THEMES,PLACES,presetFor,validateSettings} from '../shared/settings.js';
import {DISPLAY_STYLES} from '../shared/display.js';
import {PANEL_PAGES,TIDE_STATIONS} from '../shared/panel-settings.js';
import {zoneColumnFits} from '../shared/zone-column.js';
import {zoneExists} from '../shared/protocol.js';
import {PUBLIC_THEME_IDS} from '../shared/palettes.js';

export const GALLERY_SEED=0x44594d41;
export const GALLERY_COUNT=1+3*PUBLIC_THEME_IDS.length;
const slug=s=>s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function galleryConfigs(seed=GALLERY_SEED){
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const pick=values=>values[Math.floor(random()*values.length)];
  const entries=[];
  for(let index=0;index<GALLERY_COUNT;index++){
    const theme=index===0?0:PUBLIC_THEME_IDS[Math.floor((index-1)/3)];
    const variant=index===0?0:(index-1)%3;
    let settings=defaults(),layout='meridian';settings.theme=theme;
    // Preserve the saved September 2026 recipes as new-install defaults evolve.
    settings.footer.weather.place=0;
    let when=index===0?'2026-09-24T16:38:20Z':'2026-09-24T16:34:20Z';
    if(variant){
      const order=theme*2+variant-1;
      layout=variant===1?'horizon':'meridian';Object.assign(settings,presetFor(layout));
      settings.clockDisplay=DISPLAY_STYLES[order%DISPLAY_STYLES.length];
      settings.format=pick([1,1,2]);settings.leadingZero=pick([true,false]);
      settings.nameplate=pick([true,false]);settings.moonIndicator=pick([true,true,false]);
      settings.edges=random()<.15;
      settings.mapBackground=pick(['none','none','none','none','points','fine-points','lines']);
      settings.sun=pick([true,true,false]);settings.lights=pick([true,true,true,false]);
      const positions=zoneColumnFits(settings.clockDisplay)?['panel','left','right','map']:['panel','map'];
      const position=pick(positions);settings.zoneTimes=position==='panel'?'panel':'always';
      settings.zonePosition=position==='panel'?'left':position;settings.mapTimesTurn=pick([true,false]);
      // Keep published recipes stable as the offline city catalog grows.
      // The September 2026 gallery was made with these original 21 places.
      const pool=PLACES.slice(0,21);
      settings.places=Array.from({length:3},(_,i)=>{
        const place=pool.splice(Math.floor(random()*pool.length),1)[0];
        return {...place,on:true,icon:Math.floor(random()*5),color:random()<.2?pick([THEMES[theme].ink,THEMES[theme].accent,...THEMES[theme].marks]):null};
      });
      const page=PANEL_PAGES[order%PANEL_PAGES.length][0];
      settings.footer.pages=[...new Set(['zones',page,'weather','calendar','health'])];
      settings.footer.home=page;settings.footer.horizon=pick([12,24,48]);
      settings.footer.weather.temperatureUnit=pick(['c','f']);
      settings.footer.weather.precipitation=pick(['probability','amount']);
      settings.footer.weather.humidityLine=pick([true,false]);
      settings.footer.calendar.weekStart=pick([0,1]);settings.footer.calendar.todayStyle=pick(['fill','outline']);
      const station=pick(TIDE_STATIONS);
      Object.assign(settings.footer.tide,{station:station.id,label:station.label,tz:station.tz,unit:pick(['m','ft'])});
      when=variant===1?'2026-09-24T04:42:20Z':pick(['2026-09-24T10:08:20Z','2026-09-24T20:16:20Z','2026-09-24T23:59:20Z']);
    }
    settings=validateSettings(settings,zoneExists);
    const id=String(index+1).padStart(2,'0')+'-'+slug(THEMES[theme].name);
    entries.push({id,theme:THEMES[theme].name,themeId:theme,layout,clock:settings.clockDisplay,
      panel:settings.footer.home,variant,when,timezone:'America/New_York',settings});
  }
  return entries;
}
