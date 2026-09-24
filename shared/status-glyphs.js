// A small pixel rendition of the familiar Bluetooth rune. Native and browser
// draw the same rows at the top of the watch face.
export const BLUETOOTH_ROWS=[
  '...#...',
  '...##..',
  '#..#.#.',
  '.#.#..#',
  '..####.',
  '...#...',
  '..####.',
  '.#.#..#',
  '#..#.#.',
  '...##..',
  '...#...'
];

// Small circles are drawn by hand at five pixels, not scaled vector circles.
export const DAY_NIGHT_ROWS=[
  ['.###.','#...#','#...#','#...#','.###.'],
  ['.###.','#####','#####','#####','.###.']
];
export const MARKER_HALO_ROWS=['..###..','.#####.','#######','#######','#######','.#####.','..###..'];
// The subsolar point: a small sun, a 3×3 orb with eight single-pixel rays, as
// small as the place glyphs and cleared the same way.
export const SUN_SIZE=5;
export const SUN_ROWS=['#.#.#','.###.','#####','.###.','#.#.#'];
export const SUN_HALO_ROWS=MARKER_HALO_ROWS;

// Four centered pixel rings. The pulse advances a full pixel every 260 ms,
// sharing these exact masks with the watch instead of resampling an arc.
export const PULSE_SIZE=17;
export const PULSE_ROWS=[5,6,7,8].map(radius=>{
  const rows=Array.from({length:PULSE_SIZE},()=>Array(PULSE_SIZE).fill('.'));
  let x=radius,y=0,error=1-radius;
  while(x>=y){
    for(const [dx,dy]of [[x,y],[y,x],[-y,x],[-x,y],[-x,-y],[-y,-x],[y,-x],[x,-y]])rows[8+dy][8+dx]='#';
    y++;
    if(error<0)error+=2*y+1;else{x--;error+=2*(y-x)+1;}
  }
  return rows.map(row=>row.join(''));
});
