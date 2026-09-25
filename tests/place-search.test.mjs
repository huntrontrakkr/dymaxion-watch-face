import test from 'node:test';
import assert from 'node:assert/strict';
import moment from 'moment-timezone';
import {PLACES,defaults,validateSettings} from '../shared/settings.js';
import {localPlaces,placeCode,searchResults} from '../shared/place-search.js';
const zoneExists=tz=>!!moment.tz.zone(tz);
const norfolk={name:'Norfolk',latitude:36.84681,longitude:-76.28522,timezone:'America/New_York',admin1:'Virginia',country:'United States'};
test('saved cities have valid coordinates, zones and editable three-letter codes',()=>{
  assert(PLACES.length>50);
  assert(PLACES.every(p=>zoneExists(p.tz)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180&&/^[A-Z]{3}$/.test(p.label)));
  assert.equal(localPlaces('nyc')[0].name,'New York');assert.equal(localPlaces('zurich')[0].label,'ZRH');
  assert.equal(placeCode({name:'Norfolk',tz:norfolk.timezone,lat:norfolk.latitude,lon:norfolk.longitude}),'ORF');
  assert.notEqual(placeCode({name:'Newark',tz:'America/New_York',lat:40.7357,lon:-74.1724}),'NYC','a nearby city must not inherit another city’s code');
});
test('search separates regions, sorts locally and rejects incomplete provider data',()=>{
  const nebraska={...norfolk,latitude:42.02834,longitude:-97.417,timezone:'America/Chicago',admin1:'Nebraska'};
  const results=searchResults({results:[norfolk,nebraska,norfolk,{...norfolk,latitude:91},{...norfolk,timezone:'Moon/Base'},{...norfolk,longitude:null}]},{zoneExists,near:{lat:42,lon:-97}});
  assert.equal(results.length,2);assert.match(results[0].region,/Nebraska/);assert.match(results[1].region,/Virginia/);
  assert.equal(results[1].label,'ORF');assert.deepEqual(searchResults({error:true},{zoneExists}),[]);
  assert.match(placeCode({name:'São Vicente',tz:'Atlantic/Cape_Verde',lat:16.9,lon:-25}),/^[A-Z]{3}$/);
});
test('a searched city survives settings validation and keeps marker choices',()=>{
  const place=searchResults({results:[norfolk]},{zoneExists})[0],s=defaults();
  s.places[1]={...s.places[1],...place,label:'HOME',icon:4,color:'#AA5500',on:false};
  const roundtrip=validateSettings(JSON.parse(JSON.stringify(s)),zoneExists).places[1];
  assert.equal(roundtrip.name,'Norfolk');assert.equal(roundtrip.region,'Virginia, United States');assert.equal(roundtrip.label,'HOME');
  assert.equal(roundtrip.lat,36.84681);assert.equal(roundtrip.tz,'America/New_York');assert.equal(roundtrip.icon,4);assert.equal(roundtrip.color,'#AA5500');assert.equal(roundtrip.on,false);
});
