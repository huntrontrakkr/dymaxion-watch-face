import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {drawBitmapText,textWidth} from '../shared/type.js';
const lining=JSON.parse(readFileSync('designer/public/type/draft.json','utf8')).lining.small;
// A minimal canvas: the workshop only calls fillRect with whole pixels here.
function render(text){
  const frame=new Uint8Array(200*18),ctx={fillRect(x,y,w){for(let i=0;i<w;i++)if(x+i>=0&&x+i<200&&y>=0&&y<18)frame[y*200+x+i]=1;}};
  drawBitmapText(ctx,lining,text,4,12,'#fff');drawBitmapText(ctx,lining,text,195,12,'#fff','right');
  return frame;
}
test('native status-line capitals match the workshop pixel for pixel',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/caps-test.c','watchface/src/c/caps.c','-o','test-results/caps-test']);
  const samples=['WED 23 SEP  NORFOLK','SUN 01 JAN  SAO PAULO? PM','THU 30 APR  KATHMANDU...','86%','100%','0123456789 +-/:.,%','ETE ~`{|}'];
  const output=execFileSync('test-results/caps-test',['watchface/resources/data/caps.bin',...samples]);
  let at=0;
  for(const text of samples){
    const newline=output.indexOf(10,at),width=Number(output.subarray(at,newline).toString());at=newline+1;
    // Unsupported ASCII falls back to '?' on both sides; the companion folds accents first.
    const shown=[...text].map(c=>lining[c]?c:'?').join('');
    assert.equal(width,textWidth(lining,shown),text);
    assert.deepEqual(output.subarray(at,at+3600),Buffer.from(render(shown)),text);at+=3600;
  }
});
