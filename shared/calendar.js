const DAY=86400000;
function observed(year,month,day){const d=new Date(Date.UTC(year,month,day));return +d+(d.getUTCDay()===6?-DAY:d.getUTCDay()===0?DAY:0);}
export function usHoliday(year,month,day){
  const d=new Date(Date.UTC(year,month,day)),stamp=+d,w=d.getUTCDay();
  for(const y of [year,year+1])if([[0,1],[5,19],[6,4],[10,11],[11,25]].some(([m,n])=>observed(y,m,n)===stamp))return true;
  return w===1&&((month===0&&day>=15&&day<=21)||(month===1&&day>=15&&day<=21)||(month===4&&day+7>31)||(month===8&&day<=7)||(month===9&&day>=8&&day<=14))||month===10&&w===4&&day>=22&&day<=28;
}
// Calendar arithmetic is UTC-only after extracting the watch's local date.
// Advancing a day must not add 24 hours to a DST-sensitive local timestamp.
export function calendarCells(year,month,day,config){
  const today=Date.UTC(year,month,day),weekday=new Date(today).getUTCDay();
  const offset=(weekday-config.weekStart+7)%7+(config.weeks==='previous-current'?7:0);
  return Array.from({length:14},(_,i)=>{
    const date=new Date(today+(i-offset)*DAY),y=date.getUTCFullYear(),m=date.getUTCMonth(),n=date.getUTCDate(),w=date.getUTCDay();
    const weekend=config.weekends==='sat-sun'?(w===0||w===6):config.weekends==='fri-sat'?(w===5||w===6):false;
    return {year:y,month:m,day:n,weekday:w,today:i===offset,holiday:config.holidays==='us'&&usHoliday(y,m,n),weekend};
  });
}
