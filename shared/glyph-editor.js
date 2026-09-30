// A 5×5 grid for drawing a place's own map glyph, shared by the workshop and
// the phone settings. Each cell is a toggle button; `onChange` receives the
// new rows ('.' and '#'), `getRows` supplies the current ones.
import {MARKER_SIZE,BLANK_GLYPH} from './markers.js';
export function glyphEditor(root,{label,getRows,getInk,getBackground,onChange}){
  root.replaceChildren();
  const grid=document.createElement('div');
  grid.setAttribute('role','group');grid.setAttribute('aria-label',label);
  // Square cells, big enough to tap; the page's own button styles (a 44-pixel
  // minimum height, padding) must not stretch them.
  grid.style.cssText=`display:grid;grid-template-columns:repeat(${MARKER_SIZE},36px);grid-auto-rows:36px;gap:3px;padding:5px;width:max-content;border-radius:6px;margin:4px 0 10px`;
  const cells=[];
  for(let y=0;y<MARKER_SIZE;y++)for(let x=0;x<MARKER_SIZE;x++){
    const cell=document.createElement('button');cell.type='button';
    cell.setAttribute('aria-label',`Row ${y+1}, column ${x+1}`);cell.dataset.glyphCell=`${x},${y}`;
    cell.style.cssText='width:36px;height:36px;min-width:0;min-height:0;padding:0;margin:0;border:1px solid rgba(128,128,128,.45);border-radius:3px;cursor:pointer;box-sizing:border-box';
    cell.onclick=()=>{const rows=getRows().map(r=>[...r]);rows[y][x]=rows[y][x]==='#'?'.':'#';onChange(rows.map(r=>r.join('')));refresh();};
    cells.push(cell);grid.append(cell);
  }
  const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';clear.className='quiet';clear.dataset.glyphClear='';
  clear.onclick=()=>{onChange([...BLANK_GLYPH]);refresh();};
  const help=document.createElement('small');help.style.cssText='display:block;margin:0 0 8px';help.textContent='Tap squares to draw a 5×5 glyph, shown on the map and beside the place’s name.';
  const actions=document.createElement('div');actions.style.cssText='display:flex;margin:0 0 6px';actions.append(clear);
  root.append(help,grid,actions);
  function refresh(){
    const rows=getRows(),ink=getInk(),bg=getBackground();grid.style.background=bg;
    cells.forEach((cell,k)=>{const on=rows[Math.floor(k/MARKER_SIZE)][k%MARKER_SIZE]==='#';cell.style.background=on?ink:bg;cell.setAttribute('aria-pressed',String(on));});
  }
  refresh();
  return {refresh};
}
