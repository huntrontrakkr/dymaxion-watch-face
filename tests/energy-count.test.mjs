import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {thumbCount,countTrace} from '../tools/energy/count.mjs';

test('Thumb instruction lengths: 16-bit, and 32-bit from the first halfword',()=>{
  assert.equal(thumbCount('80b5'),1); // push {r7,lr}
  assert.equal(thumbCount('00f000f8'),1); // bl
  assert.equal(thumbCount('80b500f000f87047'),3);
  assert.equal(thumbCount('2de9f041'),1); // push.w
});
test('a window counts each executed block by its translation, split between app and firmware',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'energy-'));
  writeFileSync(join(dir,'0000-boot.log'),[
    // QEMU's fallback: the bytes on their own lines, 32 to a line.
    '----------------','IN: firmware','0x08001000:  ','OBJD-T: 80b500f0','OBJD-T: 00f8','',
    '----------------','IN: ','0x20050500:  OBJD-T: 7047','',
  ].join('\n'));
  writeFileSync(join(dir,'0001-window-minute-1.log'),[
    'Trace 0: 0x7f0000001000 [00000000/08001000/00000000/ff200000] firmware',
    'Trace 0: 0x7f0000001000 [00000000/08001000/00000000/ff200000] firmware',
    '----------------','IN: ','0x20050600:  OBJD-T: 70477047','',
    'Trace 0: 0x7f0000002000 [00000000/20050600/00000000/ff200000] ',
    'Trace 0: 0x7f0000003000 [00000000/20050500/00000000/ff200000] ',
  ].join('\n'));
  writeFileSync(join(dir,'0002-gap.log'),'Trace 0: 0x7f0000001000 [00000000/08001000/00000000/ff200000] firmware\n');
  const r=await countTrace(dir);
  assert.deepEqual(r.windows,[{name:'minute-1',total:2+2+2+1,app:3,blocks:4,pages:{8001:4}}]);
  assert.equal(r.unknown,0);assert.equal(r.ambiguous,0);
});
