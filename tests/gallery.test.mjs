import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {galleryConfigs,GALLERY_SEED,GALLERY_COUNT} from '../tools/gallery-configs.mjs';
import {THEMES,validateSettings} from '../shared/settings.js';
import {zoneExists,encodeSettings} from '../shared/protocol.js';
import {DISPLAY_STYLES} from '../shared/display.js';
import {PANEL_PAGES} from '../shared/panel-settings.js';

test('gallery recipes are reproducible, importable, and cover every palette, clock and panel',()=>{
  const entries=galleryConfigs();
  assert.equal(entries.length,GALLERY_COUNT);
  assert.deepEqual(entries,galleryConfigs(GALLERY_SEED));
  assert.notDeepEqual(entries,galleryConfigs(GALLERY_SEED+1));
  const values=key=>new Set(entries.map(e=>e[key]));
  assert.equal(values('id').size,GALLERY_COUNT);
  assert.deepEqual(values('theme'),new Set(THEMES.map(t=>t.name)));
  assert.deepEqual(values('clock'),new Set(DISPLAY_STYLES));
  assert.deepEqual(values('panel'),new Set(PANEL_PAGES.map(p=>p[0])));
  assert.deepEqual(values('layout'),new Set(['meridian','horizon']));
  for(const entry of entries){
    assert.deepEqual(validateSettings(entry.settings,zoneExists),entry.settings);
    assert.equal(encodeSettings(entry.settings)[1],entry.themeId);
  }
});

test('published gallery contains distinct native-size frames with matching settings for every palette',()=>{
  const root=new URL('../designer/public/gallery/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  const hashes=new Set();
  assert.equal(manifest.seed,GALLERY_SEED);
  assert.equal(manifest.entries.length,GALLERY_COUNT);
  for(const [i,recipe] of galleryConfigs().entries()){
    const entry=manifest.entries[i];
    const {settings,...metadata}=recipe;
    assert.deepEqual(entry,{...metadata,image:recipe.id+'.png',preset:recipe.id+'.json'});
    assert.deepEqual(JSON.parse(readFileSync(new URL(entry.preset,root),'utf8')),settings);
    const png=readFileSync(new URL(entry.image,root));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[200,228]);
    hashes.add(createHash('sha256').update(png).digest('hex'));
  }
  assert.equal(hashes.size,GALLERY_COUNT,'every preview must show a different face');
});
