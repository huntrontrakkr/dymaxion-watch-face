import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
// The settings page travels as a data: URL, which phones and browsers cap at
// about 2 MB once percent-encoded. Two things keep it well under:
// - its time zones are the current rules for the coming 25 years, not the
//   whole history (the preview only shows the present);
// - its translations are base64 text, decoded on the page, because percent-
//   encoding triples every byte outside ASCII.
const require=createRequire(import.meta.url);
const tzUtils=require('moment-timezone/moment-timezone-utils.js'),year=new Date().getUTCFullYear();
const tzPacked=require('moment-timezone/data/packed/latest.json');
const tzPage=JSON.stringify(tzUtils.tz.filterLinkPack({version:tzPacked.version,zones:tzPacked.zones.map(z=>tzUtils.tz.unpack(z)),links:tzPacked.links},year-1,year+25));
const pageData={name:'page-data',setup(b){
  b.onResolve({filter:/^moment-timezone$/},()=>({path:'moment-timezone',namespace:'page-data'}));
  b.onLoad({filter:/^moment-timezone$/,namespace:'page-data'},()=>({resolveDir:process.cwd(),contents:`import moment from 'moment-timezone/moment-timezone.js';moment.tz.load(${tzPage});export default moment;`}));
  b.onLoad({filter:/ui-text\.json$/},args=>({loader:'js',contents:`const b=${JSON.stringify(Buffer.from(readFileSync(args.path)).toString('base64'))},s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);export default JSON.parse(typeof TextDecoder==='function'?new TextDecoder().decode(u):decodeURIComponent(escape(s)));`}));
}};
const mobile=await build({entryPoints:['tools/mobile-config.js'],bundle:true,write:false,format:'iife',target:'es2017',minify:true,loader:{'.bin':'base64'},plugins:[pageData]});
const html=readFileSync('tools/mobile-config.html','utf8').replace('__STYLE__',()=>readFileSync('tools/mobile-config.css','utf8')).replace('__SEARCH_STYLE__',()=>readFileSync('shared/place-search.css','utf8')).replace('__PALETTE_STYLE__',()=>readFileSync('shared/palette-controls.css','utf8')).replace('__SCRIPT__',()=>mobile.outputFiles[0].text).replace('__VERSION__',()=>JSON.parse(readFileSync('package.json','utf8')).version);
writeFileSync('tools/mobile-config.generated.html',html);
mkdirSync('watchface/src/pkjs',{recursive:true});
const notice=['moment','moment-timezone'].map(name=>name+'\n'+readFileSync(`node_modules/${name}/LICENSE`,'utf8')).join('\n\n')+'\n\nDymaxion original lettering: Apache-2.0; see project LICENSE.';
await build({entryPoints:['tools/companion.js'],bundle:true,outfile:'watchface/src/pkjs/index.js',format:'iife',target:'es2015',minify:true,loader:{'.html':'text'},legalComments:'eof',banner:{js:'/*!\n'+notice+'\n*/'}});
console.log('Bundled offline phone settings and IANA timezone companion.');
