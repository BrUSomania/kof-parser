const assert = require('assert');
const iconv = require('iconv-lite');
const { KOF } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('windows-1252 decoding via iconv-lite', function() {
  it('decodes win1252 bytes and parses special characters æøå', function() {
    const original = '11 owner=æøå\n05 W1 7601 6546000.000 700.000 3.0';
    // encode to windows-1252 bytes and decode like an integration loader would
    const buf = iconv.encode(original, 'win1252');
    const decoded = iconv.decode(buf, 'win1252');
    const k = new KOF('win1252.kof', decoded);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(geoms.length === 1);
  const meta = geoms[0].meta || {}; 
  assert(meta.owner && meta.owner.indexOf('æ') !== -1);
  writeKofLog(k, 'win1252.kof');
  });
});
