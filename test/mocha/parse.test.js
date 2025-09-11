const assert = require('assert');
const { KOF } = require('../../dist/kof-parser.cjs.js');

describe('parseKOFRow canonical cases', function() {
  it('parses columns-style row with header', function() {
    const content = `-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ\n05 LYKT-04 8751 6540290.081 314103.268 7.934`;
    const k = new KOF('t1.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const p = geoms[0];
  // geometry uses x = easting, y = northing
  assert.strictEqual(p.x, 314103.268);
  assert.strictEqual(p.y, 6540290.081);
    assert.strictEqual(p.z, 7.934);
  });

  it('parses whitespace-separated row', function() {
    const content = `05 SKILT-01 7601 6540265.190 314124.250 2.264`;
    const k = new KOF('t2.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const p = geoms[0];
  // geometry uses x = easting, y = northing
  assert.strictEqual(p.x, 314124.25);
  assert.strictEqual(p.y, 6540265.19);
    assert.strictEqual(p.z, 2.264);
  });

  it('defaults missing elevation to -500', function() {
    const content = `05 SKILT-02 7601 6540252.500 314130.409`;
    const k = new KOF('t3.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const p = geoms[0];
    assert.strictEqual(p.z, -500);
  });

  it('emits warning for malformed rows and produces no geometry', function() {
    const content = `05 BADROW abc def`;
    const k = new KOF('t4.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert((!Array.isArray(geoms) || geoms.length === 0) && k.warnings.length > 0);
  });
});
