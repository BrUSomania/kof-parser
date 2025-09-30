const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KOF_V2 } = require('../../../src/kof_v2');

describe('Multi-line saw codes - KOF_V2 saw constructor', function() {
  it('distributes saw (09_72_epsg25832.kof) across 2 lines (per group)', function() {
    const p = path.join(__dirname, '..', '..', 'demo', 'kof_files', '72-79_sag', '09_72_epsg25832.kof');
    const content = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    const idx = content.findIndex(l => l && /09_7[2-9]/.test(l));
    assert.ok(idx >= 0);
    const code = content[idx].trim().split(/\s+/)[0].replace(/\s+/g, '_');
    const stopIdx = content.slice(idx + 1).findIndex(l => l && /^(09_9[69]|09_91|09_8[2-9]|09_7[2-9])/.test((l || '').trim()));
    const end = stopIdx === -1 ? content.length : (idx + 1 + stopIdx);
    const block = content.slice(idx + 1, end);
    const pts = block.filter(l => l && l.trim().startsWith('05'));

    const kv = KOF_V2._readSingleFile(p, false);
    const n = parseInt(code.split('_')[1], 10) - 70;
    const lines = kv._constructKofLinesFromSawMethod(pts, n);
    assert.ok(Array.isArray(lines));
    assert.strictEqual(lines.length, n);
    const total = lines.reduce((s, l) => s + l.props.points.length, 0);
    assert.strictEqual(total, pts.length);
      // Print debug/inspection output similar to inspector
      console.log(`Found block ${code} in ${path.basename(p)}`);
      console.log('Total 05 rows in block:', pts.length);
      console.log('Saw output flattened lines count:', lines.length);
      lines.forEach((kl, i) => {
        const cnt = kl.props && Array.isArray(kl.props.points) ? kl.props.points.length : 0;
        console.log(`Line ${i}: ${cnt} points`);
        (kl.props.points || []).forEach(pt => console.log('  ' + (pt.toString ? pt.toString() : (pt.props && pt.props.raw) || '').trim()));
      });
  });

  it('distributes saw (09_74_epsg25832.kof) across 4 lines (per group)', function() {
    const p = path.join(__dirname, '..', '..', 'demo', 'kof_files', '72-79_sag', '09_74_epsg25832.kof');
    const content = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    const idx = content.findIndex(l => l && /09_7[2-9]/.test(l));
    assert.ok(idx >= 0);
    const code = content[idx].trim().split(/\s+/)[0].replace(/\s+/g, '_');
    const stopIdx = content.slice(idx + 1).findIndex(l => l && /^(09_9[69]|09_91|09_8[2-9]|09_7[2-9])/.test((l || '').trim()));
    const end = stopIdx === -1 ? content.length : (idx + 1 + stopIdx);
    const block = content.slice(idx + 1, end);
    const pts = block.filter(l => l && l.trim().startsWith('05'));

    const kv = KOF_V2._readSingleFile(p, false);
    const n = parseInt(code.split('_')[1], 10) - 70;
    const lines = kv._constructKofLinesFromSawMethod(pts, n);
    assert.ok(Array.isArray(lines));
    assert.strictEqual(lines.length, n);
    const total = lines.reduce((s, l) => s + l.props.points.length, 0);
    assert.strictEqual(total, pts.length);
  });

});
