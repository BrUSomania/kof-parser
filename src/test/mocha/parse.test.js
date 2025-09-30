const assert = require('assert');
const { KOF } = require('../../../test/helpers/kof-loader');

describe('KOF_V2.parse() (raw string input)', function() {
  it('parses a single 05 point from a raw string', function() {
    const raw = ['-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ',
      '05 P1 1001 6540000.000 314000.000 10.500'
    ].join('\n');

    const inst = KOF.parse(raw, 'inmemory_point.kof');
    assert.ok(inst, 'parse should return an instance');
    const meta = inst.getMetadata();
    assert.strictEqual(meta.fileName, 'inmemory_point.kof');
    assert.strictEqual(meta.numberOfFileLines, 2);
    // After parsing the point should be added to geomCounts
    assert.strictEqual(meta.geomCounts.points, 1);

    const geo = inst.convertToGeoJson();
    assert.ok(geo && geo.type === 'FeatureCollection');
    assert.strictEqual(geo.features.length, 1);
    const feat = geo.features[0];
    assert.strictEqual(feat.geometry.type, 'Point');
  });

  it('parses a simple polygon block from a raw string', function() {
    const rawLines = [
      '-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ',
      '09_91',
      '05 P1 2001 6540100.000 314100.000 1.0',
      '05 P2 2002 6540101.000 314100.000 1.0',
      '05 P3 2003 6540101.000 314101.000 1.0',
      '05 P4 2004 6540100.000 314101.000 1.0',
      '09_96'
    ];
    const raw = rawLines.join('\n');
    const inst = KOF.parse(raw, 'inmemory_polygon.kof');
    assert.ok(inst);
    const meta = inst.getMetadata();
    // polygon count should be 1
    assert.strictEqual(meta.geomCounts.polygons, 1);

    const geo = inst.convertToGeoJson();
    assert.ok(geo && Array.isArray(geo.features));
    // There should be at least one polygon feature
    const polyFeatures = geo.features.filter(f => f.geometry && f.geometry.type === 'Polygon');
    assert.strictEqual(polyFeatures.length, 1);
  });
});
