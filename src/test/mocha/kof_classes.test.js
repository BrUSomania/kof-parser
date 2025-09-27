const assert = require('assert');
const { describe, it } = require('mocha');

const { KofPoint } = require('../../KofPoint');
const { KofLine } = require('../../KofLine');
const { KofPolygon } = require('../../KofPolygon');

describe('KOF geometry classes', function() {
  describe('KofPoint', function() {
    it('parses fixed-column header lines preserving empty name/code columns', function() {
      const header  = '-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ';
      const line    = ' 05            8245      6540265.715  314095.774    4.593';
      const p = new KofPoint(line, header);
      assert.strictEqual(p.props.name, null, 'empty name should be null');
      assert.strictEqual(p.props.code, '8245');
      assert.ok(Number.isFinite(p.props.northing));
      assert.ok(Number.isFinite(p.props.easting));
    });

    it('falls back to whitespace parsing when header not usable', function() {
      const raw = '05 ANAME 1234 6540265.715 314095.774 4.593';
      const p = new KofPoint(raw, null);
      assert.strictEqual(p.props.name, 'ANAME');
      assert.strictEqual(p.props.code, '1234');
    });
  });

  describe('KofLine', function() {
    it('builds points and picks first point name/code or null', function() {
      // Force whitespace parsing by passing explicit null headerFormat
      const lines = [
        '05 ANAME 7601 6540265.190 314124.250 2.264',
        '05  7601 6540252.500 314130.409 1.253'
      ];
      const l = new KofLine(lines, null);
      assert.strictEqual(l.props.points.length, 2);
      assert.strictEqual(l.props.name, 'ANAME');
      assert.strictEqual(l.props.code, '7601');
    });
  });

  describe('KofPolygon', function() {
    it('inherits KofLine behavior and exposes polygon view', function() {
      // Force whitespace parsing for clarity in tests
      const lines = [
        '05 P1 1000 6540265.190 314124.250 2.264',
        '05 P2 1001 6540252.500 314130.409 1.253'
      ];
      const poly = new KofPolygon(lines, null);
      const pview = poly.propsAsPolygon;
      assert.strictEqual(pview.points.length, 2);
      assert.strictEqual(pview.name, 'P1');
      assert.strictEqual(pview.code, '1000');
    });
  });
});
