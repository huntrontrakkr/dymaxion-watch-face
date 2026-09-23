import {THEMES} from './palettes.js';

export const MAX_CUSTOM_PALETTES=12;
export const PALETTE_COLOR_ROLES=['bg','ocean','land','nightOcean','nightLand','edge','ink','accent','moonShadow','inactive'];
// Keep this order: these are bytes 21–28 of the native footer packet.
export const PANEL_COLOR_ROLES=['temperature','rain','humidity','tide','saturday','sunday','holiday','today'];
export const DEFAULT_PANEL_COLORS={temperature:'#FFAA55',rain:'#55AAFF',humidity:'#00FFAA',tide:'#55AAFF',saturday:'#55AAFF',sunday:'#FF55AA',holiday:'#FFAA55',today:'#FFFFFF'};
export function paletteFor(settings){
  return settings.customPalette!=null?settings.customPalettes[settings.customPalette]:THEMES[settings.theme];
}
export function copyPalette(settings){
  const source=paletteFor(settings),names=new Set((settings.customPalettes||[]).map(p=>p.name));
  let name='My '+source.name.slice(0,24),suffix=2;
  while(names.has(name))name='My '+source.name.slice(0,24)+' '+suffix++;
  return {name,...Object.fromEntries(PALETTE_COLOR_ROLES.map(k=>[k,source[k]])),marks:[...source.marks],zoneGlyphs:!!source.zoneGlyphs,panelColors:{...(source.panelColors||DEFAULT_PANEL_COLORS)}};
}
export function validatePalettes(input,quantize){
  const saved=input.customPalettes??[];
  if(!Array.isArray(saved)||saved.length>MAX_CUSTOM_PALETTES)throw new Error('Save up to 12 custom palettes.');
  const customPalettes=saved.map(p=>{
    if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>32||/[\x00-\x1f\x7f]/.test(p.name))throw new Error('Give each palette a name of 1–32 characters.');
    if(!Array.isArray(p.marks)||p.marks.length!==3||typeof p.zoneGlyphs!=='boolean'||!p.panelColors||typeof p.panelColors!=='object')throw new Error('Incomplete custom palette.');
    return {name:p.name.trim(),...Object.fromEntries(PALETTE_COLOR_ROLES.map(k=>[k,quantize(p[k])])),marks:p.marks.map(quantize),zoneGlyphs:p.zoneGlyphs,panelColors:Object.fromEntries(PANEL_COLOR_ROLES.map(k=>[k,quantize(p.panelColors[k])]))};
  });
  const customPalette=input.customPalette??null;
  if(customPalette!==null&&(!Number.isInteger(customPalette)||customPalette<0||customPalette>=customPalettes.length))throw new Error('Choose a saved custom palette.');
  return {customPalettes,customPalette};
}
