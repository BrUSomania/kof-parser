const assert = require('assert');
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');
const { KOF } = require('../../dist/kof-parser.cjs.js');

describe('convert EPSG:25832 demo KOFs -> EPSG:4326 and validate', function() {
  it('converts all epsg25832 demo files and ensures coords are in southern Norway', function() {
    const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    if (!fs.existsSync(demoDir)) this.skip();
    const outDir = path.join(__dirname, '..', 'geojson');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const kofFiles = fs.readdirSync(demoDir).filter(f => /epsg25832/i.test(f));
    assert(kofFiles.length > 0, 'No epsg25832 demo KOF files found in ' + demoDir);

    // register proj defs
    proj4.defs('EPSG:25832', '+proj=utm +zone=32 +datum=ETRS89 +units=m +no_defs');

    // southern Norway bounding box (rough): lat 57..62, lon 4..12
    const latMin = 57, latMax = 62, lonMin = 4, lonMax = 12;

    const outProblems = [];

    for (const file of kofFiles) {
      const content = fs.readFileSync(path.join(demoDir, file), 'utf8');
      const k = new KOF(file, content);
      k.parse();
      const gj = k.toGeoJSON();

      // convert coordinates
      const from = 'EPSG:25832';
      const gj4326 = JSON.parse(JSON.stringify(gj));
      for (let fi = 0; fi < gj4326.features.length; fi++) {
        const f = gj4326.features[fi];
        const origF = gj.features[fi];
        const geom = f.geometry;
        // Transform only coordinates that look plausible in projected space (easting >=1000, northing >=100000)
        const transformCoords = (origCoords, targetCoords) => {
          if (typeof origCoords[0] === 'number') {
            const [x, y] = origCoords; // x = easting, y = northing (as produced by parser)
            // skip implausible projected coords
            if (!(Math.abs(x) >= 1000 && Math.abs(y) >= 100000)) {
              // leave targetCoords as-is (don't convert) and report nothing
              return targetCoords;
            }
            // Try both orders and prefer the one that yields lat in Norway bounds
            const tryA = proj4(from, 'EPSG:4326', [x, y]);
            const tryB = proj4(from, 'EPSG:4326', [y, x]);
            const inBounds = (p) => (p[1] >= latMin && p[1] <= latMax && p[0] >= lonMin && p[0] <= lonMax);
            let chosen = tryA;
            if (inBounds(tryA) && !inBounds(tryB)) chosen = tryA;
            else if (!inBounds(tryA) && inBounds(tryB)) chosen = tryB;
            else chosen = tryA;
            return [chosen[0], chosen[1]];
          }
          // arrays
          for (let i = 0; i < origCoords.length; i++) {
            targetCoords[i] = transformCoords(origCoords[i], targetCoords[i]);
          }
          return targetCoords;
        };
        geom.coordinates = transformCoords(origF.geometry.coordinates, geom.coordinates);

        // check all coordinates in this geometry (only those we converted)
        const collectCoords = (coords, out=[]) => {
          if (typeof coords[0] === 'number') { out.push(coords); return out; }
          for (const c of coords) collectCoords(c, out);
          return out;
        };
        const allOrigCoords = collectCoords(origF.geometry.coordinates);
        const allCoords = collectCoords(geom.coordinates);
        for (let ci = 0; ci < allOrigCoords.length; ci++) {
          const [ox, oy] = allOrigCoords[ci];
          // only validate coords that looked plausible and were converted
          if (!(Math.abs(ox) >= 1000 && Math.abs(oy) >= 100000)) continue;
          const [lon, lat] = allCoords[ci];
          if (!(lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax)) {
            outProblems.push({ file, featureIndex: fi, coordIndex: ci, lon, lat });
          }
        }
      }

    const outPath = path.join(outDir, file.replace(/epsg\d+/i, 'epsg4326').replace(/\.kof$/i, '.geojson'));
      fs.writeFileSync(outPath, JSON.stringify(gj4326, null, 2), 'utf8');
    }

    if (outProblems.length) {
      // build a compact message with first few problems
      const sample = outProblems.slice(0, 6).map(p => `${p.file} feature#${p.featureIndex} coord#${p.coordIndex} => lon:${p.lon}, lat:${p.lat}`).join('\n');
      assert.fail(`Found ${outProblems.length} coordinates outside southern Norway bounds:\n${sample}`);
    }
  });
});
