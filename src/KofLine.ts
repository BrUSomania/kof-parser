import { KofPoint } from './KofPoint';
import { WkbGeomPoint, WkbGeomLinestring } from './geometry';

export class KofLine {
  rawLines: string[];
  points: KofPoint[];

  constructor(lines: string[]) {
    if (!Array.isArray(lines)) throw new TypeError('KofLine expects an array of KOF 05 lines');
    this.rawLines = lines;
    this.points = lines.map(l => new KofPoint(l));
  }

  static fromParsedRows(rows: any[]) {
    const k = new KofLine(rows.map(r => (r.raw ? r.raw : `05 ${r.name||''} ${r.code||''} ${r.northing||''} ${r.easting||''} ${r.elevation||''}`)) );
    // override points with parsed data
    k.points = rows.map(r => KofPoint.fromParsed(r));
    return k;
  }

  toWkbLinestring(meta?: Record<string, any>) {
    const pts = this.points.map(kp => new WkbGeomPoint(kp.props.easting ?? 0, kp.props.northing ?? 0, kp.props.elevation ?? -500, { ...(kp.props.attrs || {}), name: kp.props.name || null, fcode: kp.props.code || null, code: kp.props.code }));
    if (pts.length < 2) return null;
    const ls = new WkbGeomLinestring(pts);
    ls.meta = meta ? { ...meta } : {};
    const firstMeta = pts[0].meta || {};
    if (!('name' in ls.meta)) ls.meta.name = firstMeta.name || null;
    if (!('fcode' in ls.meta)) ls.meta.fcode = firstMeta.fcode || null;
    return ls;
  }

  get length() { return this.points.length; }

  toString() { return this.rawLines.join('\n'); }
}
