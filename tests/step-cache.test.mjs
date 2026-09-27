import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
test('step cache bounds Health queries and refreshes after time and permission changes',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/step-cache-test.c','watchface/src/c/step_cache.c','-o','test-results/step-cache-test']);
  execFileSync('test-results/step-cache-test');
});
