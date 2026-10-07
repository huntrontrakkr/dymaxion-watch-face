import {themeBacklight} from './backlight.js';
import {paletteFor} from './palette-settings.js';

export function backlightControls(root,getSettings,onChange){
  root.innerHTML=`<label class="field">Backlight<select data-backlight-mode aria-label="Backlight"><option value="system">Use watch setting</option><option value="theme">Use theme color</option></select></label>
    <div data-backlight-editor><label class="field">Backlight color<input type="color" data-rgb888 aria-label="Backlight color"></label>
    <label class="field">Backlight hex<input type="text" data-backlight-hex aria-label="Backlight hex" pattern="#[0-9A-Fa-f]{6}" maxlength="7" placeholder="#RRGGBB" spellcheck="false" required></label>
    <p class="micro" data-backlight-value></p><button type="button" data-backlight-reset>Reset backlight color</button></div>
    <p class="micro">Saved separately for each palette. Choose any 24-bit RGB color. Dark or saturated colors may reduce readability. Brightness and timeout follow the watch. The preview does not simulate the backlight.</p>`;
  const mode=root.querySelector('[data-backlight-mode]'),color=root.querySelector('[data-rgb888]'),hex=root.querySelector('[data-backlight-hex]');
  mode.onchange=()=>onChange({backlight:{...getSettings().backlight,mode:mode.value}});
  function setColor(value){
    const s=getSettings();
    if(s.customPalette!=null){
      const customPalettes=s.customPalettes.map((p,i)=>i===s.customPalette?{...p,backlight:value??'#FFFFFF'}:p);
      onChange({customPalettes});
    }else{
      const colors={...s.backlight.colors};
      if(value===null)delete colors[s.theme];else colors[s.theme]=value;
      onChange({backlight:{...s.backlight,colors}});
    }
  }
  color.onchange=()=>setColor(color.value);
  hex.onchange=()=>{if(hex.reportValidity())setColor(hex.value);};
  root.querySelector('[data-backlight-reset]').onclick=()=>setColor(null);
  function refresh(){
    const s=getSettings(),value=themeBacklight(s);
    mode.value=s.backlight.mode;color.value=value;hex.value=value;
    root.querySelector('[data-backlight-editor]').hidden=s.backlight.mode!=='theme';
    root.querySelector('[data-backlight-value]').textContent=paletteFor(s).name+' · '+value;
    root.querySelector('[data-backlight-reset]').disabled=s.customPalette!=null?value==='#FFFFFF':!Object.prototype.hasOwnProperty.call(s.backlight.colors,s.theme);
  }
  refresh();return {refresh};
}
