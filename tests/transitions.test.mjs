import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {easeOut,traySlide,slideRow,besideProgress,besideShift,columnAlpha,mixColor,TRAY_MS,BESIDE_MS} from '../shared/transitions.js';
const range=(a,b,s)=>{const out=[];for(let v=a;v<=b;v+=s)out.push(v);return out;};
test('the watch runs every transition curve exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/transitions-test.c','watchface/src/c/transitions.c','-o','test-results/transitions-test']);
  const lines=execFileSync('test-results/transitions-test').toString().trim().split('\n').map(l=>l.trim());
  assert.equal(lines[0],range(-10,1010,5).map(easeOut).join(' '));
  assert.equal(lines[1],range(-5,TRAY_MS+40,3).map(traySlide).join(' '));
  assert.equal(lines[2],range(0,1000,125).flatMap(from=>range(0,BESIDE_MS+50,17).flatMap(e=>[besideProgress(from,true,e),besideProgress(from,false,e)])).join(' '));
  assert.equal(lines[3],range(0,1000,10).flatMap(p=>[besideShift(p,28),besideShift(p,-28),columnAlpha(p)]).join(' '));
  assert.equal(lines[4],range(0xc0,0xff,7).flatMap(f=>range(0xc0,0xff,5).flatMap(t=>range(0,1000,125).map(a=>mixColor(f,t,a)))).join(' '));
  const old=range(0,199,1),fresh=old.map(x=>200+x%50);
  assert.equal(lines[5],range(0,200,7).map(s=>slideRow(old,fresh,s).reduce((sum,v,x)=>sum+v*(x+1),0)).join(' '));
});
test('the tray swipes across and the clock makes room before the times fade in',()=>{
  assert.equal(traySlide(0),0);assert.equal(traySlide(TRAY_MS),200);
  for(let e=0;e<TRAY_MS;e+=10)assert(traySlide(e+10)>=traySlide(e),'never backs up');
  assert(traySlide(TRAY_MS/2)>150,'most of the way by halfway: it eases out');
  assert.equal(besideShift(500,28),28,'the clock has arrived by halfway');assert.equal(columnAlpha(500),0,'before the column starts to show');
  assert.equal(columnAlpha(1000),1000);assert.equal(besideShift(0,-28),0);
  assert.equal(besideProgress(600,false,BESIDE_MS),0);assert.equal(besideProgress(600,true,100),800,'picks up from where it stood');
  assert.equal(mixColor(0xc0,0xff,0),0xc0);assert.equal(mixColor(0xc0,0xff,1000),0xff);assert.equal(mixColor(0xc0,0xff,500),0xea,'halfway: each channel 2 of 3');
  assert.deepEqual(slideRow([1,2,3,...Array(197).fill(0)],Array(200).fill(9),2).slice(0,2),[3,0]);
});
