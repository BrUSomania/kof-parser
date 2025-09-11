const assert = require('assert');
const { KOF, WkbGeomPoint, WkbGeomLinestring } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('advanced attributes and malformed rows', function() {
  it('parses double-quoted multi-token attribute values', function() {
    const content = `11 owner="Alice Smith" description="main route"\n05 P1 7601 6541000.000 200.000 5.0`;
    const k = new KOF('adv1.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const p = geoms[0];
    assert(p instanceof WkbGeomPoint);
    assert(p.meta && p.meta.owner === 'Alice Smith');
    assert(p.meta && p.meta.description === 'main route');
  writeKofLog(k, 'adv1.kof');
  });

  it('parses single-quoted attribute values and attaches to groups', function() {
    const content = `11 route='north-south'\n09 91\n05 A1 7601 6542000.000 300.000 1.0\n05 A2 7602 6542010.000 310.000 1.0\n09 99`;
    const k = new KOF('adv2.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const g = geoms[0];
    assert(g instanceof WkbGeomLinestring);
    assert(g.meta && g.meta.route === 'north-south');
  writeKofLog(k, 'adv2.kof');
  });

  it('stores raw tokens for attribute lines with no key=value', function() {
    const content = `11 some free text here\n05 P1 7601 6541000.000 200.000 5.0`;
    const k = new KOF('adv3.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    assert(Array.isArray(geoms) && geoms.length === 1);
    const p = geoms[0];
    assert(p.meta && Array.isArray(p.meta._raw));
    assert(p.meta._raw[0] === 'some');
  writeKofLog(k, 'adv3.kof');
  });

  it('handles malformed rows gracefully (missing numeric tokens)', function() {
    const content = `05 BADROW name code notanumber notanumber`;
    const k = new KOF('adv4.kof', content);
    k.parse();
    const geoms = k.toWkbGeometries();
    // Should be empty due to malformed row
    assert(Array.isArray(geoms) && geoms.length === 0);
  // warning should be present (structured)
  assert(k.warnings.length > 0);
  assert(typeof k.warnings[0].line === 'number');
  assert(typeof k.warnings[0].message === 'string');
  writeKofLog(k, 'adv4.kof');
  });
});
