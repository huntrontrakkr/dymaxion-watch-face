import {readFileSync,writeFileSync} from 'node:fs';
const directory=new URL('./',import.meta.url),read=file=>JSON.parse(readFileSync(new URL(file,directory),'utf8'));
const before=read('before.json'),after=read('after.json');
const renders=after.map(item=>({id:item.id,name:item.name,before:before.find(b=>b.id===item.id),after:item}));
const html=readFileSync(new URL('comparison.template.html',directory),'utf8').replace('__RENDERS__',JSON.stringify(renders));
if(Buffer.byteLength(html)>1_000_000)throw new Error('Comparison exceeds 1 MB.');
writeFileSync(new URL('compact-chart-comparison.html',directory),html);
console.log('Built compact-chart comparison: '+Buffer.byteLength(html)+' bytes.');
