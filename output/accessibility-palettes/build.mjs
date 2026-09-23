import {readFileSync,writeFileSync} from 'node:fs';
import {buildSync} from 'esbuild';
const directory=new URL('./',import.meta.url);
const vision=buildSync({entryPoints:['tools/color-vision.mjs'],bundle:true,write:false,format:'iife',globalName:'DymaxionVision',minify:true}).outputFiles[0].text;
const renders=readFileSync(new URL('renders.json',directory),'utf8');
const html=readFileSync(new URL('palettes.template.html',directory),'utf8').replace('__RENDERS__',renders).replace('__VISION__',vision);
if(Buffer.byteLength(html)>1_000_000)throw new Error('Palette comparison exceeds 1 MB.');
writeFileSync(new URL('six-watch-palettes.html',directory),html);
console.log('Built six-palette comparison: '+Buffer.byteLength(html)+' bytes.');
