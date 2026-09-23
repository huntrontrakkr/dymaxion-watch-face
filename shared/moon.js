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
