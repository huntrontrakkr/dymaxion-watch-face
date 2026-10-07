import {THEMES} from './palettes.js';

// LED RGB888, separate from the screen's RGB222 colors. Keep every channel
// at least 224/255 and one at full output: a gentle tint, never a dark filter.
export function backlightColor(value){
  if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw new Error('Choose a six-digit backlight color.');
  const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)),max=Math.max(...rgb);
  return '#'+rgb.map(v=>Math.max(224,v+255-max).toString(16).padStart(2,'0').toUpperCase()).join('');
}
export function validateBacklight(input){
  // Upgrades/imports keep the watch's own color until explicitly enabled.
  if(input===undefined)return {mode:'system',colors:{}};
  if(!input||!['system','theme'].includes(input.mode)||!input.colors||typeof input.colors!=='object'||Array.isArray(input.colors))throw new Error('Invalid backlight settings.');
  const colors={};
  for(const [id,color] of Object.entries(input.colors)){
    if(!/^(0|[1-9]\d*)$/.test(id)||Number(id)>=THEMES.length)throw new Error('Invalid backlight theme.');
    colors[id]=backlightColor(color);
  }
  return {mode:input.mode,colors};
}
export function themeBacklight(settings){
  return settings.customPalette!=null
    ?settings.customPalettes[settings.customPalette].backlight??'#FFFFFF'
    :settings.backlight?.colors[settings.theme]??THEMES[settings.theme].backlight;
}
export const BACKLIGHT_SIZE=6;
export function encodeBacklight(settings){
  const color=backlightColor(themeBacklight(settings));
  return new Uint8Array([1,settings.theme,+(settings.backlight?.mode==='theme'),...[1,3,5].map(i=>parseInt(color.slice(i,i+2),16))]);
}
