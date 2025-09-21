const assert = require('assert');
const { KOF } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('encodings, unicode and extra params', function() {
  it('handles UTF-8 content and UTF-8 BOM', function() {
    const body = '11 owner=Åse\n05 P1 7601 6541000.000 200.000 5.0';
    // UTF-8
    const k1 = new KOF('utf8.kof', body);
    k1.parse();
    assert(k1.toWkbGeometries().length === 1);
    // UTF-8 with BOM
    const bom = '\uFEFF' + body;
    const k2 = new KOF('utf8bom.kof', bom);
    k2.parse();
    assert(k2.toWkbGeometries().length === 1);
  writeKofLog(k1, 'utf8.kof');
  writeKofLog(k2, 'utf8bom.kof');
  });

  it('handles emoji and other unicode characters', function() {
    const body = '11 note="Party 🎉"\n05 P2 7601 6542000.123 300.456 10.0';
    const k = new KOF('emoji.kof', body);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(geoms.length === 1);
    const g = geoms[0];
    assert(g.meta && g.meta.note && g.meta.note.indexOf('🎉') !== -1);
  });

  it('handles latin1/ANSI-like bytes (simulate Windows-1252) for characters like æøå', function() {
    // Create a buffer with latin1 encoding for the string '11 owner=æøå\n05 P3 7601 6543000.000 400.000 2.0'
    const latinStr = '11 owner=æøå\n05 P3 7601 6543000.000 400.000 2.0';
    // Simulate reading as latin1 by creating a Buffer and decoding with latin1 via Buffer.toString('latin1')
    const buf = Buffer.from(latinStr, 'latin1');
    const decoded = buf.toString('latin1');
    const k = new KOF('latin1.kof', decoded);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(geoms.length === 1);
    assert(geoms[0].meta && geoms[0].meta.owner && geoms[0].meta.owner.indexOf('æ') !== -1);
  });

  it('parses extra trailing KOF parameters (KOMMENTAR) and preserves them in meta._extra or as key', function() {
    const body = '05 P4 7601 6544000.000 500.000 7.0 KOMMENTAR="This is a test"';
    const k = new KOF('extra.kof', body);
    k.parse();
    const geoms = k.toWkbGeometries();
  writeKofLog(k, 'extra.kof');
    assert(geoms.length === 1);
    const meta = geoms[0].meta || {};
    // Either key present or _extra recorded
    assert(meta.KOMMENTAR === 'This is a test' || (meta._extra && Array.isArray(meta._extra)));
  });

  it('converts to valid GeoJSON structure', function() {
    const body = '11 owner=geo\n05 G1 7601 6545000.000 600.000 12.0\n09 91\n05 L1 7601 6545001.000 601.000 1.0\n05 L2 7602 6545010.000 611.000 1.0\n09 99';
    const k = new KOF('geo.kof', body);
    k.parse();
    const gj = k.toGeoJSON();
    assert(gj && gj.type === 'FeatureCollection');
    assert(Array.isArray(gj.features));
    for (const f of gj.features) {
      assert(f.type === 'Feature');
      assert(f.geometry && f.properties);
      // basic geometry types
      assert(['Point', 'LineString', 'Polygon'].includes(f.geometry.type));
  }
  writeKofLog(k, 'geo.kof');
  });
});
