export function displayControls(root,getSettings,onChange){
  root.innerHTML='<label class="field">Numerical display<select data-clock-display aria-label="Numerical display"><option value="broad">Rounded broad numerals</option><option value="triangles">Triangular seven-segment experiment</option><option value="span">Dymaxion Span lettering</option></select></label><label class="toggle"><span>Show unlit triangles</span><input type="checkbox" data-segment-grid aria-label="Show unlit triangles"></label><p class="micro">Rounded numerals reveal each new minute with a 400 ms triangle flip when Brief animations is enabled. Applies to the horizontal clock; stacked time uses Draft lettering.</p>';
  const style=root.querySelector('[data-clock-display]'),grid=root.querySelector('[data-segment-grid]');
  const commit=()=>{onChange({clockDisplay:style.value,segmentGrid:grid.checked});refresh();};style.onchange=commit;grid.onchange=commit;
  function refresh(){const s=getSettings();style.value=s.clockDisplay;grid.checked=s.segmentGrid;grid.disabled=s.clockDisplay!=='triangles'||s.stacked;}
  refresh();return {refresh};
}
