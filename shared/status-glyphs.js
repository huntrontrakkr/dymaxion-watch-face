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

// Quiet Time: three Zs, rising, beside the Bluetooth rune while it is on.
export const QUIET_ROWS=[
  '.......###',
  '........#.',
  '..####.###',
  '....#.....',
  '...#......',
  '..####....',
  '..........',
  '#####.....',
  '...#......',
  '..#.......',
  '.#........',
  '#####.....'
];

// Charging: a bolt in the place of the battery's % sign, the same size.
export const CHARGE_ROWS=['...##','..##.','.##..','#####','..##.','.##..','##...'];

// Night and day beside each name in the time-zone drawer: a crescent moon and
// the map's sun (SUN_ROWS below), so neither can be mistaken for a place's
// own marker (the Point and Ring markers are a filled and an open circle).
export const DAY_NIGHT_ROWS=[
  ['..###','.##..','.#...','.##..','..###'],
  ['#.#.#','.###.','#####','.###.','#.#.#']
];
export const MARKER_HALO_ROWS=['..###..','.#####.','#######','#######','#######','.#####.','..###..'];
// The subsolar point: a small sun, a 3×3 orb with eight single-pixel rays, as
// small as the place glyphs and cleared the same way.
export const SUN_SIZE=5;
export const SUN_ROWS=['#.#.#','.###.','#####','.###.','#.#.#'];
export const SUN_HALO_ROWS=MARKER_HALO_ROWS;
// You: a bullseye one size up from the place glyphs, in the clock's ink, since
// the big clock is this place's time. Its clearing is one size up too.
export const HERE_SIZE=7;
export const HERE_ROWS=['..###..','.#...#.','#.###.#','#.###.#','#.###.#','.#...#.','..###..'];
export const HERE_HALO_ROWS=['..#####..','.#######.','#########','#########','#########','#########','#########','.#######.','..#####..'];

// Four centered pixel rings. The pulse advances a full pixel every 120 ms,
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
