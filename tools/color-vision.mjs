// Review tooling only; never bundled into the watch or companion.
// Machado, Oliveira & Fernandes (2009), severity 1.0 matrices, verified against
// https://github.com/colour-science/colour/blob/develop/colour/blindness/datasets/machado2010.py
// Transform linear-light sRGB. These are simulations, not individual vision models.
export const VISION_MODES = ['normal','protan','deutan','tritan','grayscale'];
const matrices = {
  protan:[[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],
  deutan:[[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.011820,.042940,.968881]],
  tritan:[[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.303900]]
};
const linear = v => (v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const encoded = v => 255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055);
const luminance = rgb => .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
function transformed(rgb,mode){
  const c=rgb.map(linear);
  if(mode==='normal')return c;
  if(mode==='grayscale')return c.map(()=>luminance(c));
  if(!matrices[mode])throw new Error('Unknown color-vision simulation.');
  return matrices[mode].map(row=>Math.max(0,Math.min(1,row.reduce((s,v,i)=>s+v*c[i],0))));
}
export function simulateRGB(rgb,mode='normal'){return transformed(rgb,mode).map(v=>Math.round(encoded(v)));}
export function contrast(a,b,mode='normal'){
  const light=hex=>luminance(transformed([1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),mode));
  const x=light(a),y=light(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
