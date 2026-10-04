import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {defaults} from '../shared/settings.js';
test('the shipped bridge distinguishes routine refresh, full resync and configuration changes',async()=>{
  const settled=()=>new Promise(resolve=>setImmediate(resolve));
  const settings=defaults();settings.location={mode:'manual',name:'Norfolk'};settings.footer.enabled=false;
  const store=new Map([['dymaxion-settings-v1',JSON.stringify(settings)]]),messages=[],handlers={};
  const context={console,Intl,setTimeout,clearTimeout,
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    Pebble:{addEventListener:(name,fn)=>handlers[name]=fn,sendAppMessage:(packet,ok)=>{messages.push(packet);ok();}}};
  vm.runInNewContext(readFileSync('watchface/src/pkjs/index.js','utf8'),context);
  handlers.ready();await settled();assert.equal(messages.length,4);messages.length=0;
  handlers.appmessage({payload:{REQUEST:2}});await settled();assert.equal(messages.length,0);
  handlers.appmessage({payload:{10001:2}});await settled();assert.equal(messages.length,0);
  settings.theme=settings.theme===0?1:0;handlers.webviewclosed({response:JSON.stringify(settings)});
  await settled();
  assert.equal(messages.length,1);assert(messages[0].SETTINGS);messages.length=0;
  for(const payload of [{REQUEST:1},{10001:1},{}, {REQUEST:99}]){
    handlers.appmessage({payload});await settled();assert.equal(messages.length,4);
    assert.deepEqual(messages.map(m=>Object.keys(m).join('+')).sort(),['SETTINGS+FOOTER+DISPLAY+PALETTE+GLYPHS+LANGUAGE','WEATHER','TIDE','CITY'].sort());messages.length=0;
  }
});
