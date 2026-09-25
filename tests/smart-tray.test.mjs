import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {smartPage,smartInputs,SMART_HOLD} from '../shared/smart-tray.js';
import {PANEL_PAGES} from '../shared/panel-settings.js';
import {encodeFooter,ROTATE_SMART} from '../shared/panel-protocol.js';
import {defaults,validateSettings} from '../shared/settings.js';
import {zoneExists} from '../shared/protocol.js';
import {sampleEnvironment} from '../shared/panel-data.js';
const ids=PANEL_PAGES.map(([id])=>id);
const ALL=['zones','weather','calendar','tide','health'],FEW=['zones','calendar'];
test('the watch picks the same smart page as the workshop',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/smart-tray-test.c','watchface/src/c/smart_tray.c','-o','test-results/smart-tray-test']);
  const cases=[],expected=[];
  for(const pages of [ALL,FEW,['health','zones'],['weather','tide']])for(const home of pages)for(const hour of [3,6,8,9,14])
    for(const rainPeak of [-1,0,49,50,90])for(const tideMinutes of [-1,0,45,46])for(const recentSteps of [-1,599,600]){
      cases.push([pages.length,ids.indexOf(home),hour,rainPeak,tideMinutes,recentSteps,...pages.map(p=>ids.indexOf(p))].join(' '));
      expected.push(String(ids.indexOf(smartPage({pages,home,hour,rainPeak,tideMinutes,recentSteps}))));
    }
  const out=execFileSync('test-results/smart-tray-test',{input:cases.join('\n')}).toString().trim().split('\n');
  assert.equal(out.length,cases.length);assert.deepEqual(out,expected);
});
test('smart rotation shows what matters now, among the enabled pages',()=>{
  const base={pages:ALL,home:'zones',hour:14,rainPeak:0,tideMinutes:-1,recentSteps:0};
  assert.equal(smartPage(base),'zones','nothing pressing: the starting panel');
  assert.equal(smartPage({...base,rainPeak:60}),'weather','rain likely soon');
  assert.equal(smartPage({...base,tideMinutes:30}),'tide','the tide turns within 45 minutes');
  assert.equal(smartPage({...base,recentSteps:800}),'health','walking');
  assert.equal(smartPage({...base,hour:7}),'calendar','mornings open on the calendar');
  assert.equal(smartPage({...base,hour:7,pages:['zones','weather']}),'weather','or the weather without one');
  assert.equal(smartPage({...base,rainPeak:60,tideMinutes:10,recentSteps:900,hour:7}),'weather','rain first');
  assert.equal(smartPage({...base,rainPeak:90,pages:FEW}),'zones','never a page that is not enabled');
  assert.equal(SMART_HOLD,600,'a flick holds its page for ten minutes');
});
test('smart rotation travels as byte 9 = 255 and validates',()=>{
  const s=validateSettings({...defaults(),footer:{...defaults().footer,rotationMinutes:'smart'}},zoneExists);
  assert.equal(s.footer.rotationMinutes,'smart');assert.equal(encodeFooter(s)[9],ROTATE_SMART);
  assert.throws(()=>validateSettings({...defaults(),footer:{...defaults().footer,rotationMinutes:'clever'}},zoneExists));
  const inputs=smartInputs(s,sampleEnvironment(Date.UTC(2026,8,23,18)),Date.UTC(2026,8,23,18),14);
  assert.deepEqual(Object.keys(inputs),['pages','home','hour','rainPeak','tideMinutes','recentSteps']);
  assert(inputs.rainPeak>=0&&inputs.recentSteps>=0,'the example day feeds every input');
});
