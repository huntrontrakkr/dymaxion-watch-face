import {copyPalette,MAX_CUSTOM_PALETTES,paletteFor} from './palette-settings.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const groups=[
  ['Main colors',[['bg','Background'],['ink','Lettering'],['accent','Highlights & city lights'],['edge','Map edges & chart guides']]],
  ['Map & night colors',[['ocean','Day ocean'],['land','Day land'],['nightOcean','Night ocean'],['nightLand','Night land']]],
  ['Places & small indicators',[['marks.0','Place 1 default'],['marks.1','Place 2 default'],['marks.2','Place 3 default'],['moonShadow','Moon shadow']]],
  ['Chart & calendar defaults',[['panelColors.temperature','Temperature'],['panelColors.rain','Rain'],['panelColors.humidity','Humidity'],['panelColors.tide','Tide'],['panelColors.saturday','Weekend'],['panelColors.holiday','Holiday'],['panelColors.today','Today']]]
];
const get=(object,path)=>path.split('.').reduce((value,key)=>value[key],object);
const set=(object,path,value)=>{const keys=path.split('.'),key=keys.pop();keys.reduce((o,k)=>o[k],object)[key]=value;};
export function paletteControls(root,getSettings,onChange){
  root.classList.add('palette-controls');
  root.innerHTML=`<h3>Custom palettes</h3>
    <label class="field">Saved custom palette<select data-saved aria-label="Saved custom palette"></select></label>
    <div class="palette-actions"><button type="button" data-new>New custom palette</button><button type="button" data-delete>Delete palette</button></div>
    <div data-editor hidden><label class="field">Palette name<input type="text" data-name aria-label="Palette name" maxlength="32"></label>
    <div class="palette-preview" aria-label="Current palette colors"></div>
    ${groups.map(([title,fields],i)=>`${i?`<details><summary>${title}</summary>`:''}<div class="palette-colors">${fields.map(([path,label])=>`<label class="field">${label}<input type="color" data-color="${path}" aria-label="Palette ${label.toLowerCase()}"><output data-value="${path}"></output></label>`).join('')}</div>${i?'</details>':''}`).join('')}
    <p class="micro">Colors snap to the watch’s 64 colors. Individual place and panel color choices take priority.</p>
    </div><p class="micro" data-summary></p><p data-error class="notice error" role="alert"></p>`;
  const saved=root.querySelector('[data-saved]'),name=root.querySelector('[data-name]');
  function commit(patch,input){
    try{onChange(patch);input?.setCustomValidity('');root.querySelector('[data-error]').textContent='';refresh();}
    catch(e){root.querySelector('[data-error]').textContent=e.message;if(input){input.setCustomValidity(e.message);input.reportValidity();}}
  }
  function edit(path,value,input){
    const s=getSettings();if(s.customPalette==null)return;
    const palettes=clone(s.customPalettes);set(palettes[s.customPalette],path,value);
    commit({customPalettes:palettes},input);
  }
  saved.onchange=()=>commit({customPalette:saved.value===''?null:Number(saved.value)});
  root.querySelector('[data-new]').onclick=()=>{
    const s=getSettings();if(s.customPalettes.length>=MAX_CUSTOM_PALETTES)return;
    commit({customPalettes:[...s.customPalettes,copyPalette(s)],customPalette:s.customPalettes.length});
  };
  root.querySelector('[data-delete]').onclick=()=>{
    const s=getSettings();if(s.customPalette==null)return;
    commit({customPalettes:s.customPalettes.filter((_,i)=>i!==s.customPalette),customPalette:null});
  };
  name.oninput=()=>name.setCustomValidity('');name.onchange=()=>edit('name',name.value.trim(),name);
  root.querySelectorAll('[data-color]').forEach(input=>input.oninput=()=>edit(input.dataset.color,input.value,input));
  function refresh(){
    const s=getSettings(),custom=s.customPalette!=null,p=paletteFor(s);
    saved.replaceChildren(new Option('Use preset colors',''),...s.customPalettes.map((p,i)=>new Option(p.name,String(i))));
    saved.value=custom?String(s.customPalette):'';
    root.querySelector('[data-editor]').hidden=!custom;root.querySelector('[data-delete]').disabled=!custom;
    root.querySelector('[data-new]').disabled=s.customPalettes.length>=MAX_CUSTOM_PALETTES;
    root.querySelector('[data-summary]').textContent=custom?'Saved with your composition. Export settings to back up or share your palettes.':`Based on ${p.name}. Change any color below. Your saved palettes stay in the list when you switch to a preset.`;
    if(!custom){name.setCustomValidity('');return;}
    name.value=p.name;
    for(const input of root.querySelectorAll('[data-color]')){
      input.value=get(p,input.dataset.color);root.querySelector(`[data-value="${input.dataset.color}"]`).textContent=input.value.toUpperCase();
    }
    const preview=root.querySelector('.palette-preview');preview.replaceChildren();
    for(const color of [p.bg,p.ink,p.ocean,p.land,p.nightLand,p.accent,...p.marks]){const swatch=document.createElement('span');swatch.style.background=color;preview.append(swatch);}
  }
  refresh();return {refresh};
}
