import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {AXIS_GLYPHS,RANGE_GLYPHS,RANGE_GAP,CHART,rangeTextWidth,axisTextWidth,axisValue,chartLayout,chartX,chartY,chartHourLabels,tideMarks} from '../shared/chart-axis.js';
// Hour labels use the compact chart numerals.
const maxHourWidth=clock24=>axisTextWidth(clock24?'23':'12A');
test('measured chart gutters and dense hourly labels fit signed values, units and partial horizons',()=>{
  assert.equal(chartLayout('28','14',25).left,10,'narrow range figures: one pixel margin, seven wide, two pixel gap');
  assert.equal(chartLayout('101','45',25).left,12);
  for(const [count,expected]of [[13,7],[25,9],[49,9]]){
    const layout=chartLayout('28','14',count),hours=Array.from({length:count},(_,i)=>(12+i)%24);
    assert.equal(chartHourLabels(layout,hours,true).length,expected);
  }
  assert.equal(axisValue(-155),'-16');assert.equal(axisValue(-5,true),'-0.1');
  for(const [lo,hi,decimal]of [[-150,280,false],[-35,155,true],[-10000,10000,true],[0,1000,false]])for(let count=2;count<=49;count++)for(const clock24 of [true,false])for(const range of [true,false])for(let start=0;start<24;start++){
    const upper=axisValue(hi,decimal),lower=axisValue(lo,decimal),layout=chartLayout(upper,lower,count,range,maxHourWidth(clock24));
    const labels=chartHourLabels(layout,Array.from({length:count},(_,i)=>(start+i)%24),clock24);
    if(range)assert.equal(layout.left-RANGE_GAP-Math.max(rangeTextWidth(upper),rangeTextWidth(lower)),1,'range labels start one pixel from the edge');
    assert.equal(chartX(layout,0),layout.left);assert.equal(chartX(layout,count-1),197);
    assert.equal(chartY(lo-100,lo,hi),CHART.bottom);assert.equal(chartY(hi+100,lo,hi),CHART.top);
    labels.forEach((label,i)=>{
      assert(label.x>=1&&label.x+label.width<=199,'axis labels stay on-screen');
      if(i)assert(label.x-(labels[i-1].x+labels[i-1].width)>=2,'labels retain a two-pixel gap');
    });
  }
  // Read the supplied local hour for each sample: a repeated DST hour must not
  // be silently replaced by arithmetic on the first hour.
  const hours=[0,1,1,2,3],labels=chartHourLabels(chartLayout('28','14',5),hours,true);
  assert.deepEqual(labels.map(l=>l.text),['00','01','01','02','03']);
});
test('native and browser chart metrics, pixel glyphs and axis placements agree',()=>{
  mkdirSync('test-results',{recursive:true});
  execFileSync('cc',['-std=c11','-Wall','-Wextra','-Werror','-Iwatchface/src/c','tests/chart-axis-test.c','watchface/src/c/chart_axis.c','-o','test-results/chart-axis-test']);
  const fonts=execFileSync('test-results/chart-axis-test',['font'],{encoding:'utf8'}).trim().split('\n');
  assert.deepEqual(fonts,[...'0123456789-.AP?'].map(char=>[char,AXIS_GLYPHS[char][0].length,...AXIS_GLYPHS[char].map(row=>parseInt(row.replaceAll('.','0').replaceAll('#','1'),2))].join(' ')));
  const texts=['28','-16','-0.1','101','1000','7.5'],range=execFileSync('test-results/chart-axis-test',['range',...texts],{encoding:'utf8'}).trim().split('\n');
  assert.deepEqual(range,[...[...'0123456789-.?'].map(char=>[char,RANGE_GLYPHS[char][0].length,...RANGE_GLYPHS[char].map(row=>parseInt(row.replaceAll('.','0').replaceAll('#','1'),2))].join(' ')),...texts.map(t=>String(rangeTextWidth(t)))]);
  assert(Object.values(RANGE_GLYPHS).every(g=>g.length===7&&g[0].length<=3),'seven tall, at most three wide');
  const cases=[],expected=[];
  for(const [lo,hi,decimal]of [[140,280,0],[-155,225,0],[-35,155,1],[-10000,10000,1],[0,1000,0]])for(let count=2;count<=49;count++)for(const clock24 of [0,1])for(const range of [0,1]){
    const hours=Array.from({length:count},(_,i)=>(i+23)%24),upper=axisValue(hi,decimal),lower=axisValue(lo,decimal),layout=chartLayout(upper,lower,count,range,maxHourWidth(clock24));
    const widths=hours.map(hour=>axisTextWidth(clock24?String(hour).padStart(2,'0'):`${hour%12||12}${hour<12?'A':'P'}`));
    cases.push([lo,hi,decimal,count,clock24,range,maxHourWidth(clock24),...hours,...widths].join(' '));
    const labels=chartHourLabels(layout,hours,clock24);
    expected.push([upper,lower,layout.left,layout.step,chartY(lo-10,lo,hi),chartY(hi+10,lo,hi),...labels.map(l=>[l.index,l.tick,l.x,l.width,l.text].join(','))].join(' '));
  }
  const native=execFileSync('test-results/chart-axis-test',[],{input:cases.join('\n'),encoding:'utf8',maxBuffer:2_000_000}).trim().split('\n');
  assert.deepEqual(native,expected);
});
test('tide marks: every high and low, heights over the highs, the same on the watch',()=>{
  const layout=chartLayout('1.9','-0.2',25,true,12);
  const marks=tideMarks(layout,-20,190,[{seconds:-60,value:160,high:true},{seconds:3*3600,value:165,high:true},{seconds:9*3600+1800,value:5,high:false},{seconds:24*3600,value:170,high:true},{seconds:25*3600,value:150,high:true}]);
  assert.equal(marks.length,3,'events outside the chart are left out');
  assert.deepEqual(marks.map(m=>[m.high,m.label]),[[true,'1.7'],[false,''],[true,'1.7']]);
  assert.equal(marks[0].x,chartX(layout,3));assert(marks[2].labelX+rangeTextWidth('1.7')-1<=layout.right,'labels stay on the chart');
  // A peak at the top of the chart puts its height below; low enough, above.
  assert(marks[0].labelY>marks[0].y);
  const low=tideMarks(layout,-20,400,[{seconds:3*3600,value:100,high:true}])[0];assert(low.labelY+7<low.y,'room above: the height goes over the peak');
  const cases=[],expected=[];let seed=7;const rand=n=>(seed=(seed*1103515245+12345)%2147483648)%n;
  for(let k=0;k<400;k++){
    const count=[13,25,49][k%3],lo=rand(400)-200,hi=lo+10+rand(600),range=k%2,n=rand(11),events=[];
    let t=rand(7200)-3600;for(let i=0;i<n;i++){events.push({seconds:t,value:lo-50+rand(hi-lo+100),high:i%2===0});t+=3000+rand(40000);}
    cases.push([lo,hi,count,range,n,...events.flatMap(e=>[e.seconds,e.value,+e.high])].join(' '));
    const layout=chartLayout(axisValue(hi,true),axisValue(lo,true),count,!!range,12),marks=tideMarks(layout,lo,hi,events);
    expected.push([marks.length,...marks.map(m=>[m.x,m.y,+m.high,m.label,m.labelX,m.labelY].join(','))].join(' '));
  }
  const native=execFileSync('test-results/chart-axis-test',['tide'],{input:cases.join('\n'),encoding:'utf8',maxBuffer:2_000_000}).trim().split('\n');
  assert.deepEqual(native,expected);
});
