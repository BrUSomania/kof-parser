// Minimal shim: re-export the built CommonJS bundle's exports. Keeps `require('src/kof_v2')` stable during development.
try {
  const bundle = require('../dist/kof-parser.cjs.js');
  module.exports = {
    KOF_V2: bundle.KOF || bundle.KOF_V2 || bundle,
    KOF: bundle.KOF || bundle.KOF_V2 || bundle,
    KofPoint: bundle.KofPoint,
    KofLine: bundle.KofLine,
    KofPolygon: bundle.KofPolygon,
  };
} catch (e) {
  // Clear, actionable error for contributors who forgot to build.
  throw new Error('dist bundle not found. Run `npm run build` before running tests or require the library from dist directly.');
}
