const { KOF } = require('../dist/kof-parser.cjs.js');

function eq(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exitCode = 1; } else { console.log('OK:', msg); } }

// 1) Columns-style row (header present -> columns mode)
const content1 = `-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ
05 LYKT-04 8751 6540290.081 314103.268 7.934`;
let k1 = new KOF('t1.kof', content1);
k1.parse();
let g1 = k1.toWkbGeometries();
assert(Array.isArray(g1) && g1.length === 1, 'columns: one geometry produced');
if (g1[0]) {
  const p = g1[0];
  assert(p.x === 314103.268 && p.y === 6540290.081 && p.z === 7.934, 'columns: coords and elevation match');
}

// 2) Whitespace-separated row
const content2 = `05 SKILT-01 7601 6540265.190 314124.250 2.264`;
let k2 = new KOF('t2.kof', content2);
k2.parse();
let g2 = k2.toWkbGeometries();
assert(Array.isArray(g2) && g2.length === 1, 'whitespace: one geometry produced');
if (g2[0]) {
  const p = g2[0];
  assert(p.x === 314124.25 && p.y === 6540265.19 && p.z === 2.264, 'whitespace: coords and elevation match');
}

// 3) Missing elevation (should default -500)
const content3 = `05 SKILT-02 7601 6540252.500 314130.409`;
let k3 = new KOF('t3.kof', content3);
k3.parse();
let g3 = k3.toWkbGeometries();
assert(Array.isArray(g3) && g3.length === 1, 'missing-elev: one geometry produced');
if (g3[0]) {
  const p = g3[0];
  assert(p.z === -500, 'missing-elev: elevation defaulted to -500');
}

// 4) Malformed row (should produce no geometry and a warning)
const content4 = `05 BADROW abc def`;
let k4 = new KOF('t4.kof', content4);
k4.parse();
let g4 = k4.toWkbGeometries();
assert((!Array.isArray(g4) || g4.length === 0) && k4.warnings.length > 0, 'malformed: no geometry and warning emitted');

console.log('\nAll tests run. exitCode:', process.exitCode || 0);
