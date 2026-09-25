// Small cartographic glyphs, drawn at native Pebble resolution.
// The shape distinguishes places even when their colors look alike.
const glyph=(name,meaning,...rows)=>({name,meaning,rows});
export const MARKERS=[
  glyph('Diamond','Outlined diamond',
    '..#..','.#.#.','#...#','.#.#.','..#..'),
  glyph('Point','Solid dot',
    '.....','.###.','.###.','.###.','.....'),
  glyph('Ring','Outlined circle',
    '.###.','#...#','#...#','#...#','.###.'),
  glyph('Triangle','Outlined, point up',
    '.....','..#..','.#.#.','#...#','#####'),
  glyph('Plus','Crosshair',
    '..#..','..#..','#####','..#..','..#..'),
  // Notation and bookkeeping marks, drawn to read at five pixels.
  glyph('Dagger','Footnote mark',
    '..#..','.###.','..#..','..#..','..#..'),
  glyph('Double dagger','Second footnote mark',
    '..#..','.###.','..#..','.###.','..#..'),
  glyph('Asterisk','Note mark',
    '..#..','#.#.#','.###.','#.#.#','..#..'),
  glyph('Pilcrow','Paragraph mark',
    '.####','###.#','.##.#','..#.#','..#.#'),
  glyph('Check','Tick',
    '....#','...#.','#.#..','.#...','.....'),
  glyph('Cross','Diagonal cross',
    '#...#','.#.#.','..#..','.#.#.','#...#'),
  glyph('Number','Hash sign',
    '.#.#.','#####','.#.#.','#####','.#.#.')
];
export const MARKER_SIZE=5;

// Version-1 compositions predating markerSet used 21 larger pictograms.
// Preserve their places and colors while reducing those choices to the
// nearest quiet shape. New compositions carry markerSet: 2.
export const LEGACY_MARKER_IDS=[
  0,1,2,3,3,0,0,2,3,0,2,4,1,3,2,1,1,3,2,4,3
];

export function drawMarkerPixels(ctx,marker,x,y,color){
  ctx.fillStyle=color;
  for(let row=0;row<MARKER_SIZE;row++)for(let col=0;col<MARKER_SIZE;col++)
    if(MARKERS[marker].rows[row][col]==='#')ctx.fillRect(x+col-2,y+row-2,1,1);
}
