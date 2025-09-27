const path = require('path');
const fs = require('fs');
const { KOF_V2 } = require('../src-temp/kof_v2');

function extract05(lines) {
  return lines.filter(l => l && l.trim() && l.trim().startsWith('05'));
}

function inspectFile(p) {
  const content = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  // find the first 09_.. line (saw or wave)
  let idx = content.findIndex(l => l && /09_(7[2-9]|8[2-9])/.test(l));
  if (idx === -1) {
    console.log('No saw/wave block found in', p);
    return;
  }
  const codeLine = content[idx].trim();
  const code = codeLine.split(/\s+/)[0].replace(/\s+/g, '_');
  console.log('Found block', code, 'in', path.basename(p));
  // find stop code index
  let stopIdx = -1;
  for (let i = idx + 1; i < content.length; i++) {
    const t = (content[i] || '').trim();
    if (!t) continue;
    if (/^09_9[6|9]/.test(t) || /^09_91/.test(t) || /^09_(7[2-9]|8[2-9])/.test(t)) { stopIdx = i; break; }
  }
  if (stopIdx === -1) stopIdx = content.length;
  const blockLines = content.slice(idx + 1, stopIdx);
  const pts = extract05(blockLines);
  console.log('Total 05 rows in block:', pts.length);
  const kv = KOF_V2._readSingleFile(p, false);
    if (/09_7[2-9]/.test(code)) {
    const n = parseInt(code.split('_')[1], 10) - 70;
    const out = kv._constructKofLinesFromSawMethod(pts, n);
    console.log('Saw output flattened lines count:', out.length);
    // The current saw implementation uses round-robin distribution (i % n)
    const buckets = Array.from({ length: n }, () => []);
    for (let i = 0; i < pts.length; i++) buckets[i % n].push(pts[i]);
    buckets.forEach((b, i) => {
      console.log(`Line ${i}: ${b.length} points`);
      b.forEach(l => console.log('  ' + (l || '').trim()));
    });
  } else if (/09_8[2-9]/.test(code)) {
    const n = parseInt(code.split('_')[1], 10) - 80;
    const out = kv._constructKofLinesFromWaveMethod(pts, n);
    console.log('Wave output flattened lines count:', out.length);
    // Reconstruct buckets using the same up-then-down wave index sequence
    // so the inspector shows exactly what the method produced.
    const buckets = Array.from({ length: n }, () => []);
    if (n === 1) {
      buckets[0].push(...pts);
    } else {
      const cycleLen = n * 2;
      for (let i = 0; i < pts.length; i++) {
        const k = i % cycleLen;
        const idx = (k < n) ? k : (cycleLen - k - 1);
        buckets[idx].push(pts[i]);
      }
    }
    buckets.forEach((b, i) => {
      console.log(`Line ${i}: ${b.length} points`);
      b.forEach(l => console.log('  ' + (l || '').trim()));
    });
  }
}

const p1 = path.join(__dirname, '..', 'src', 'demo', 'kof_files', '72-79_sag', '09_75_epsg25832.kof');
const p2 = path.join(__dirname, '..', 'src', 'demo', 'kof_files', '82-89_bolge', '09_86_epsg25832.kof');
inspectFile(p1);
console.log('---');
inspectFile(p2);
