import test from 'node:test';
import assert from 'node:assert/strict';
import {toLab,toXy,D65,colorLayout,COLOR_LAYOUTS,SPECTRAL_LOCUS} from '../shared/color-science.js';

test('CIELAB and chromaticity of known colors',()=>{
  const white=toLab('#FFFFFF'),black=toLab('#000000'),red=toLab('#FF0000');
  assert.ok(Math.abs(white.L-100)<0.01&&white.C<0.05);assert.ok(Math.abs(black.L)<0.01);
  // sRGB red: L* 53.2, a* 80.1, b* 67.2.
  assert.ok(Math.abs(red.L-53.24)<0.05&&Math.abs(red.a-80.09)<0.1&&Math.abs(red.b-67.2)<0.1);
  const [x,y]=toXy('#FFFFFF');assert.ok(Math.abs(x-D65[0])<0.001&&Math.abs(y-D65[1])<0.001);
  assert.deepEqual(toXy('#000000'),D65,'black sits at the white point');
  const [rx,ry]=toXy('#FF0000');assert.ok(Math.abs(rx-0.64)<0.001&&Math.abs(ry-0.33)<0.001,'sRGB red primary');
});
test('every layout places all 64 watch colors once, inside its stage',()=>{
  for(const mode of COLOR_LAYOUTS)for(const view of ['screen','watch']){
    const l=colorLayout(mode,view),hexes=l.cells.map(c=>c.hex);
    assert.equal(new Set(hexes).size,64,`${mode} ${view}`);assert.equal(hexes.length,64);
    for(const c of l.cells)assert.ok(c.x>=-1&&c.y>=-1&&c.x+c.w<=l.width+1&&c.y+c.h<=l.height+1,`${mode} ${view} ${c.hex} inside`);
    // Grid layouts never overlap cells.
    if(mode==='rgb'||mode==='lab')for(const a of l.cells)for(const b of l.cells)if(a!==b)assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${mode}: ${a.hex} and ${b.hex} overlap`);
  }
});
test('the lightness layout orders each column from light to dark',()=>{
  const l=colorLayout('lab'),cols=new Map();
  for(const c of l.cells){if(!cols.has(c.x))cols.set(c.x,[]);cols.get(c.x).push(c);}
  for(const col of cols.values()){col.sort((a,b)=>a.y-b.y);for(let i=1;i<col.length;i++)assert.ok(toLab(col[i-1].hex).L>=toLab(col[i].hex).L);}
  assert.equal(SPECTRAL_LOCUS.length,31);
});
