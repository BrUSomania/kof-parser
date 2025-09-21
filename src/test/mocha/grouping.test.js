const assert = require('assert');
const { KOF, WkbGeomLinestring, WkbGeomPolygon } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('grouping (lines & polygons)', function() {
  it('parses a linestring group (09..91 start / 09..99 end)', function() {
    const content = `09 91\n05 SKILT-01 7601 6540265.190 314124.250 2.264\n05 SKILT-02 7602 6540266.190 314125.250 2.264\n09 99`;
    const k = new KOF('lines.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const g = geoms[0];
    assert(g instanceof WkbGeomLinestring);
    assert.strictEqual(g.points.length, 2);
    const p0 = g.points[0];
    const p1 = g.points[1];
    assert.strictEqual(p0.x, 314124.25);
    assert.strictEqual(p0.y, 6540265.19);
    assert.strictEqual(p1.x, 314125.25);
    assert.strictEqual(p1.y, 6540266.19);
  writeKofLog(k, 'lines.kof');
  });

  it('parses a polygon group and ensures ring is closed', function() {
    const content = `09 91\n05 A 7601 6540000.000 100.000 1.0\n05 B 7602 6540010.000 110.000 1.0\n05 C 7603 6540020.000 120.000 1.0\n09 96`;
    const k = new KOF('poly.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const g = geoms[0];
    assert(g instanceof WkbGeomPolygon);
    assert(Array.isArray(g.rings) && g.rings.length === 1);
    const ring = g.rings[0];
    // original 3 points should become a closed ring of 4 points (last == first)
    assert.strictEqual(ring.points.length, 4);
    const first = ring.points[0];
    const last = ring.points[ring.points.length - 1];
    assert.strictEqual(first.x, last.x);
    assert.strictEqual(first.y, last.y);
  writeKofLog(k, 'poly.kof');
  });
});
