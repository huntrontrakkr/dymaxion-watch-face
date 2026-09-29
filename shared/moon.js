import {MARKER_HALO_ROWS} from './status-glyphs.js';
import {drawPixelRows} from './pixels.js';

// Low-precision geocentric ecliptic longitudes (degrees). The dominant lunar
// terms resolve the phase to better than one of the eight familiar phase steps.
// J2000 epoch: 2000-01-01 12:00 UTC.
export const MOON_FRAMES=8,MOON_SIZE=9;
export const MOON_NAMES=['New moon','Waxing crescent','First quarter','Waxing gibbous',
  'Full moon','Waning gibbous','Last quarter','Waning crescent'];
// '.', 'o' and '#' are transparent, shadow and illuminated pixels. These
// native-size drawings are shared by the browser preview and generated C table.
const inside=(x,y)=>(x-4)**2+(y-4)**2<=16;
export const MOON_GLYPHS=Array.from({length:MOON_FRAMES},(_,phase)=>
  Array.from({length:MOON_SIZE},(_,y)=>
    Array.from({length:MOON_SIZE},(_,x)=>{
      if(!inside(x,y))return '.';
      if(phase===0)return [-1,0,1].some(dx=>[-1,0,1].some(dy=>!inside(x+dx,y+dy)))?'o':'.';
      const dx=x-4,dy=y-4,half=Math.sqrt(16-dy*dy);
      const edge=Math.cos(phase*Math.PI/4)*half;
      return (phase<=4?dx>=edge-.25:dx<=-edge+.25)?'#':'o';
    }).join('')));
// The map needs the same footprint as the Sun, rather than the larger status
// icon. Draw these phases directly on a 5×5 grid so the crescents stay crisp.
export const MAP_MOON_SIZE=5;
const mapWaxing=[
  ['.ooo.','o...o','o...o','o...o','.ooo.'],
  ['.oo#.','oooo#','oooo#','oooo#','.oo#.'],
  ['.o##.','oo###','oo###','oo###','.o##.'],
  ['.###.','o####','o####','o####','.###.'],
  ['.###.','#####','#####','#####','.###.']
];
export const MAP_MOON_GLYPHS=[...mapWaxing,...[3,2,1].map(i=>mapWaxing[i].map(row=>[...row].reverse().join('')))];
const rad=Math.PI/180;
const sin=x=>Math.sin(x*rad);
export function lunarPhase(date) {
  const t=(date.getTime()-Date.UTC(2000,0,1,12))/86400000/36525;
  const sunMean=280.46646+36000.76983*t;
  const sunAnomaly=357.5291092+35999.0502909*t;
  const sun=sunMean+1.915*sin(sunAnomaly)+0.020*sin(2*sunAnomaly);
  const moonMean=218.3164477+481267.88123421*t;
  const elongation=297.8501921+445267.1114034*t;
  const moonAnomaly=134.9633964+477198.8675055*t;
  const latitudeArgument=93.272095+483202.0175233*t;
  const moon=moonMean+6.289*sin(moonAnomaly)
    +1.274*sin(2*elongation-moonAnomaly)+0.658*sin(2*elongation)
    +0.214*sin(2*moonAnomaly)-0.186*sin(sunAnomaly)
    -0.114*sin(2*latitudeArgument);
  return ((moon-sun)%360+360)%360/360;
}
export function moonFrame(date) {
  return Math.round(lunarPhase(date)*MOON_FRAMES)%MOON_FRAMES;
}
export function moonDescription(date) {
  const p=lunarPhase(date),name=MOON_NAMES[moonFrame(date)];
  return {name,illumination:Math.round((1-Math.cos(p*2*Math.PI))*50)};
}

// Truncated Meeus lunar longitude/latitude series, equinox of date; sufficient
// for a marker on a 200-pixel map. Latitude is essential: the Moon's orbit is
// inclined to the ecliptic. Rotate into Earth's frame using Greenwich sidereal
// time, not the solar day. Mirrored in solar.c lunar_direction().
export function moonDirection(date){
  const seconds=Math.floor(+date/1000)-946728000,day=Math.floor(seconds/86400),second=seconds-day*86400,n=day+second/86400;
  const reduce=a=>a-360*Math.floor(a/360),cos=a=>Math.cos(a*rad);
  const L=reduce(218.3164477+13.17639648*n),D=reduce(297.8501921+12.19074912*n);
  const M=reduce(134.9633964+13.06499295*n),S=reduce(357.5291092+.98560028*n),F=reduce(93.272095+13.22935024*n);
  const lon=L+6.289*sin(M)+1.274*sin(2*D-M)+.658*sin(2*D)+.214*sin(2*M)-.186*sin(S)-.114*sin(2*F);
  const lat=5.128*sin(F)+.280*sin(M+F)+.277*sin(M-F)+.173*sin(2*D-F)+.055*sin(2*D-M+F)+.046*sin(2*D-M-F)+.033*sin(2*D+F)+.017*sin(2*M+F);
  const tilt=23.439-.0000004*n,theta=reduce(280.46061837+reduce(.98564736629*day)+.98564736629*second/86400+second/240);
  const x=cos(lat)*cos(lon),y=cos(lat)*sin(lon)*cos(tilt)-sin(lat)*sin(tilt),z=cos(lat)*sin(lon)*sin(tilt)+sin(lat)*cos(tilt);
  return [x*cos(theta)+y*sin(theta),y*cos(theta)-x*sin(theta),z];
}
// Quantized Euclidean distance avoids the length bias of a dot product on
// the map's rounded direction vectors. Only evaluated at map refresh time.
export function drawMapMoon(ctx,cx,cy,date,palette){
  const radius=MAP_MOON_SIZE>>1,halo=MARKER_HALO_ROWS.length>>1;
  drawPixelRows(ctx,MARKER_HALO_ROWS,cx-halo,cy-halo,palette.bg);
  MAP_MOON_GLYPHS[moonFrame(date)].forEach((row,y)=>[...row].forEach((p,x)=>{
    if(p!=='.'){ctx.fillStyle=p==='#'?palette.ink:palette.moonShadow;ctx.fillRect(cx-radius+x,cy-radius+y,1,1);}
  }));
}
