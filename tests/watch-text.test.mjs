import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,existsSync} from 'node:fs';
import {drawBitmapText,textWidth} from '../shared/type.js';
import {LANGUAGES,WATCH_LANGUAGES,WATCH_TEXT,WATCH_TEXT_KEYS,resolveLanguage,watchDate,calendarTitle,encodeLanguage,languageIndex,watchText} from '../shared/watch-text.js';
import {localizedFont} from '../shared/watch-font.js';
const caps=JSON.parse(readFileSync('designer/public/type/draft.json','utf8')).lining.small;
const flatten=t=>WATCH_TEXT_KEYS.flatMap(k=>Array.isArray(t[k])?t[k]:[t[k]]);
const pack=code=>code==='en'?'-':`watchface/resources/data/text-${code}.bin`;

test('the face follows the phone, or the chosen language',()=>{
  assert.equal(resolveLanguage('auto',['de-AT','en-US']),'de');
  assert.equal(resolveLanguage('auto',['zh-TW']),'zh-Hant');
  assert.equal(resolveLanguage('auto',['zh-CN']),'zh-Hans');
  assert.equal(resolveLanguage('auto',['zh-Hant-HK']),'zh-Hant');
  assert.equal(resolveLanguage('auto',['xx','pt-BR']),'pt');
  assert.equal(resolveLanguage('auto',[]),'en');
  assert.equal(resolveLanguage('fr',['ja-JP']),'fr');
  // A settings-page-only language shows the face in English.
  assert.equal(resolveLanguage('ar',[]),'ar');
  assert.deepEqual([...encodeLanguage('ar')],[1,0]);
  assert.deepEqual([...encodeLanguage('ko')],[1,WATCH_LANGUAGES.indexOf('ko')]);
  assert.equal(languageIndex('en'),0);
  assert.equal(watchText('hi'),WATCH_TEXT.en);
  // Wire indexes are stable: append only.
  assert.deepEqual(LANGUAGES.slice(0,17).map(l=>l.code),['en','es','fr','de','it','pt','nl','pl','tr','id','ru','uk','el','zh-Hans','zh-Hant','ja','ko']);
});

test('every language resource carries its words and fills patterns like the previews',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-DWATCH_TEXT_ENGLISH','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/watch-text-test.c','watchface/src/c/watch_text.c','-o','test-results/watch-text-test']);
  const day=new Date(2026,9,7);
  for(const code of WATCH_LANGUAGES){
    if(code!=='en')assert(existsSync(pack(code)),code);
    const t=WATCH_TEXT[code],lines=execFileSync('test-results/watch-text-test',[pack(code)]).toString().split('\n');
    assert.deepEqual(lines.slice(0,flatten(t).length),flatten(t),code);
    assert.deepEqual(lines.slice(flatten(t).length,flatten(t).length+3),[watchDate(t,day),calendarTitle(t,2026,9),calendarTitle(t,2026,9,10)],code);
  }
});

test('the watch draws every language\'s words exactly as the previews do',()=>{
  execFileSync('cc',['-std=c11','-DWATCH_TEXT_ENGLISH','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/caps-test.c','watchface/src/c/caps.c','watchface/src/c/watch_text.c','-o','test-results/caps-test']);
  for(const code of WATCH_LANGUAGES){
    const t=WATCH_TEXT[code],font=localizedFont(caps,code);
    const samples=[watchDate(t,new Date(2026,9,7))+'  NORFOLK',t.months.join(' '),t.weekdays.join(' ')+' '+t.initials.join(''),
      t.setUpTides,t.enableWeather,t.expired,t.unavailable,t.waiting,t.allowHealth,t.mapUnavailable,
      [t.tide,t.humidity,t.weather,t.health].join(' '),[t.old,t.rain,t.max,t.rh,t.steps,t.hr,t.typical].join(' ')];
    const output=execFileSync('test-results/caps-test',['watchface/resources/data/caps.bin',pack(code),...samples]);
    let at=0;
    for(const text of samples){
      const newline=output.indexOf(10,at),width=Number(output.subarray(at,newline).toString());at=newline+1;
      const frame=new Uint8Array(200*18),ctx={fillRect(x,y,w){for(let i=0;i<w;i++)if(x+i>=0&&x+i<200&&y>=0&&y<18)frame[y*200+x+i]=1;}};
      drawBitmapText(ctx,font,text,4,12,'#fff');drawBitmapText(ctx,font,text,195,12,'#fff','right');
      assert.equal(width,textWidth(font,text),`${code}: ${text}`);
      assert.deepEqual(output.subarray(at,at+3600),Buffer.from(frame),`${code}: ${text}`);at+=3600;
    }
  }
});
