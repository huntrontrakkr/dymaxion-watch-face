import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const mobile=await build({entryPoints:['tools/mobile-config.js'],bundle:true,write:false,format:'iife',target:'es2017',minify:true});
const html=readFileSync('tools/mobile-config.html','utf8').replace('__FONT__',readFileSync('watchface/resources/fonts/DymaxionDraftMicro.ttf').toString('base64')).replace('__PALETTE_STYLE__',()=>readFileSync('shared/palette-controls.css','utf8')).replace('__SCRIPT__',()=>mobile.outputFiles[0].text);
writeFileSync('tools/mobile-config.generated.html',html);
mkdirSync('watchface/src/pkjs',{recursive:true});
const notice=['moment','moment-timezone'].map(name=>name+'\n'+readFileSync(`node_modules/${name}/LICENSE`,'utf8')).join('\n\n')+'\n\nDymaxion original lettering: Apache-2.0; see project LICENSE.';
await build({entryPoints:['tools/companion.js'],bundle:true,outfile:'watchface/src/pkjs/index.js',format:'iife',target:'es2015',minify:true,loader:{'.html':'text'},legalComments:'eof',banner:{js:'/*!\n'+notice+'\n*/'}});
console.log('Bundled offline phone settings and IANA timezone companion.');
