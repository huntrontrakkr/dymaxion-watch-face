import {calendarCells} from './calendar.js';
import {dataWindow} from './panel-data.js';
import {drawBitmapText,textWidth} from './type.js';
import {panelColors} from './panel-settings.js';
import {drawPixelLine} from './pixels.js';
import {drawAxisText,axisValue,chartLayout,chartX,chartY,chartHourLabels} from './chart-axis.js';
export function drawFooter(ctx,settings,page,data,now,font,clock24){
  const f=settings.footer;if(!f.enabled)return;
  const pal=data.palette,w=f.weather,c=panelColors(settings);
  const text=(t,x,y,color=pal.ink,align='left')=>drawBitmapText(ctx,font,String(t),x,y,color,align);
  const rect=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));};
  const line=(x,y,xx,yy,color)=>drawPixelLine(ctx,x,y,xx,yy,color);
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
      const upper=axisValue(hi,tide),lower=axisValue(lo,tide),layout=chartLayout(upper,lower,samples.length,w.rangeLabels,textWidth(font,clock24?'23':'12A'));
      const ink=tide?c.tide:humidity?c.humidity:c.temperature,plotHeight=layout.bottom-layout.top+1;
      const x=i=>chartX(layout,i),y=n=>chartY(n,lo,hi);
      samples.forEach((p,i)=>{
        const end=x(Math.min(i+1,samples.length-1));
        if(!tide&&w.daylight){line(x(i),layout.daylight,end,layout.daylight,p.day?pal.accent:pal.edge);if(!p.day)for(let xx=x(i);xx<end;xx++)if(xx%4===0)for(let yy=layout.top+2;yy<=layout.bottom;yy+=4)rect(xx,yy,1,1,pal.edge);}
        if(!tide&&!humidity&&w.precipitation!=='off'){const rain=Math.min(plotHeight,Math.trunc(w.precipitation==='probability'?p.probability*plotHeight/100:p.rain*plotHeight/(w.rainMax*10)));if(rain)rect(x(i),layout.bottom+1-rain,Math.min(3,Math.max(1,end-x(i)-1),layout.right-x(i)+1),rain,c.rain);}
      });
      if(w.grid)for(let xx=layout.left;xx<=layout.right;xx+=4)rect(xx,Math.trunc((layout.top+layout.bottom)/2),1,1,pal.edge);
      if(tide&&f.tide.zeroLine&&lo<0&&hi>0)for(let xx=layout.left;xx<=layout.right;xx+=4)rect(xx,y(0),Math.min(2,layout.right-xx+1),1,pal.edge);
      for(let i=1;i<samples.length;i++)line(x(i-1),y(values[i-1]),x(i),y(values[i]),ink);
      if(w.rangeLabels){drawAxisText(ctx,upper,layout.left-3,layout.top,ink,'right');drawAxisText(ctx,lower,layout.left-3,layout.bottom-6,ink,'right');}
      line(layout.left,layout.axis,layout.right,layout.axis,pal.edge);
      for(let i=0;i<samples.length;i++){const major=i%layout.step===0;line(x(i),layout.axis+1,x(i),layout.axis+(major?2:1),major?pal.ink:pal.edge);}
      for(const label of chartHourLabels(layout,samples.map(p=>p.hour),clock24,font))text(label.text,label.x,layout.labelBaseline);
    }
  }
  f.pages.forEach((p,i)=>rect(196-4*(f.pages.length-i),227,p===page?3:1,1,p===page?pal.ink:pal.edge));
}
