const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KOF, __setProj4 } = require('../../dist/kof-parser.cjs.js');

describe('KOF.reproject success handling', function() {
  it('applies proj4 transform to coordinates and returns reprojected GeoJSON', function() {
    // load a small demo kof
    const demo = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    const kofFiles = fs.readdirSync(demo).filter(f => f.endsWith('.kof'));
    if (kofFiles.length === 0) this.skip();
    const file = kofFiles[0];
    const content = fs.readFileSync(path.join(demo, file), 'utf8');
    const k = new KOF(file, content, { sourceCrs: 'EPSG:25832' });
    k.parse();
    const original = k.toGeoJSON();

    // predictable offsets to validate reprojection
    const dx = 1111.5;
    const dy = -2222.25;

    // Inject a proj4 mock that deterministically offsets coordinates
    __setProj4(function(from, to, coords) {
      // coords is expected to be [x, y]
      return [coords[0] + dx, coords[1] + dy];
    });

    const re = k.reproject('EPSG:4326');
    assert(re && re.type === 'FeatureCollection');

    // Verify the first feature's first coordinate was offset by dx/dy
    if (original.features.length > 0 && re.features.length > 0) {
      const origCoords = original.features[0].geometry.coordinates;
      const newCoords = re.features[0].geometry.coordinates;
      // drill down to the first numeric coordinate pair for Point/LineString/Polygon
      const topPair = (c) => {
        if (!Array.isArray(c)) return c;
        if (typeof c[0] === 'number') return c;
        return topPair(c[0]);
      };
      const o = topPair(origCoords);
      const n = topPair(newCoords);
      assert.ok(Math.abs(n[0] - (o[0] + dx)) < 1e-6, `x expected ${o[0] + dx} got ${n[0]}`);
      assert.ok(Math.abs(n[1] - (o[1] + dy)) < 1e-6, `y expected ${o[1] + dy} got ${n[1]}`);
    }

    // restore real proj4
    __setProj4(require('proj4'));
  });
});
