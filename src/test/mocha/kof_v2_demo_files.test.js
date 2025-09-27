const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { KOF_V2 } = require('../../../src-temp/kof_v2');
const { writeKofLog } = require('./log_helper');

describe('KOF_V2 demo files smoke test', function() {
  it('reads all .kof files under demo/kof_files and produces KOF_V2 instances', function() {
    const demoRoot = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    function walk(dir) {
      let results = [];
      fs.readdirSync(dir, { withFileTypes: true }).forEach(dent => {
        const p = path.join(dir, dent.name);
        if (dent.isDirectory()) results = results.concat(walk(p));
        else if (dent.isFile() && dent.name.toLowerCase().endsWith('.kof')) results.push(p);
      });
      return results;
    }
    const kofFiles = walk(demoRoot);
    assert.ok(kofFiles.length > 0, 'Should find at least one .kof demo file');

    kofFiles.forEach((fp) => {
      // Use the KOF_V2 static reader which returns an instance array
      const instances = KOF_V2.read(fp, true, false);
      assert.ok(Array.isArray(instances) && instances.length > 0, `KOF_V2.read must return an array for ${fp}`);
      const inst = instances[0];
      assert.ok(inst.getFilePath && typeof inst.getFilePath === 'function', 'instance should expose getFilePath()');
      // Quick sanity checks
      assert.strictEqual(path.basename(inst.getFilePath()), path.basename(fp));
      assert.ok(inst.getMetadata && typeof inst.getMetadata === 'function', 'instance should expose getMetadata()');
      // Write a log to make debugging easier if something goes wrong
      try { writeKofLog(inst); } catch (e) { /* non-fatal */ }
    });
  });
});
