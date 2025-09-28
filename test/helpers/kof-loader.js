// Test helper loader: prefer built artifact in dist. Tests expect the library to be built
// (CI should run `npm run build` before `npm test`). Try common compiled paths and
// give a clear error if none are present.
try {
  module.exports = require('../../dist/kof-parser.cjs.js');
} catch (e) {
  try {
    module.exports = require('../../dist/index.js');
  } catch (e2) {
    throw new Error('kof-parser build artifact not found in dist/. Run `npm run build` before running tests.');
  }
}
