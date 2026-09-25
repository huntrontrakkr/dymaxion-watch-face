import test from 'node:test';
import assert from 'node:assert/strict';
import {FULLER_QUOTES,quoteOfTheDay} from '../shared/fuller-quotes.js';
test('a sourced Fuller quote, the same all day, changing day to day',()=>{
  for(const q of FULLER_QUOTES){assert(q.text.length>0);assert.match(q.source,/, (19[0-9]{2})$/,'every quote names its book and year');}
  assert.equal(quoteOfTheDay(new Date(2026,8,25,0,5)),quoteOfTheDay(new Date(2026,8,25,23,55)));
  const days=new Set(Array.from({length:FULLER_QUOTES.length},(_,i)=>quoteOfTheDay(new Date(2026,8,25+i,12))));
  assert.equal(days.size,FULLER_QUOTES.length,'each quote gets its day');
});
