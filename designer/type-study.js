import './type-study.css';
import {drawBitmapText,drawIdentity} from '../shared/type.js';
import {THEMES,PLACES} from '../shared/settings.js';
import {makeMap} from '../shared/map.js';
import {sunDirection} from '../shared/solar.js';
const $=id=>document.getElementById(id);
try {
  const get=async(path,json=true)=>{const response=await fetch(`${import.meta.env.BASE_URL}${path}`);if(!response.ok)throw new Error('The watch studies could not be loaded.');return json?response.json():new Uint8Array(await response.arrayBuffer());};
  const [proofs,identity,data]=await Promise.all([get('type/proofs.json'),get('type/identity.json'),get('maps/map-0.bin',false)]);
  const palette=THEMES[0],signed=new Int8Array(data.buffer),map=makeMap();
  const sun=sunDirection(new Date('2026-09-22T12:34:00Z'));
  const colors=[palette.bg,palette.ocean,palette.land,palette.nightOcean,palette.nightLand].map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  const raster=document.createElement('canvas');raster.width=map.width;raster.height=map.height;
  const g=raster.getContext('2d'),pixels=g.createImageData(map.width,map.height);
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++) {
    const i=(y*map.width+x)*4,kind=data[i+3]&3;
    const light=(signed[i]*sun[0]+signed[i+1]*sun[1]+signed[i+2]*sun[2])/127;
    let night=light<0;if(Math.abs(light)<.05)night=(x+y)&1?light<.05:light<-.05;
    pixels.data.set([...colors[kind?kind+(night?2:0):0],255],i);
  }
  g.putImageData(pixels,0,0);
  function render() {
    document.body.classList.toggle('native',$('study-scale').value==='1');
    document.querySelectorAll('[data-family]').forEach(card=>{
      const family=proofs[card.dataset.family],ctx=card.querySelector('canvas').getContext('2d');
      const requested=$('study-figures').value,style=requested==='oldstyle'&&family.supportsOldstyle?'oldstyle':'lining';
      const text=(str,x,y,role='small',color=palette.ink,align='left')=>{
        // Span is a clock face only; keep the established small watch lettering.
        const glyphs=role==='large'?family[style].large:
          card.dataset.family==='span'?proofs.draft[role==='small'?'text':'lining'][role]:
          family[role==='small'?'text':style][role];
        drawBitmapText(ctx,glyphs,str,x,y,color,align);
      };
      ctx.fillStyle=palette.bg;ctx.fillRect(0,0,200,228);ctx.drawImage(raster,0,73);
      PLACES.slice(0,3).forEach((place,i)=>{
        const [x,y]=map.project(place.lat,place.lon).map(Math.round);
        ctx.fillStyle=palette.bg;ctx.fillRect(x-3,y+70,7,7);ctx.fillStyle=palette.marks[i];ctx.fillRect(x-1,y+72,3,3);
      });
      drawIdentity(ctx,identity,4,0,palette.ink,palette.bg);text('86%',195,12,'small',palette.ink,'right');
      ctx.fillStyle=palette.accent;ctx.fillRect(147,7,2,2);
      const current=card.dataset.family==='span'||card.dataset.family==='draft';
      text($('study-time').value,100,current?50:54,'large',palette.ink,'center');
      text('Tue 22 Sep / Norfolk',100,current?63:67,'small',palette.accent,'center');
      PLACES.slice(0,3).forEach((place,i)=>{
        const x=[4,70,136][i];ctx.fillStyle=palette.marks[i];ctx.fillRect(x+1,194,3,3);
        text(place.label,x+9,201,'small',palette.marks[i]);
        text(['08:34','13:34','21:34'][i],x+2,220,'zone');
      });
      card.querySelector('.figure-status').textContent=style==='oldstyle'?'Oldstyle clock figures / equal widths':requested==='oldstyle'?'Lining figures — this family has no oldstyle set':'Lining clock figures / equal widths';
    });
  }
  ['study-time','study-figures','study-scale'].forEach(id=>$(id).addEventListener('change',render));
  render();
} catch(error) {$('study-error').textContent=error.message;}
