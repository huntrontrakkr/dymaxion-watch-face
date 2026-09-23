import {TRIANGLE_GRID,SEGMENT_NAMES,drawTriangleTime} from '../shared/triangle-display.js';
const $=id=>document.getElementById(id),grid=TRIANGLE_GRID;
const colors=['#f8d579','#a1dbad','#8ccddd','#dba2d5','#aeb6f0','#f2a780','#e6eecc'];
for(const time of ['01:23','45:67','89:00']){const canvas=document.createElement('canvas');canvas.width=200;canvas.height=46;canvas.dataset.time=time;canvas.setAttribute('aria-label',`Numeral proof ${time}`);$('all-digits').append(canvas);}
const svg=$('geometry'),ns='http://www.w3.org/2000/svg';
for(const cell of grid.cells){
  const polygon=document.createElementNS(ns,'polygon');polygon.setAttribute('points',cell.electrode.map(p=>p.join(',')).join(' '));polygon.dataset.group=cell.group;svg.append(polygon);
}
for(let i=0;i<7;i++){
  const label=document.createElement('label');label.innerHTML=`<input type="checkbox" data-electrode="${i}" checked><span style="border-color:${colors[i]}">${SEGMENT_NAMES[i]}</span>`;$('electrodes').append(label);
}
function render(){
  document.documentElement.style.setProperty('--scale',$('segment-scale').value);
  const time=$('segment-time').value,show=$('segment-grid').checked;
  for(const canvas of [$('time-proof'),...$('all-digits').querySelectorAll('canvas')]){
    const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,200,46);drawTriangleTime(c,canvas.dataset.time||time,0,4,'#FFFFFF','#000055',show);
  }
  const mask=[...document.querySelectorAll('[data-electrode]:checked')].reduce((bits,c)=>bits|1<<+c.dataset.electrode,0);
  svg.querySelectorAll('polygon').forEach(p=>{const g=+p.dataset.group,segment=(g-1)%7;const lit=g===29||g&&!!(mask&(1<<segment));p.setAttribute('fill',lit?g===29?'#fff':colors[segment]:show?'#182c35':'#071a20');});
  $('grid-spec').textContent=`${grid.columns} columns × ${grid.rows} rows · ${grid.cells.length} equilateral cells · 7 px edge · ${grid.pixelHeight} px high`;
}
$('segment-time').onchange=render;
['segment-scale','segment-grid'].forEach(id=>$(id).onchange=render);document.querySelectorAll('[data-electrode]').forEach(c=>c.onchange=render);render();
