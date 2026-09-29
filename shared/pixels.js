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
  // The same Bresenham as Pebble's graphics_draw_line (the error starts at half
  // the longer side), so ties at gentle slopes fall on the same pixels.
  const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=Math.abs(yy-y),sy=y<yy?1:-1;
  let error=Math.trunc((dx>dy?dx:-dy)/2);ctx.fillStyle=color;
  while(true){
    if(!dotted||x%2===0)ctx.fillRect(x,y,1,1);if(x===xx&&y===yy)break;
    const was=error;if(was>-dx){error-=dy;x+=sx;}if(was<dy){error+=dx;y+=sy;}
  }
}
