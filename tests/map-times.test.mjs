import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {makeMap} from '../shared/map.js';
import {PLACES} from '../shared/settings.js';
import {placeMapTimes,mapTimeTemplate,mapTimeText,tinyPixels,leaderPath,tinyWidth,TINY_GLYPHS,TINY_CHARS} from '../shared/map-times.js';
const m=makeMap(),bytes=readFileSync('watchface/resources/maps/map-0.bin'),blocked=(x,y)=>!!(bytes[(y*200+x)*4+3]&3);
const pos=label=>m.project(...(({lat,lon})=>[lat,lon])(PLACES.find(p=>p.label===label))).map(Math.round);
const SETS=[['NYC','LON','TYO'],['LAX','PAR','SIN'],['SYD','DXB','BER'],['NYC',null,'SYD'],['DEL','KTM',null],['IST','BER','PAR']];
test('the watch places, draws and leads map times exactly as the workshop does',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-O2','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/map-times-test.c','watchface/src/c/map_times.c','-o','test-results/map-times-test']);
  for(const set of SETS)for(const turn of [0,1])for(const [clock24,reserve] of [[1,0],[0,1]]){
    const pts=set.map(l=>l?pos(l):null),places=pts.map(p=>p&&{x:p[0],y:p[1],template:mapTimeTemplate(!!clock24,!!reserve)});
    const native=execFileSync('test-results/map-times-test',['watchface/resources/maps/map-0.bin',turn,clock24,reserve,...pts.flatMap(p=>p??[-1,-1])].map(String),{stdio:['ignore','pipe','ignore']}).toString().trim().split('\n');
    const spots=placeMapTimes(places,blocked,200,104,{turn:!!turn});let line=0;
    spots.forEach((s,i)=>{
      const label=`${set.join(' ')} turn=${turn} 24h=${clock24} place ${i}`;
      if(!s){assert.equal(native[line++],'-',label);return;}
      assert.equal(native[line++],[s.orientation,s.x,s.y,...s.anchor,+s.diagonalFirst,s.cost,s.total].join(' '),label);
      const text=mapTimeText({hour:i===2?1:13,minute:i*7,clock24:!!clock24,delta:i-1});
      const [nText,nPixels,nLeader]=native[line++].split('|');
      assert.equal(nText,text);
      assert.equal(nPixels.trim(),tinyPixels(text,s.orientation,s.total).map(([x,y])=>`${s.x+x},${s.y+y}`).join(' '),label+' pixels');
      assert.equal(nLeader.trim(),leaderPath([places[i].x,places[i].y],s.anchor,s.diagonalFirst).map(p=>p.join(',')).join(' '),label+' leader');
    });
  }
});
test('labels sit in open ground, clear of each other, near their places',()=>{
  for(const set of SETS)for(const turn of [false,true]){
    const places=set.map(l=>l&&(([x,y])=>({x,y,template:mapTimeTemplate(false,true)}))(pos(l)));
    const spots=placeMapTimes(places,blocked,200,104,{turn}),seen=new Set();
    spots.forEach((s,i)=>{
      if(!places[i])return assert.equal(s,null);
      assert(s,`${set[i]} finds a gap`);
      for(const [x,y] of tinyPixels(s.template,s.orientation,s.total)){
        const px=s.x+x,py=s.y+y;assert(!blocked(px,py),'label pixels are on open ground');
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)assert(!blocked(px+dx,py+dy),'a pixel of open ground around every figure');
        assert(!seen.has(px+','+py),'labels never overlap');seen.add(px+','+py);
      }
      if(!turn)assert.equal(s.orientation,0);
      assert(s.cost<280,`${set[i]} within about 55 pixels, even in crowded Europe (${s.cost})`);
    });
  }
});
test('tiny figures: a legible 3×5 set; times keep the template width',()=>{
  for(const c of TINY_CHARS){const g=TINY_GLYPHS[c];assert.equal(g.length,5);assert(g.every(r=>r.length===g[0].length&&/^[.#]+$/.test(r)));}
  const digits=[...'0123456789'].map(c=>TINY_GLYPHS[c].join(''));assert.equal(new Set(digits).size,10,'every figure distinct');
  assert.equal(tinyWidth('12:34'),17);
  for(let h=0;h<24;h++)for(const clock24 of [true,false])for(const delta of [-1,0,1])
    assert(tinyWidth(mapTimeText({hour:h,minute:59,clock24,delta}))<=tinyWidth(mapTimeTemplate(clock24,true)));
  assert.equal(mapTimeText({hour:13,minute:5,clock24:false,delta:1}),'01:05P +1');assert.equal(mapTimeText({hour:0,minute:0,clock24:true,stale:true}),'00:00 ?');
});
