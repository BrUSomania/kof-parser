const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KOF, __setProj4 } = require('../../dist/kof-parser.cjs.js');

describe('KOF.reproject error handling', function() {
  it('records reprojectionError and returns original GeoJSON when proj4 throws', function() {
    // load a small demo kof
    const demo = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    const kofFiles = fs.readdirSync(demo).filter(f => f.endsWith('.kof'));
    if (kofFiles.length === 0) this.skip();
    const file = kofFiles[0];
    const content = fs.readFileSync(path.join(demo, file), 'utf8');
    const k = new KOF(file, content, { sourceCrs: 'EPSG:25832' });
    k.parse();
    // Inject a proj4 mock that throws
    __setProj4({
      // simple function that throws when called
      apply: () => { throw new Error('boom'); },
    });

    const original = k.toGeoJSON();
    const re = k.reproject('EPSG:4326');
    // reproject should return a FeatureCollection (original fallback) and set metadata.reprojectionError
    assert(re && re.type === 'FeatureCollection');
    assert(k.metadata.reprojectionError && typeof k.metadata.reprojectionError === 'string');
    // restore proj4 to avoid affecting other tests
    __setProj4(require('proj4'));
  });
});
