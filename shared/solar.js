// The sun's direction from the Earth's centre, in the Earth's frame (x toward
// 0N 0E, y toward 0N 90E, z toward the North Pole): the Astronomical Almanac's
// low-precision solar coordinates, good to about 0.01 degrees from 1950 to
// 2050. The ecliptic longitude is tilted onto the equator and turned by the
// Greenwich sidereal angle, so no inverse trig is needed. Days are counted
// from J2000.0 as whole days plus seconds, so single-precision floats on the
// watch keep the angles to about a thousandth of a degree.
// Mirrored in watchface/src/c/solar.c.
export function sunDirection(date) {
  const s=Math.floor(date/1000)-J2000,day=Math.floor(s/86400),second=s-day*86400,n=day+second/86400;
  const rad=Math.PI/180,g=reduce(357.528+0.9856003*n)*rad,L=reduce(280.460+0.9856474*n);
  const lambda=(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*rad,tilt=(23.439-0.0000004*n)*rad;
  const theta=reduce(280.46061837+reduce(0.98564736629*day)+0.98564736629*second/86400+second/240)*rad;
  const X=Math.cos(lambda),Y=Math.cos(tilt)*Math.sin(lambda),Z=Math.sin(tilt)*Math.sin(lambda);
  return [X*Math.cos(theta)+Y*Math.sin(theta),Y*Math.cos(theta)-X*Math.sin(theta),Z];
}
// 2000-01-01 12:00 UTC in Unix seconds.
const J2000=946728000;
const reduce=degrees=>degrees-360*Math.floor(degrees/360);

// Daylight at one place, for the panel charts. A place is a unit vector (see
// direction() in map.js). Sunrise and sunset are the moments the sun's centre
// crosses -0.833 degrees (refraction plus the solar radius), as in almanacs.
// Mirrored in watchface/src/c/solar.c.
export const SUNRISE_SINE=Math.sin(-0.833*Math.PI/180);
// Civil twilight ends when the sun's centre is 6 degrees below the horizon.
export const CIVIL_TWILIGHT_SINE=Math.sin(-6*Math.PI/180);
// The map lights each pixel as the watch does (main.c rebuild_map), in whole
// numbers so the preview matches it pixel for pixel: the pixel's stored
// direction (components to 127) against the sun's (to 1024, cut toward zero).
export const mapSun=sun=>sun.map(v=>Math.trunc(1024*v));
export const mapLight=(pixels,i,sun)=>pixels[i]*sun[0]+pixels[i+1]*sun[1]+pixels[i+2]*sun[2];
// Day while the sun is up, a checkerboard through civil twilight, then night:
// sin(-0.833 degrees) and sin(-6 degrees) in those units (127 x 1024).
export const MAP_SUNRISE=Math.round(SUNRISE_SINE*127*1024),MAP_CIVIL_TWILIGHT=Math.round(CIVIL_TWILIGHT_SINE*127*1024);
export const mapNight=(light,x,y)=>light<MAP_CIVIL_TWILIGHT||light<MAP_SUNRISE&&((x+y)&1)===1;
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
