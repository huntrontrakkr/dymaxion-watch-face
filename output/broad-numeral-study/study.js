import {drawBroadTime,drawBroadDigit,broadTimeMask} from '../../shared/broad-numerals.js';
const root=document.getElementById('dymaxion-broad-type-study');
const find=name=>root.querySelector('[data-'+name+']');
const state={time:'12:34',watchStyle:'joined',palette:'paper',reach:2,effect:'etch',edge:9,phase:0,guides:false};
const choices={time:['12:34','08:08','23:59','11:11','00:00','06:49','20:26','19:57'],watchStyle:['solid','joined','grid'],palette:['paper','dark'],effect:['etch','trim','cells'],edge:[7,9,11],phase:[0,.5,1]};
const controls={time:find('time'),watchStyle:find('watch-style'),palette:find('palette'),reach:find('reach'),effect:find('effect'),edge:find('edge'),phase:find('phase'),guides:find('guides')};
const bases={};
function paint(){
  find('reach-value').textContent=state.reach+' px';
  for(const [key,control] of Object.entries(controls))if(key==='guides')control.checked=state.guides;else control.value=state[key];
  for(const canvas of root.querySelectorAll('[data-strip]')){
    const style=canvas.dataset.strip;
    drawBroadTime(canvas.getContext('2d'),state.time,0,0,{extension:style==='solid'?0:state.reach,effect:style==='grid'?state.effect:'plain',edge:state.edge,phase:state.phase,showGrid:style==='grid'&&state.guides});
    canvas.setAttribute('aria-label',state.time+', '+({solid:'solid broad numerals',joined:'joined horizontal strokes',grid:state.effect+' triangular treatment'}[style]));
  }
  const canvas=find('watch'),ctx=canvas.getContext('2d'),paper=state.palette==='paper';
  if(bases[state.palette])ctx.drawImage(bases[state.palette],0,0);
  else{ctx.fillStyle=paper?'#FFFFFF':'#000000';ctx.fillRect(0,0,200,228);}
  drawBroadTime(ctx,state.time,0,18,{ink:paper?'#000000':'#FFFFFF',background:paper?'#FFFFFF':'#000000',seam:paper?'#555555':'#AAAAAA',extension:state.watchStyle==='solid'?0:state.reach,effect:state.watchStyle==='grid'?state.effect:'plain',edge:state.edge,phase:state.phase});
  canvas.setAttribute('aria-label',state.time+' in the '+state.watchStyle+' treatment on the 200 by 228 pixel watch');
  for(const canvas of root.querySelectorAll('[data-digits]')){
    const ctx=canvas.getContext('2d');ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,250,40);
    [...canvas.dataset.digits].forEach((digit,index)=>drawBroadDigit(ctx,digit,2+index*50,4));
  }
  const solid=broadTimeMask(state.time,{extension:0}),joined=broadTimeMask(state.time,{extension:state.reach});
  const joins=joined.reduce((n,v,i)=>n+(v!==solid[i]),0);
  find('status').textContent='196 px lettering span · 32 px cap height · '+(joins?'Shared stroke active':state.reach?'No matching strokes in this pair':'Strokes separated');
}
function restore(saved){
  if(saved?.modelContent?.study!=='dymaxion-broad-v1')return;
  const values=saved.modelContent.settings;
  if(!values||typeof values!=='object')return;
  for(const key of Object.keys(state)){
    if(choices[key]?.includes(values[key]))state[key]=values[key];
    else if(key==='reach'&&Number.isInteger(values.reach)&&values.reach>=0&&values.reach<=4)state.reach=values.reach;
    else if(key==='guides'&&typeof values.guides==='boolean')state.guides=values.guides;
  }
  paint();
}
function save(){
  if(window.openai?.setWidgetState)Promise.resolve(window.openai.setWidgetState({modelContent:{study:'dymaxion-broad-v1',settings:{...state}},privateContent:null})).catch(()=>{});
}
for(const [key,control] of Object.entries(controls))control.addEventListener(key==='reach'?'input':'change',()=>{
  state[key]=key==='guides'?control.checked:['reach','edge','phase'].includes(key)?Number(control.value):control.value;
  paint();save();
});
paint();restore(window.openai?.widgetState);
window.addEventListener('openai:set_globals',event=>restore(event.detail?.globals?.widgetState));
for(const [key,src] of Object.entries(JSON.parse(find('watch-bases').textContent))){
  const image=new Image();image.onload=()=>{bases[key]=image;paint();};image.src=src;
}
