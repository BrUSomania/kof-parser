const assert = require('assert');
const { KOF, WkbGeomPoint, WkbGeomLinestring } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('attributes (11/12) attach to next geometry', function() {
  it('attaches attribute to next standalone point', function() {
    const content = `11 owner=alice\n05 P1 7601 6541000.000 200.000 5.0`;
    const k = new KOF('attr1.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const p = geoms[0];
    assert(p instanceof WkbGeomPoint);
    // pendingAttrs should have been applied to point.meta
    assert(p.meta && p.meta.owner === 'alice');
  writeKofLog(k, 'attr1.kof');
  });

  it('attaches attribute to next group (linestring)', function() {
    const content = `11 route=main\n09 91\n05 A1 7601 6542000.000 300.000 1.0\n05 A2 7602 6542010.000 310.000 1.0\n09 99`;
    const k = new KOF('attr2.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const g = geoms[0];
    assert(g instanceof WkbGeomLinestring);
    // pendingAttrs should have been applied to linestring.meta
    assert(g.meta && g.meta.route === 'main');
  writeKofLog(k, 'attr2.kof');
  });
});
