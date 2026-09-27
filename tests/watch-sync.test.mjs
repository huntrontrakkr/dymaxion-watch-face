import test from 'node:test';
import assert from 'node:assert/strict';
import {watchSync} from '../tools/watch-sync.js';
const fixture=()=>{
  const sent=[],timers=[],logs=[];
  const sync=watchSync({send:(message,ack,nack)=>sent.push({message,ack,nack}),delay:fn=>timers.push(fn),log:m=>logs.push(m)});
  return {sync,sent,timers,logs};
};
test('sync omits only acknowledged duplicates and coalesces to the latest pending value',()=>{
  const {sync,sent}=fixture(),a={WEATHER:[1]},b={WEATHER:[2]};
  sync.enqueue('weather',a);sync.enqueue('weather',a);
  assert.equal(sent.length,1);sent[0].ack();assert.equal(sent.length,1);
  sync.enqueue('weather',a);assert.equal(sent.length,1);
  sync.enqueue('weather',b);sync.enqueue('weather',a);sync.enqueue('weather',{WEATHER:[3]});
  sent[1].ack();assert.deepEqual(sent[2].message,{WEATHER:[3]});sent[2].ack();
  sync.enqueue('weather',{WEATHER:[3]});assert.equal(sent.length,3);
});
test('a full sync replays state and an earlier in-flight ACK cannot suppress it',()=>{
  const {sync,sent}=fixture(),a={SETTINGS:[1]};
  sync.enqueue('settings',a);sync.forgetAcknowledged();sync.enqueue('settings',a);
  sent[0].ack();assert.equal(sent.length,2);sent[1].ack();
  sync.forgetAcknowledged();sync.enqueue('settings',a);assert.equal(sent.length,3);
});
test('failed sends retry, preserve newer data and invalidate an uncertain watch state',()=>{
  const {sync,sent,timers,logs}=fixture(),a={CITY:[1]},b={CITY:[2]};
  sync.enqueue('city',a);sent[0].ack();sync.enqueue('city',b);sent[1].nack();
  sync.enqueue('city',a);assert.equal(sent.length,3,'uncertain delivery must resend even the former ACKed value');
  timers.shift()();assert.equal(sent.length,3);sent[2].ack();
  sync.enqueue('city',b);sync.enqueue('city',{CITY:[3]});sent[3].nack();timers.shift()();
  assert.deepEqual(sent[4].message,{CITY:[3]});sent[4].ack();
  sync.enqueue('city',{CITY:[4]});
  for(let i=0;i<4;i++){sent.at(-1).nack();if(timers.length)timers.shift()();}
  assert.equal(logs.length,1);const n=sent.length;sync.enqueue('city',{CITY:[4]});assert.equal(sent.length,n+1);
});
