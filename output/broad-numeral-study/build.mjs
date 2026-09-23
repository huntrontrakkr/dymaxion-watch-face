import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
const base=new URL('./',import.meta.url),bases={};
for(const id of ['paper','dark'])bases[id]='data:image/png;base64,'+readFileSync(new URL('watch-base-'+id+'.png',base)).toString('base64');
const built=await build({entryPoints:[new URL('refined-study.js',base).pathname],bundle:true,format:'iife',write:false,minify:false,target:'es2020'});
const html=readFileSync(new URL('refined-type.template.html',base),'utf8').replace('__WATCH_BASES__',JSON.stringify(bases)).replace('__BROAD_STUDY_SCRIPT__',built.outputFiles[0].text);
if(Buffer.byteLength(html)>=1_000_000)throw new Error('Study exceeds the inline size limit');
writeFileSync(new URL('rounded-type-study.html',base),html);
console.log('Built the rounded numeral study: '+Buffer.byteLength(html)+' bytes');
