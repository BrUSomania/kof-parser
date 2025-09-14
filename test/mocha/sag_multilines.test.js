const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { KOF } = require('../../dist/kof-parser.cjs.js');

describe('Sag multilines (72..79)', function () {
  const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files', '72-79_sag');

  // Expected counts reflect parser output (multiple 09 groups per file can increase totals)
  const cases = [
    { file: '09_72_epsg25832.kof', expected: 4 },
    { file: '09_73_epsg25832.kof', expected: 3 },
    { file: '09_74_epsg25832.kof', expected: 7 },
    { file: '09_75_epsg25832.kof', expected: 5 },
    { file: '09_76_epsg25832.kof', expected: 5 },
    { file: '09_77_epsg25832.kof', expected: 6 },
    { file: '09_78_epsg25832.kof', expected: 7 },
    { file: '09_79_epsg25832.kof', expected: 8 }
  ];

  cases.forEach(c => {
    it(`parses ${c.file} and emits ${c.expected} LineStrings`, function () {
      const content = fs.readFileSync(path.join(demoDir, c.file), 'utf8');
      // KOF constructor in the distributed bundle expects (fileName, fileContent)
      const k = new KOF(c.file, content);
      const gj = k.toGeoJSON();
      const lines = (gj.features || []).filter(f => f.geometry && f.geometry.type === 'LineString');
      assert.strictEqual(lines.length, c.expected, `expected ${c.expected} LineStrings but got ${lines.length}`);
    });
  });
});
