import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {textWidth,fitLabel} from '../shared/type.js';
const proofs=JSON.parse(readFileSync(new URL('../designer/public/type/proofs.json',import.meta.url)));
test('watch clock numerals stay aligned and fit every minute of the day',()=>{
  assert.equal(textWidth(proofs.span.lining.large,'88:88'),190,'main time fills 95% of the display');
  for(const family of Object.values(proofs).filter(f=>f.name!=='Dymaxion Span'))for(const style of ['lining',...(family.supportsOldstyle?['oldstyle']:[])]) {
    for(const [role,width] of [['large',family.name==='Dymaxion Draft'?144:160],['zone',52]]) {
      const font=family[style][role];
      assert.equal(new Set([... '0123456789'].map(c=>font[c].a)).size,1);
      assert.ok(font[':'].a<font['0'].a,'colon has its own narrower spacing');
      const expected=textWidth(font,'00:00');
      for(let minute=0;minute<1440;minute++) {
        const str=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
        assert.equal(textWidth(font,str),expected);
        assert.ok(expected<=width,`${family.name} ${role} fits`);
      }
    }
  }
  assert.equal(new Set([... '0123456789'].map(c=>proofs.span.lining.large[c].a)).size,1);
});
test('small labels leave room for a date offset and oldstyle proofs are real',()=>{
  const font=proofs.draft.text.small;
  for(const label of ['NYC','LON','TYO','WWWWW','MMMMM','KTM +1'])assert.ok(textWidth(font,fitLabel(font,label))<=34);
  assert.equal(fitLabel(font,'NYC'),'NYC');
  assert.notEqual(font.I.a,font.W.a,'letters use natural widths');
  assert.ok(proofs.alegreya.oldstyle.large['0'].t<proofs.alegreya.lining.large['0'].t);
  assert.equal(proofs.recursive.supportsOldstyle,false);
});
