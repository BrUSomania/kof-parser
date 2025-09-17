import { KofPoint } from './KofPoint';
import { KofLine } from './KofLine';
import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';

export class KofPolygon {
  rawLines: string[];
  rings: KofLine[];

  constructor(lines: string[]) {
    if (!Array.isArray(lines)) throw new TypeError('KofPolygon expects an array of KOF 05 lines');
    this.rawLines = lines;
    // For now treat entire set as a single outer ring
    this.rings = [ new KofLine(lines) ];
  }

  static fromParsedRows(rows: any[]) {
    const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name||''} ${r.code||''} ${r.northing||''} ${r.easting||''} ${r.elevation||''}`));
    const p = new KofPolygon(lines);
    p.rings = [ KofLine.fromParsedRows(rows) ];
    return p;
  }

  toWkbPolygon(meta?: Record<string, any>) {
    const ring = this.rings[0];
    const ls = ring.toWkbLinestring(meta);
    if (!ls) return null;
    // Ensure closed
    const pts = ls.points;
    const closed = pts.length >= 4 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y;
    if (!closed) {
      const p0 = pts[0];
      pts.push(new WkbGeomPoint(p0.x, p0.y, p0.z, p0.meta));
    }
    const poly = new WkbGeomPolygon([ls]);
    poly.meta = ls.meta || {};
    return poly;
  }

  toString() { return this.rawLines.join('\n'); }
}
