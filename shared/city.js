export const CITY_SIZE=52,CITY_MAX_AGE=6*3600,CITY_REFRESH=3600000;
// The watch's Micro face has Latin letters. Request English place names and
// fold accented Latin forms to supported glyphs instead of displaying boxes.
export function cityText(value){
  if(typeof value!=='string')return '';
  const extra={'ß':'ss','Æ':'AE','æ':'ae','Ø':'O','ø':'o','Ł':'L','ł':'l','Đ':'D','đ':'d','Ð':'D','ð':'d','Þ':'Th','þ':'th'};
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[ßÆæØøŁłĐđÐðÞþ]/g,ch=>extra[ch])
    .replace(/['’]/g,'').replace(/[^A-Za-z0-9 .,-]/g,' ').replace(/\s+/g,' ').trim().slice(0,39).trim();
}
export function validateLocation(input){
  if(input===undefined)return {mode:'auto',name:''};
  if(!input||!['auto','manual'].includes(input.mode)||typeof input.name!=='string'||input.name.length>80)throw new Error('Choose automatic location or a city name of up to 80 characters.');
  const name=cityText(input.name);
  if(input.name.trim()&&!name)throw new Error('Use a Latin spelling for the city name.');
  return {mode:input.mode,name};
}
export function reverseCity(raw){
  for(const item of raw?.features||[]){
    const p=item?.properties||{},name=cityText(p.city||p.town||p.village||(['city','locality'].includes(p.type)?p.name:''));
    if(name)return name;
  }
  throw new Error('No city was found for this location.');
}
export function cityIsUsable(city,now=Date.now()){
  return !!cityText(city?.name)&&(city.manual||Number.isInteger(city.fetched)&&city.fetched>0&&city.fetched<=now/1000+300&&now/1000-city.fetched<=CITY_MAX_AGE);
}
export function encodeCity(city={}){
  const b=new Uint8Array(CITY_SIZE),v=new DataView(b.buffer),name=cityText(city.name);
  // Flag 4: bytes 48-51 hold latitude and longitude in tenths of a degree.
  const position=!city.manual&&cityHasPosition(city);
  b[0]=1;b[1]=(city.manual?1:0)|(city.stale?2:0)|(position?4:0);v.setUint32(4,city.fetched||0,true);
  [...name].forEach((ch,i)=>b[8+i]=ch.charCodeAt(0));
  if(position){v.setInt16(48,Math.round(city.lat*10),true);v.setInt16(50,Math.round(city.lon*10),true);}
  return b;
}
export function cityHasPosition(city){return Number.isFinite(city?.lat)&&Math.abs(city.lat)<=90&&Number.isFinite(city?.lon)&&Math.abs(city.lon)<=180;}
export function clockCaption(date,city,ampm,width,measure,separator=' / '){
  const prefix=date?date+separator:'',suffix=ampm?' '+ampm:'';
  if(!city)return (date+(date&&ampm?separator:'')+ampm).trim();
  let name=city;
  if(measure(prefix+name+suffix)>width){
    while(name&&measure(prefix+name+'...'+suffix)>width)name=name.slice(0,-1);
    name=name.trimEnd()+'...';
  }
  return prefix+name+suffix;
}
