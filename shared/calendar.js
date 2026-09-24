const DAY=86400000;
function observed(year,month,day){const d=new Date(Date.UTC(year,month,day));return +d+(d.getUTCDay()===6?-DAY:d.getUTCDay()===0?DAY:0);}
export function usHoliday(year,month,day){
  const d=new Date(Date.UTC(year,month,day)),stamp=+d,w=d.getUTCDay();
  for(const y of [year,year+1])if([[0,1],[5,19],[6,4],[10,11],[11,25]].some(([m,n])=>observed(y,m,n)===stamp))return true;
  return w===1&&((month===0&&day>=15&&day<=21)||(month===1&&day>=15&&day<=21)||(month===4&&day+7>31)||(month===8&&day<=7)||(month===9&&day>=8&&day<=14))||month===10&&w===4&&day>=22&&day<=28;
}
// National public holidays, on their calendar dates (US federal holidays also
// mark the observed weekday). Rules: fixed dates, nth/last weekday of a month,
// and offsets from Western Easter. Mirrored in watchface/src/c/panel_data.c.
export const HOLIDAY_REGIONS=[['none','Off'],['us','United States'],['ca','Canada'],['mx','Mexico'],['uk','United Kingdom'],['de','Germany'],['fr','France'],['au','Australia']];
export function easterOrdinal(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  return Date.UTC(year,month-1,day)/DAY;
}
// [month 1-12, day] fixed; [month, weekday, first day of the 7-day window]; Easter offsets.
const RULES={
  ca:{fixed:[[1,1],[7,1],[9,30],[11,11],[12,25],[12,26]],weekday:[[5,1,18],[9,1,1],[10,1,8]],easter:[-2,1]},
  mx:{fixed:[[1,1],[5,1],[9,16],[12,25]],weekday:[[2,1,1],[3,1,15],[11,1,15]],easter:[]},
  uk:{fixed:[[1,1],[12,25],[12,26]],weekday:[[5,1,1],[5,1,25],[8,1,25]],easter:[-2,1]},
  de:{fixed:[[1,1],[5,1],[10,3],[12,25],[12,26]],weekday:[],easter:[-2,1,39,50]},
  fr:{fixed:[[1,1],[5,1],[5,8],[7,14],[8,15],[11,1],[11,11],[12,25]],weekday:[],easter:[1,39,50]},
  au:{fixed:[[1,1],[1,26],[4,25],[12,25],[12,26]],weekday:[[6,1,8]],easter:[-2,1]}
};
export function isHoliday(region,year,month,day){
  if(region==='us')return usHoliday(year,month,day);
  const r=RULES[region];if(!r)return false;
  const m=month+1,w=new Date(Date.UTC(year,month,day)).getUTCDay(),ordinal=Date.UTC(year,month,day)/DAY;
  return r.fixed.some(([fm,fd])=>fm===m&&fd===day)||r.weekday.some(([wm,ww,first])=>wm===m&&ww===w&&day>=first&&day<first+7)||r.easter.some(o=>easterOrdinal(year)+o===ordinal);
}
// Calendar arithmetic is UTC-only after extracting the watch's local date.
// Advancing a day must not add 24 hours to a DST-sensitive local timestamp.
export function calendarCells(year,month,day,config){
  const today=Date.UTC(year,month,day),weekday=new Date(today).getUTCDay();
  const offset=(weekday-config.weekStart+7)%7+(config.weeks==='previous-current'?7:0);
  return Array.from({length:14},(_,i)=>{
    const date=new Date(today+(i-offset)*DAY),y=date.getUTCFullYear(),m=date.getUTCMonth(),n=date.getUTCDate(),w=date.getUTCDay();
    const weekend=config.weekends==='sat-sun'?(w===0||w===6):config.weekends==='fri-sat'?(w===5||w===6):false;
    return {year:y,month:m,day:n,weekday:w,today:i===offset,holiday:isHoliday(config.holidays,y,m,n),weekend};
  });
}
