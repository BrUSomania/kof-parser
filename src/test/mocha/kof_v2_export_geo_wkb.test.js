const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { KOF_V2 } = require('../../../src-temp/kof_v2');

describe('KOF_V2 export WKB and GeoJSON', function() {
  it('exports WKB JSON and GeoJSON for demo kof files', function() {
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
    assert.ok(kofFiles.length > 0, 'Should find demo KOF files');

    const outWkbDir = path.join(__dirname, '..', '..', 'test_output', 'wkb');
    const outGeoDir = path.join(__dirname, '..', '..', 'test_output', 'geojson');
    fs.mkdirSync(outWkbDir, { recursive: true });
    fs.mkdirSync(outGeoDir, { recursive: true });

  // Inspect/assert contents before writing to disk.
  kofFiles.forEach(fp => {
      const instances = KOF_V2.read(fp, true, false);
      const inst = instances[0];
      const wkb = inst.convertToWkbGeometries();
      const geo = inst.convertToGeoJson();

      // Quick assertions BEFORE writing files
      assert.ok(Array.isArray(wkb), 'WKB output should be an array');
      assert.ok(geo && geo.type === 'FeatureCollection', 'GeoJSON output should be a FeatureCollection');

      // If parser metadata indicates geometries were found, require non-empty features
      const meta = inst.getMetadata();
      const totalGeom = (meta && meta.geomCounts) ? (meta.geomCounts.points + meta.geomCounts.lineStrings + meta.geomCounts.polygons) : 0;
      // if (totalGeoms && totalGeoms > 0) { ... legacy check removed }
      if (totalGeom > 0) {
        assert.ok(Array.isArray(geo.features) && geo.features.length > 0, `Expected non-empty GeoJSON features for ${fp}`);
      }

      // Only write files after passing assertions
      const base = path.basename(fp).replace(/\.kof$/i, '');
      fs.writeFileSync(path.join(outWkbDir, base + '.wkb.json'), JSON.stringify(wkb, null, 2), 'utf8');
      fs.writeFileSync(path.join(outGeoDir, base + '.geojson'), JSON.stringify(geo, null, 2), 'utf8');
    });
  });
});
