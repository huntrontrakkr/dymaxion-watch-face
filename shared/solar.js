// NOAA fractional-year approximation; visual day/night indication, not navigation.
export function sunDirection(date) {
  const year=date.getUTCFullYear(),start=Date.UTC(year,0,1);
  const day=Math.floor((date-start)/86400000);
  const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
  const leap=(year%4===0&&(year%100!==0||year%400===0)),days=leap?366:365;
  const g=2*Math.PI/days*(day+(minutes/60-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const lon=(720-minutes-eq)*Math.PI/720;
  return [Math.cos(dec)*Math.cos(lon),Math.cos(dec)*Math.sin(lon),Math.sin(dec)];
}

// Daylight at one place, for the panel charts. A place is a unit vector (see
// direction() in map.js). Sunrise and sunset are the moments the sun's centre
// crosses -0.833 degrees (refraction plus the solar radius), as in almanacs.
// Mirrored in watchface/src/c/solar.c.
export const SUNRISE_SINE=Math.sin(-0.833*Math.PI/180);
export function sunUp(epoch,place){
  const s=sunDirection(new Date(epoch*1000));
  return s[0]*place[0]+s[1]*place[1]+s[2]*place[2]>=SUNRISE_SINE*Math.hypot(...place);
}
// Next sunrise or sunset after `now` within `hours`, to the minute:
// {rise:true|false,time} or null (polar day or night).
export function nextSunEvent(now,place,hours=48){
  const up=sunUp(now,place);
  for(let t=now+600;t<=now+hours*3600;t+=600){
    if(sunUp(t,place)===up)continue;
    let lo=t-600,hi=t;
    while(hi-lo>30){const mid=lo+Math.floor((hi-lo)/2);if(sunUp(mid,place)===up)lo=mid;else hi=mid;}
    return {rise:!up,time:hi};
  }
  return null;
}
