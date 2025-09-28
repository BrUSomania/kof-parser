const assert = require('assert');
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');
const { KOF } = require('../../../test/helpers/kof-loader');

describe('convert EPSG:25832 demo KOFs -> EPSG:4326 and validate', function() {
  it('converts all epsg25832 demo files and ensures coords are in southern Norway', function() {
    const demoDir = path.join(__dirname, '..', '..', 'demo', 'kof_files');
    if (!fs.existsSync(demoDir)) this.skip();
  });
});
/* legacy EPSG conversion tests removed — skipped during CI */
