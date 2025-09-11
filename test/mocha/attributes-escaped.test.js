const assert = require('assert');
const { KOF, WkbGeomPoint } = require('../../dist/kof-parser.cjs.js');

describe('attributes with escaped quotes', function() {
  it('parses escaped double quotes inside double-quoted value', function() {
    const content = `11 owner="Alice \\\"The Ace\\\" Smith"\n05 P1 7601 6541000.000 200.000 5.0`;
    const k = new KOF('esc1.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(geoms.length === 1);
    const p = geoms[0];
    assert(p instanceof WkbGeomPoint);
    assert(p.meta && p.meta.owner === 'Alice "The Ace" Smith');
  });

  it('parses escaped single quotes inside single-quoted value', function() {
    const content = `11 note='It\\'s a test'\n05 P1 7601 6541000.000 200.000 5.0`;
    const k = new KOF('esc2.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(geoms.length === 1);
    const p = geoms[0];
    assert(p.meta && p.meta.note === "It's a test");
  });
});
