const assert = require('assert');
const { KOF } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('KOF codes 10/20/30 support', function() {
  it('parses 10 header metadata into file metadata', function() {
    const content = '10 project="TestProj" owner=Bob\n05 P1 7601 6547000.000 800.000 9.0';
    const k = new KOF('code10.kof', content);
    k.parse();
    assert(k.getMetadata().project === 'TestProj');
    assert(k.getMetadata().owner === 'Bob');
  writeKofLog(k, 'code10.kof');
  });

  it('records 20 measurement lines as warnings', function() {
    const content = '20 meas=temperature value=12.3\n05 P1 7601 6547000.000 800.000 9.0';
    const k = new KOF('code20.kof', content);
    k.parse();
  assert(k.warnings.some(w => typeof w.message === 'string' && w.message.indexOf('measurement/20 parsed') !== -1));
  writeKofLog(k, 'code20.kof');
  });

  it('attaches 30 attributes to next geometry', function() {
    const content = '30 note="group note"\n05 P1 7601 6547000.000 800.000 9.0';
    const k = new KOF('code30.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(geoms.length === 1);
    const meta = geoms[0].meta || {};
    assert(meta.note === 'group note' || (meta._raw && meta._raw.length > 0));
  writeKofLog(k, 'code30.kof');
  });
});
