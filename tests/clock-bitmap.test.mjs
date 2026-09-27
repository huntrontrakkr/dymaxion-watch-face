import test from 'node:test';
import {mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

test('clock frames retain every pixel and palette index in Pebble bitmap order',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',
    '-Iwatchface/src/c','tests/clock-bitmap-test.c','-o','test-results/clock-bitmap-test']);
  execFileSync('test-results/clock-bitmap-test');
});
