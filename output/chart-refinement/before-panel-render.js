// Previous chart layout, retained only for the before/after comparison.
import {calendarCells} from '../../shared/calendar.js';
import {dataWindow} from '../../shared/panel-data.js';
import {drawBitmapText} from '../../shared/type.js';
import {panelColors} from '../../shared/panel-settings.js';
export function drawFooter(ctx,settings,page,data,now,font,clock24){
  const f=settings.footer;if(!f.enabled)return;
  const pal=data.palette,w=f.weather,c=panelColors(settings);
  const text=(t,x,y,color=pal.ink,align='left')=>drawBitmapText(ctx,font,String(t),x,y,color,align);
  const rect=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));};
  const line=(x,y,xx,yy,color)=>{ // integer Bresenham matches the native one-pixel line
    x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;let err=dx+dy;
    while(true){rect(x,y,1,1,color);if(x===xx&&y===yy)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}
  };
  if(page!=='zones')rect(0,184,200,44,pal.bg);
  const timeLabel=minute=>{const h=Math.floor(minute/60),m=String(minute%60).padStart(2,'0');return clock24?`${String(h).padStart(2,'0')}:${m}`:`${h%12||12}:${m}${h<12?'A':'P'}`;};
  if(page==='calendar'){
    const d=new Date(now),cells=calendarCells(d.getFullYear(),d.getMonth(),d.getDate(),f.calendar),months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    text(cells[0].month!==cells[13].month?`${months[cells[0].month]} / ${months[cells[13].month]}`:`${months[d.getMonth()]} ${d.getFullYear()}`,4,191,pal.accent);
    for(let col=0;col<7;col++)text('SMTWTFS'[(col+f.calendar.weekStart)%7],16+col*28,201,pal.edge,'center');
    cells.forEach((day,i)=>{
      const x=4+i%7*28,y=i<7?212:224;let ink=day.holiday?c.holiday:day.weekend?day.weekday===0?c.sunday:c.saturday:pal.ink;
      if(day.today){if(f.calendar.todayStyle==='outline'){line(x+1,y-9,x+22,y-9,c.today);line(x+1,y+1,x+22,y+1,c.today);line(x+1,y-9,x+1,y+1,c.today);line(x+22,y-9,x+22,y+1,c.today);}else{rect(x+1,y-9,22,11,c.today);const channels=[1,3,5].map(i=>parseInt(c.today.slice(i,i+2),16));ink=channels[0]*.299+channels[1]*.587+channels[2]*.114>127?'#000000':'#FFFFFF';}}
      text(day.day,x+12,y,ink,'center');
    });
  }else if(page!=='zones'){
    const tide=page==='tide',humidity=page==='humidity',series=data[tide?'tide':'weather'],window=dataWindow(series,now,f.horizon),kind=tide?'TIDE':humidity?'HUMIDITY':'WEATHER';
    if(tide&&!f.tide.station&&!series?.demo||!tide&&!w.enabled||!window){
      text(kind,4,193,pal.accent);
      text(tide&&!f.tide.station&&!series?.demo?'CHOOSE A NOAA STATION':!tide&&!w.enabled?'ENABLE WEATHER IN SETTINGS':series?.samples?.length?'FORECAST EXPIRED':series?.error?'DATA UNAVAILABLE':'WAITING FOR PHONE',4,214);
    }else{
      const samples=window.samples,metric=p=>tide?p.height*(f.tide.unit==='ft'?3.28:1):humidity?p.humidity*10:w.temperatureUnit==='f'?Math.trunc(p.temperature*9/5)+320:p.temperature;
      const values=samples.map(metric);let lo=Math.min(...values),hi=Math.max(...values);
      if(tide&&f.tide.scale==='fixed'){lo=f.tide.min*100;hi=f.tide.max*100;}
      else if(humidity&&w.humidityScale==='percent'){lo=0;hi=1000;}
      else if(!tide&&!humidity&&w.temperatureScale==='fixed'){lo=w.temperatureMin*10;hi=w.temperatureMax*10;}
      else{const pad=Math.max(10,Math.trunc((hi-lo)/8));lo-=pad;hi+=pad;if(humidity){lo=Math.max(0,lo);hi=Math.min(1000,hi);}}
      const n=values[0],title=tide?`${series.label} ${(n/100).toFixed(1)}${f.tide.unit.toUpperCase()}`:humidity?`RH ${Math.round(n/10)}%`:`${series.label} ${Math.round(n/10)}${w.temperatureUnit.toUpperCase()}`;
      const first=tide?series.high:series.rise,second=tide?series.low:series.set,usefirst=first>=now/1000&&(second<now/1000||first<second),event=usefirst?first:second;
      const stale=series.error||now/1000-series.fetched>(tide?12*3600:w.refreshMinutes*120);
      let right=series.demo?'DEMO':stale?'OLD':event>=now/1000&&(tide||w.solarTimes)?`${tide?usefirst?'H':'L':usefirst?'RISE':'SET'} ${timeLabel(tide?usefirst?series.highMinute:series.lowMinute:usefirst?series.riseMinute:series.setMinute)}`:'';
      if(!right&&!tide&&!humidity&&w.precipitation!=='off')right=w.precipitation==='probability'?`RAIN ${Math.max(...samples.map(p=>p.probability))}%`:`MAX ${(Math.max(...samples.map(p=>p.rain))/10/(w.rainUnit==='in'?25.4:1)).toFixed(w.rainUnit==='in'?2:1)}${w.rainUnit.toUpperCase()}`;
      text(title,4,191);text(right,196,191,pal.accent,'right');
      const left=w.rangeLabels?29:4,width=196-left,ink=tide?c.tide:humidity?c.humidity:c.temperature;
      const x=i=>left+Math.trunc(i*(width-1)/(samples.length-1)),y=n=>215-Math.max(0,Math.min(19,Math.trunc((n-lo)*19/Math.max(1,hi-lo))));
      samples.forEach((p,i)=>{
        const end=x(Math.min(i+1,samples.length-1));
        if(!tide&&w.daylight){line(x(i),194,end,194,p.day?pal.accent:pal.edge);if(!p.day)for(let xx=x(i);xx<end;xx++)if(xx%4===0)for(let yy=198;yy<=214;yy+=4)rect(xx,yy,1,1,pal.edge);}
        if(!tide&&!humidity&&w.precipitation!=='off'){const rain=Math.min(19,Math.trunc(w.precipitation==='probability'?p.probability*19/100:p.rain*19/(w.rainMax*10)));if(rain)rect(x(i),216-rain,Math.min(3,Math.max(1,end-x(i)-1)),rain,c.rain);}
      });
      if(w.grid)for(let xx=left;xx<196;xx+=4)rect(xx,206,1,1,pal.edge);
      if(tide&&f.tide.zeroLine&&lo<0&&hi>0)for(let xx=left;xx<196;xx+=4)rect(xx,y(0),2,1,pal.edge);
      for(let i=1;i<samples.length;i++)line(x(i-1),y(values[i-1]),x(i),y(values[i]),ink);
      if(w.rangeLabels){text(tide?(hi/100).toFixed(1):Math.round(hi/10),25,202,ink,'right');text(tide?(lo/100).toFixed(1):Math.round(lo/10),25,216,ink,'right');}
      for(let k=0;k<3;k++){const index=Math.trunc(k*(samples.length-1)/2),h=samples[index].hour,t=clock24?String(h).padStart(2,'0'):`${h%12||12}${h<12?'A':'P'}`;text(t,k===0?left:k===1?left+Math.trunc(width/2):196,225,pal.ink,k===0?'left':k===1?'center':'right');}
    }
  }
  f.pages.forEach((p,i)=>rect(196-4*(f.pages.length-i),227,p===page?3:1,1,p===page?pal.ink:pal.edge));
}
