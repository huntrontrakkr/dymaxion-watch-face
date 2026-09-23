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
