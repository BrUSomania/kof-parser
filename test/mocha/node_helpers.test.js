const assert = require('assert');
const path = require('path');

describe('Node helper static methods on KOF', function () {
  let nodeBundle;
  before(function () {
    const fs = require('fs');
    // Try to load the Node-specific bundle; if it doesn't exist (CI build layouts may differ),
    // fall back to the regular bundle used in tests.
    const nodePath = path.join(__dirname, '..', '..', 'dist', 'kof-parser.node.cjs.js');
    const fallback = path.join(__dirname, '..', '..', 'dist', 'kof-parser.cjs.js');
    if (fs.existsSync(nodePath)) nodeBundle = require(nodePath);
    else if (fs.existsSync(fallback)) nodeBundle = require(fallback);
    else throw new Error('No bundle found in dist/ (expected one of kof-parser.node.cjs.js or kof-parser.cjs.js)');
  });

  it('exposes KOF on the bundle', function () {
    assert.ok(nodeBundle.KOF, 'KOF export is present');
  });

  it('attaches static helper methods to KOF', function () {
    const K = nodeBundle.KOF;
    // Helpers might be attached as static methods on KOF or exported at module root (nodeBundle).
    const hasParseDirectory = (K && typeof K.parseDirectory === 'function') || (typeof nodeBundle.parseDirectory === 'function');
    const hasParseMultipleFiles = (K && typeof K.parseMultipleFiles === 'function') || (typeof nodeBundle.parseMultipleFiles === 'function');
    const hasShow = (K && typeof K.show === 'function') || (typeof nodeBundle.show === 'function');
    assert.ok(hasParseDirectory, 'parseDirectory exists (on KOF or node bundle)');
    assert.ok(hasParseMultipleFiles, 'parseMultipleFiles exists (on KOF or node bundle)');
    assert.ok(hasShow, 'show exists (on KOF or node bundle)');
  });

  it('parseDirectory returns an array of KOF instances for demo/kof_files', function () {
  const K = nodeBundle.KOF;
  const runner = (K && typeof K.parseDirectory === 'function') ? K : nodeBundle;
  const files = runner.parseDirectory(path.join(__dirname, '..', '..', 'demo', 'kof_files'), false);
    assert.ok(Array.isArray(files), 'returned an array');
    assert.ok(files.length > 0, 'found at least one demo kof file');
    const first = files[0];
    assert.ok(first.fileName && typeof first.fileName === 'string', 'first item looks like a KOF instance');
    assert.ok(Array.isArray(first.warnings), 'first item has warnings array');
  });

  it('parseMultipleFiles can parse a single file and return KOF instance', function () {
  const K = nodeBundle.KOF;
  const runner = (K && typeof K.parseMultipleFiles === 'function') ? K : nodeBundle;
  const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
  const entries = require('fs').readdirSync(demoDir).filter(f => f.toLowerCase().endsWith('.kof'));
    assert.ok(entries.length > 0, 'demo files exist');
    const one = path.join(demoDir, entries[0]);
    const arr = K.parseMultipleFiles([one]);
    assert.ok(Array.isArray(arr) && arr.length === 1, 'returned single-element array');
    const k = arr[0];
    assert.strictEqual(typeof k.fileName, 'string');
  });

  it('show prints output and returns metadata array', function () {
  const K = nodeBundle.KOF;
  const runner = (K && typeof K.parseDirectory === 'function') ? K : nodeBundle;
  const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
  const files = runner.parseDirectory(demoDir, false);
    // capture console.log
    const logs = [];
    const orig = console.log;
    console.log = function () { logs.push(Array.from(arguments).join(' ')); };
    try {
      const meta = K.show(files, [0]);
      assert.ok(Array.isArray(meta), 'show returned array');
      assert.ok(logs.length > 0, 'console.log called');
    } finally {
      console.log = orig;
    }
  });

  it('parseSingleFile parses a single file and returns a KOF instance', function () {
  const K = nodeBundle.KOF;
  const runner = (K && typeof K.parseSingleFile === 'function') ? K : nodeBundle;
  const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
  const entries = require('fs').readdirSync(demoDir).filter(f => f.toLowerCase().endsWith('.kof'));
  const one = path.join(demoDir, entries[0]);
  const k = runner.parseSingleFile(one);
    assert.ok(k && typeof k.fileName === 'string', 'returned a KOF instance');
    assert.ok(Array.isArray(k.warnings), 'instance has warnings array');
  });

  it('multi-read five KOF files and KOF.show displays correct info', function () {
  const K = nodeBundle.KOF;
  const runner = (K && typeof K.parseMultipleFiles === 'function') ? K : nodeBundle;
  const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
  const entries = require('fs').readdirSync(demoDir).filter(f => f.toLowerCase().endsWith('.kof'));
    // pick first five files (or fewer if not available)
    const chosen = entries.slice(0, 5).map(f => path.join(demoDir, f));
    const parsed = K.parseMultipleFiles(chosen);
    assert.ok(Array.isArray(parsed), 'parseMultipleFiles returned an array');
    assert.strictEqual(parsed.length, chosen.length, 'parsed count matches requested count');

    // capture console.log output from K.show
    const logs = [];
    const orig = console.log;
    console.log = function () { logs.push(Array.from(arguments).join(' ')); };
    try {
      const metas = K.show(parsed);
      assert.ok(Array.isArray(metas), 'show returned an array');
      assert.strictEqual(metas.length, parsed.length, 'show returned metadata for each parsed file');
      // Ensure there was console output for each file (one line per file)
      assert.ok(logs.length >= parsed.length, 'console.log called for each file');

      // Save the human-readable console output and the JSON metadata to test/mocha/logs
      try {
        const fs = require('fs');
        const outDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const txtPath = path.join(outDir, 'show_output.txt');
        const jsonPath = path.join(outDir, 'show_result.json');
        const header = `KOF.show() captured output - ${new Date().toISOString()}\n\n`;
        fs.writeFileSync(txtPath, header + logs.join('\n') + '\n', 'utf8');
        fs.writeFileSync(jsonPath, JSON.stringify(metas, null, 2), 'utf8');
      } catch (e) {
        // If writing logs fails, make the test fail with a helpful message
        assert.fail('Failed to write show() logs: ' + String(e));
      }
    } finally {
      console.log = orig;
    }
  });
});
