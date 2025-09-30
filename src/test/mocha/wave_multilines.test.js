const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { KOF_V2 } = require('../../../src/kof_v2');

describe('Bølge multilines (82..89) - KOF_V2 wave constructor', function () {
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
    it(`constructs ${c.expected} KofLine objects for ${c.file}`, function () {
      const p = path.join(demoDir, c.file);
      const content = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      // find the block start (first 09_8x line)
      const idx = content.findIndex(l => l && /09_8[2-9]/.test(l));
      assert.ok(idx >= 0, 'expected a wave block in the demo file');
      const code = content[idx].trim().split(/\s+/)[0].replace(/\s+/g, '_');
      const stopIdx = content.slice(idx + 1).findIndex(l => l && /^(09_9[69]|09_91|09_8[2-9]|09_7[2-9])/.test((l || '').trim()));
      const end = stopIdx === -1 ? content.length : (idx + 1 + stopIdx);
      const block = content.slice(idx + 1, end);
      const pts = block.filter(l => l && l.trim().startsWith('05'));

      const kv = KOF_V2._readSingleFile(p, false);
      const n = parseInt(code.split('_')[1], 10) - 80;
      const lines = kv._constructKofLinesFromWaveMethod(pts, n);
      // Print block and per-line contents for debugging/inspection (matches inspector output)
      console.log(`Found block ${code} in ${path.basename(p)}`);
      console.log('Total 05 rows in block:', pts.length);
      console.log('Wave output flattened lines count:', lines.length);
      lines.forEach((kl, i) => {
        const cnt = kl.props && Array.isArray(kl.props.points) ? kl.props.points.length : 0;
        console.log(`Line ${i}: ${cnt} points`);
        (kl.props.points || []).forEach(pt => console.log('  ' + (pt.toString ? pt.toString() : (pt.props && pt.props.raw) || '').trim()));
      });
      assert.strictEqual(Array.isArray(lines), true);
      assert.strictEqual(lines.length, c.expected);
      // Validate every returned KofLine has a points array and at least one point
      lines.forEach(kl => {
        assert.ok(kl && kl.props && Array.isArray(kl.props.points));
        assert.ok(kl.props.points.length >= 1);
      });
      // Total points across all KofLine objects should equal pts.length
      const total = lines.reduce((s, l) => s + l.props.points.length, 0);
      assert.strictEqual(total, pts.length);
    });
  });
});
