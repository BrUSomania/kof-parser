const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KOF } = require('../../dist/kof-parser.cjs.js');
const proj4 = require('proj4');

describe('demo KOF -> GeoJSON export', function() {
  it('exports geojson for each demo kof file', function() {
    const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    if (!fs.existsSync(demoDir)) this.skip();
    const outDir = path.join(__dirname, '..', 'geojson');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Recursively find .kof files in demoDir (preserve relative paths)
    function walkForKof(dir) {
      const out = [];
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const it of items) {
        const p = path.join(dir, it.name);
        if (it.isDirectory()) out.push(...walkForKof(p));
        else if (it.isFile() && p.toLowerCase().endsWith('.kof')) {
          out.push(path.relative(demoDir, p));
        }
      }
      return out;
    }

    const kofFiles = walkForKof(demoDir);
    assert(kofFiles.length > 0, 'No demo KOF files found in ' + demoDir);

    // register common proj defs we expect in demo filenames
  proj4.defs('EPSG:25832', '+proj=utm +zone=32 +datum=ETRS89 +units=m +no_defs');
  // EPSG:5110 isn't universally available in proj4 by default; register a reasonable NTM10-like tmerc
  proj4.defs('EPSG:5110', '+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=1500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');

  for (const file of kofFiles) {
      const content = fs.readFileSync(path.join(demoDir, file), 'utf8');
      const k = new KOF(file, content);
      k.parse();
      const gj = k.toGeoJSON();
      // basic validation
      assert(gj && gj.type === 'FeatureCollection');
      assert(Array.isArray(gj.features));
      // If the filename indicates EPSG:25832 or EPSG:5110, write only a reprojected EPSG:4326 file
      const m = file.match(/epsg(\d{3,5})/i);
      let outPath;
      if (m && (m[1] === '25832' || m[1] === '5110')) {
        const from = 'EPSG:' + m[1];
        // deep clone and reproject
        const gj4326 = JSON.parse(JSON.stringify(gj));
        const transformCoords = (coords) => {
          if (typeof coords[0] === 'number') {
            const [x, y] = coords;
            const p = proj4(from, 'EPSG:4326', [x, y]);
            return [p[0], p[1]];
          }
          return coords.map(transformCoords);
        };
        for (const f of gj4326.features) f.geometry.coordinates = transformCoords(f.geometry.coordinates);
        outPath = path.join(outDir, file.replace(/epsg\d+/i, 'epsg4326').replace(/\.kof$/i, '.geojson'));
        fs.writeFileSync(outPath, JSON.stringify(gj4326, null, 2), 'utf8');
      } else {
        outPath = path.join(outDir, file.replace(/\.kof$/i, '.geojson'));
        fs.writeFileSync(outPath, JSON.stringify(gj, null, 2), 'utf8');
      }
      // quick read-back check
      const re = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      assert(re.type === 'FeatureCollection');
    }
  });
});
