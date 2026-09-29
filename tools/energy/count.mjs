// Counts the instructions the emulated watch executed in each measured window,
// from QEMU's logs (tools/energy/qemu-trace.sh, measure.mjs). Every translated
// block is logged when it is translated (in_asm): its address, then, when QEMU
// has no disassembler, its Thumb bytes on following lines of up to 32 bytes
// ("0x08001234:  " then "OBJD-T: 80b5..."); with one, a line per instruction.
// Inside a window every executed block is logged too (exec, with chaining off
// so none is skipped). A window's count is the sum, over executed blocks, of
// the instructions in the block's latest translation.
import {createReadStream,readdirSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {join} from 'node:path';

// Thumb-2: a halfword whose top five bits are 11101, 11110 or 11111 starts a
// 32-bit instruction; any other starts a 16-bit one.
export function thumbCount(hex){
  let n=0;
  for(let i=0;i+4<=hex.length;){
    const hw=parseInt(hex.slice(i+2,i+4)+hex.slice(i,i+2),16),top=hw>>>11;
    i+=top>=0x1d?8:4;n++;
  }
  return n;
}
// Code the app runs from RAM; the firmware runs from flash.
const inApp=pc=>pc>=0x20000000&&pc<0x30000000;
export async function countTrace(dir){
  const files=readdirSync(dir).filter(f=>/^\d{4}-.*\.log$/.test(f)).sort();
  const length=new Map(),seen=new Map(),windows=[];
  let unknown=0,ambiguous=0;
  for(const file of files){
    const window=/^\d{4}-window-(.+)\.log$/.exec(file);
    const w=window?{name:window[1],total:0,app:0,blocks:0,pages:{}}:null;
    let pc=null,hex='',lines=0;
    const close=()=>{
      if(pc===null)return;
      const n=hex?thumbCount(hex):lines;
      const before=seen.get(pc);if(before!==undefined&&before!==n)ambiguous++;
      seen.set(pc,n);length.set(pc,n);pc=null;hex='';lines=0;
    };
    const rl=createInterface({input:createReadStream(join(dir,file)),crlfDelay:Infinity});
    let inBlock=false;
    for await(const line of rl){
      if(line.startsWith('Trace ')){
        close();inBlock=false;
        if(!w)continue;
        const m=/\[[0-9a-f]+\/([0-9a-f]+)\/[0-9a-f]+\/[0-9a-f]+\]/.exec(line);if(!m)continue;
        const at=parseInt(m[1],16),n=length.get(at);
        if(n===undefined){unknown++;continue;}
        w.total+=n;w.blocks++;if(inApp(at))w.app+=n;else{const page=(at>>>12).toString(16);w.pages[page]=(w.pages[page]||0)+n;}
        continue;
      }
      if(line.startsWith('IN:')){close();inBlock=true;continue;}
      if(!inBlock)continue;
      if(line.startsWith('OBJD-T:')){hex+=line.slice(7).replace(/\s+/g,'');continue;}
      const m=/^0x([0-9a-f]+):\s*(.*)$/.exec(line);
      if(m){
        if(pc===null)pc=parseInt(m[1],16);
        const rest=m[2].trim();
        if(rest.startsWith('OBJD-T:'))hex+=rest.slice(7).replace(/\s+/g,'');
        else if(rest)lines++;
      }else if(!line.trim()||line.startsWith('---')){close();inBlock=false;}
    }
    close();
    if(w)windows.push(w);
  }
  // Every block one instruction long means the translations were not read.
  const executed=windows.reduce((n,w)=>n+w.blocks,0),counted=windows.reduce((n,w)=>n+w.total,0);
  if(executed&&counted<=executed)throw new Error(`count: ${counted} instructions in ${executed} executed blocks; the translation log was not understood`);
  return {windows,unknown,ambiguous};
}
if(import.meta.url===`file://${process.argv[1]}`){const r=await countTrace(process.argv[2]);const {writeFileSync}=await import('node:fs');writeFileSync(process.argv[3]||'/dev/stdout',JSON.stringify(r));}
