import { KofPoint } from './KofPoint';
import { KofLine } from './KofLine';
import { WkbGeomPoint, WkbGeomPolygon } from './geometry';

export interface KofPolygonProps {
  type:   'polygon';
  raw:    string[] | null;
  points: KofPoint[];
  name:   string | null;
  code:   string | null;
}

// KofPolygon reuses KofLine behaviour. We extend KofLine and replace the
// props object with a polygon-specific shape while preserving the points and
// raw input built by the super constructor.
export class KofPolygon extends KofLine {
  // Don't redeclare `props` with a conflicting type. Instead provide a
  // typed view into the superclass props for polygon consumers.

  constructor(kofStrings: string[], headerFormat: string|null = null) {
    super(kofStrings, headerFormat);
  }

  get propsAsPolygon(): KofPolygonProps {
    const sp = (this.props as any) as {
      raw: string[] | null;
      points: KofPoint[];
      name: string | null;
      code: string | null;
    };
    return {
      type: 'polygon',
      raw: sp.raw,
      points: sp.points,
      name: sp.name ?? null,
      code: sp.code ?? null,
    };
  }

  toString() { return this.props.raw ? this.props.raw.join('\n') : ''; }
  toWkbPolygon(meta?: Record<string, any>) {
    if (this.propsAsPolygon.points.length === 0) return null;
    const pts = this.propsAsPolygon.points.map(p => new WkbGeomPoint(p.props.easting, p.props.northing, p.props.elevation, { name: p.props.name, code: p.props.code }));
    return new WkbGeomPolygon(pts, meta);
  }

  toGeoJSON(meta?: Record<string, any>) {
    if (this.propsAsPolygon.points.length === 0) return null;
    // GeoJSON polygon uses an array of linear rings; ensure first ring is closed
    const coords = this.propsAsPolygon.points.map(p => (p.props.elevation !== undefined && p.props.elevation !== null)
      ? [p.props.easting, p.props.northing, p.props.elevation]
      : [p.props.easting, p.props.northing]
    );
    // Close ring if necessary
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) coords.push(first.slice());
    const properties = { name: this.propsAsPolygon.name, code: this.propsAsPolygon.code, ...meta };
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] as any },
      properties,
    };
  }

  static toWkbFromParsedRows(rows: any[], meta?: Record<string, any>) {
    const poly = KofPolygon.fromParsedRows(rows);
    return poly.toWkbPolygon(meta);
  }

  static toGeoJSONFromParsedRows(rows: any[], meta?: Record<string, any>) {
    const poly = KofPolygon.fromParsedRows(rows);
    return poly.toGeoJSON(meta);
  }

  static fromParsedRows(rows: any[], headerFormat: string|null = null) {
    const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name||''} ${r.code||''} ${r.northing||''} ${r.easting||''} ${r.elevation||''}`));
    return new KofPolygon(lines, headerFormat);
  }
}
