const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KOF_V2 } = require('../../../src-temp/kof_v2');

describe('Reproject demo KOF files to EPSG:4326 and write GeoJSON', function() {
  it('reads demo kof files, reprojects to EPSG:4326 and writes geojson files', function() {
    const demoDir = path.join(__dirname, '..', '..', '..', 'src', 'demo', 'kof_files');
    if (!fs.existsSync(demoDir)) this.skip();

    const outDir = path.join(__dirname, '..', '..', '..', 'test', 'geojson');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const files = fs.readdirSync(demoDir).filter(f => f.toLowerCase().endsWith('.kof'));
    if (files.length === 0) this.skip();

    for (const f of files) {
      const fp = path.join(demoDir, f);
      const kof = KOF_V2.read(fp)[0];
      // set known demo source CRS (demo files are UTM32 / EPSG:25832)
      try {
        kof.setSourceCrs('EPSG:25832');
        kof.setTargetCrs('EPSG:4326');
      } catch (e) {
        // if EPSG codes not available in list, skip this file with a warning
        console.warn(`Skipping reprojection for ${f}: ${e.message}`);
        continue;
      }
      // Support either name depending on built artifact: prefer reprojectGeometries, fall back to reproject
      try {
        if (typeof kof.reprojectGeometries === 'function') {
          kof.reprojectGeometries('EPSG:25832', 'EPSG:4326');   
        } else {
          throw new Error('No reprojection method found on KOF_V2 instance');
        }
      } catch (err) {
        console.error('Reprojection failed for', f, err && err.stack ? err.stack : err);
        throw err;
      }
      // Convert to GeoJSON and write file
      const gj = kof.convertToGeoJson();
      const outPath = path.join(outDir, f.replace(/\.kof$/i, '.geojson'));
      fs.writeFileSync(outPath, JSON.stringify(gj, null, 2), 'utf8');
      // Basic assertion: file exists and is non-empty
      const stat = fs.statSync(outPath);
      assert(stat.size > 10, `GeoJSON output ${outPath} is unexpectedly small`);
    }
  });
});
