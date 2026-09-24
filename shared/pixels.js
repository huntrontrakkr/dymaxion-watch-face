// Native display primitives: opaque, whole pixels only. Do not smooth these
// with Canvas paths; the Pebble draws the same one-pixel linework and masks.
export function drawPixelRows(ctx,rows,x,y,color){
  x=Math.round(x);y=Math.round(y);ctx.fillStyle=color;
  rows.forEach((row,ry)=>{
    for(let rx=0;rx<row.length;rx++)if(row[rx]==='#')ctx.fillRect(x+rx,y+ry,1,1);
  });
}
// Dotted lines light only even columns, so a series reads apart from a solid one.
export function drawPixelLine(ctx,x,y,xx,yy,color,dotted=false){
  x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);
  const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;
  let error=dx+dy;ctx.fillStyle=color;
  while(true){
    if(!dotted||x%2===0)ctx.fillRect(x,y,1,1);if(x===xx&&y===yy)break;
    const twice=2*error;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}
  }
}
