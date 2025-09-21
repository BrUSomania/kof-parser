const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { KOF } = require('../../dist/kof-parser.cjs.js');

describe('Bølge multilines (82..89)', function () {
  const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files', '82-89_bolge');

  const cases = [
    { file: '09_82_epsg25832.kof', expected: 2 },
    { file: '09_83_epsg25832.kof', expected: 3 },
    { file: '09_84_epsg25832.kof', expected: 4 },
    { file: '09_85_epsg25832.kof', expected: 5 },
    { file: '09_86_epsg25832.kof', expected: 6 },
    { file: '09_87_epsg25832.kof', expected: 7 },
    { file: '09_88_epsg25832.kof', expected: 8 },
    { file: '09_89_epsg25832.kof', expected: 9 }
  ];

  cases.forEach(c => {
    it(`parses ${c.file} and emits ${c.expected} LineStrings`, function () {
      const content = fs.readFileSync(path.join(demoDir, c.file), 'utf8');
      const k = new KOF(c.file, content);
      const gj = k.toGeoJSON();
      const lines = (gj.features || []).filter(f => f.geometry && f.geometry.type === 'LineString');
      assert.strictEqual(lines.length, c.expected, `expected ${c.expected} LineStrings but got ${lines.length}`);
    });
  });
});
