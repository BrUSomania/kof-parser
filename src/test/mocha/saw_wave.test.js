const assert = require('assert');
const { KOF } = require('../../dist/kof-parser.cjs.js');
const fs = require('fs');
const path = require('path');

describe('Multi-line saw/wave codes', function() {
  it('distributes saw (09_72_epsg25832.kof) points zigzag across two lines', function() {
    const p = path.join(__dirname, '..', '..', 'demo', 'kof_files', '72-79_sag', '09_72_epsg25832.kof');
    const content = fs.readFileSync(p, 'utf8');
    const k = new KOF('09_72_epsg25832.kof', content);
    k.parse();
    const gj = k.toGeoJSON();
  // Demo file contains two 09_72 groups, expect 4 LineString features total
  assert.strictEqual(gj.features.length, 4);
  assert(gj.features.every(f => f.geometry.type === 'LineString'));
  });

  it('distributes saw (09_74_epsg25832.kof) across four lines', function() {
    const p = path.join(__dirname, '..', '..', 'demo', 'kof_files', '72-79_sag', '09_74_epsg25832.kof');
    const content = fs.readFileSync(p, 'utf8');
    const k = new KOF('09_74_epsg25832.kof', content);
    k.parse();
    const gj = k.toGeoJSON();
  // Demo file contains two 09_74 groups; parser currently emits 8 LineStrings total
  assert.strictEqual(gj.features.length, 8);
  });

  // wave-distribution placeholder test removed per request

});
