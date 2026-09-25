import './gallery.css';
const fields=['palette','layout','clock','panel'];
const label=value=>value==='zones'?'Time zones':value==='calendar'?'Two-week calendar':value.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
const gallery=document.getElementById('gallery'),form=document.querySelector('form');
form.addEventListener('submit',event=>event.preventDefault());
try{
  const response=await fetch(new URL('./gallery/manifest.json',document.baseURI));
  if(!response.ok)throw new Error('Gallery unavailable');
  const {entries}=await response.json(),cards=[];
  document.getElementById('face-total').textContent=entries.length;
  document.getElementById('palette-total').textContent=new Set(entries.map(entry=>entry.theme)).size;
  document.title=`${entries.length} perspectives — Dymaxion`;
  for(const field of fields){
    const key=field==='palette'?'theme':field;
    for(const value of new Set(entries.map(entry=>entry[key])))document.getElementById(field).add(new Option(field==='palette'?value:label(value),value));
  }
  for(const entry of entries){
    const figure=document.createElement('figure');figure.className='face';
    const image=document.createElement('img');image.src=new URL('./gallery/'+entry.image,document.baseURI).href;
    image.width=200;image.height=228;image.loading='lazy';
    image.alt=`${entry.theme}, ${label(entry.layout)} composition, ${label(entry.clock)} clock and ${label(entry.panel)} panel`;
    const caption=document.createElement('figcaption'),heading=document.createElement('h2'),number=document.createElement('span');
    number.className='number';number.textContent=entry.id.slice(0,2);heading.append(number,entry.theme);
    const detail=document.createElement('p');detail.textContent=`${label(entry.layout)} · ${label(entry.clock)}\n${label(entry.panel)}`;detail.style.whiteSpace='pre-line';
    const download=document.createElement('a');download.textContent='Download this layout ↓';download.href=new URL('./gallery/'+entry.preset,document.baseURI).href;download.download='dymaxion-'+entry.preset;
    caption.append(heading,detail,download);figure.append(image,caption);gallery.append(figure);cards.push({entry,figure});
  }
  function filter(){
    let shown=0;
    for(const {entry,figure} of cards){
      figure.hidden=fields.some(field=>{const value=document.getElementById(field).value;return value&&value!==entry[field==='palette'?'theme':field];});
      if(!figure.hidden)shown++;
    }
    document.getElementById('count').textContent=`${shown} of ${entries.length} faces`;
    document.getElementById('empty').hidden=shown>0;
  }
  form.addEventListener('change',filter);
  form.addEventListener('reset',event=>{
    event.preventDefault();
    for(const field of fields)document.getElementById(field).value='';
    filter();
  });
  filter();
}catch{
  document.getElementById('error').hidden=false;document.getElementById('count').textContent='Gallery unavailable';form.hidden=true;
}
