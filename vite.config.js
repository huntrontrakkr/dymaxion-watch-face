import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:'designer',base:'./',server:{host:'127.0.0.1'},build:{outDir:'../dist',emptyOutDir:true,rollupOptions:{input:{workshop:fileURLToPath(new URL('./designer/index.html',import.meta.url)),segmentStudy:fileURLToPath(new URL('./designer/segment-study.html',import.meta.url)),typeStudy:fileURLToPath(new URL('./designer/type-study.html',import.meta.url))}}},plugins:[{
  name:'license-notice',generateBundle(){this.emitFile({type:'asset',fileName:'NOTICE.txt',source:readFileSync(new URL('./NOTICE',import.meta.url),'utf8')});}
}]});
