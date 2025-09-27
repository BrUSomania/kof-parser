import { KofPoint } from './KofPoint';
import { WkbGeomPoint, WkbGeomLinestring } from './geometry';

export interface KofLineProps {
  type:   'line';
  raw:    string[] | null;
  points: KofPoint[];
  name:   string | null;
  code:   string | null;
}

export class KofLine {
  props: KofLineProps;

  constructor(kofStrings: string[], headerFormat: string|null = null) {
    if (!Array.isArray(kofStrings)) throw new TypeError('KofLine constructor expects an array of KOF 05 strings');
    this.props = {
      type: 'line',
      raw: kofStrings,
      points: kofStrings.map(s => new KofPoint(s, headerFormat)),
      name: null,
      code: null,
    };
    if (this.props.points.length > 0) {
      // Use the first point's name/code if present, otherwise explicitly null
      this.props.name = this.props.points[0].props.name ?? null;
      this.props.code = this.props.points[0].props.code ?? null;
    }
  }

  toString() { return this.props.raw ? this.props.raw.join('\n') : ''; }
  toWkbLinestring(meta?: Record<string, any>) {
    if (this.props.points.length === 0) return null;
    const pts = this.props.points.map(p => new WkbGeomPoint(p.props.easting, p.props.northing, p.props.elevation, { name: p.props.name, code: p.props.code }));
    return new WkbGeomLinestring(pts, meta);
  }

  toGeoJSON(meta?: Record<string, any>) {
    if (this.props.points.length === 0) return null;
    const coords = this.props.points.map(p => (p.props.elevation !== undefined && p.props.elevation !== null)
      ? [p.props.easting, p.props.northing, p.props.elevation]
      : [p.props.easting, p.props.northing]
    );
    const properties = { name: this.props.name, code: this.props.code, ...meta };
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords as any },
      properties,
    };
  }

  static toWkbFromParsedRows(rows: any[], meta?: Record<string, any>) {
    const line = KofLine.fromParsedRows(rows);
    return line.toWkbLinestring(meta);
  }

  static toGeoJSONFromParsedRows(rows: any[], meta?: Record<string, any>) {
    const line = KofLine.fromParsedRows(rows);
    return line.toGeoJSON(meta);
  }

  static fromParsedRows(rows: any[], headerFormat: string|null = null) {
    const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name||''} ${r.code||''} ${r.northing||''} ${r.easting||''} ${r.elevation||''}`));
    return new KofLine(lines, headerFormat);
  }
}
