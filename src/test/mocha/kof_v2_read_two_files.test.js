const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { KOF_V2 } = require('../../../src-temp/kof_v2');

describe('KOF_V2 read two files at once', function() {
  it('accepts an array of two file paths and returns two KOF_V2 instances', function() {
    const base = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    const f1 = path.join(base, '01-01_point_single_utm32_epsg25832.kof');
    const f2 = path.join(base, '03-01_polygon_single_utm32_epsg25832.kof');

    // Sanity: files must exist for the test to be meaningful
    assert.ok(fs.existsSync(f1), `Test KOF file missing: ${f1}`);
    assert.ok(fs.existsSync(f2), `Test KOF file missing: ${f2}`);

    const instances = KOF_V2.read([f1, f2], true, false);
    // Expect an array of two instances
    assert.ok(Array.isArray(instances), 'KOF_V2.read should return an array');
    assert.strictEqual(instances.length, 2, 'Should return exactly two instances when passing two file paths');

    // Validate each instance minimally
    instances.forEach((inst, idx) => {
      assert.ok(inst && typeof inst.getFilePath === 'function', `instance ${idx} missing getFilePath()`);
      assert.strictEqual(path.basename(inst.getFilePath()), path.basename([f1, f2][idx]));
      // should expose metadata and geometries
      const meta = inst.getMetadata();
      assert.ok(meta && typeof meta === 'object', 'getMetadata() should return an object');
      const geoms = inst.getFileGeometries();
      assert.ok(Array.isArray(geoms), 'getFileGeometries() should return an array');
    });
  });
});
