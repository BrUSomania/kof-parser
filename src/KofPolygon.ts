import { KofPoint } from './KofPoint';
import { KofLine } from './KofLine';
// import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';

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

  static fromParsedRows(rows: any[], headerFormat: string|null = null) {
    const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name||''} ${r.code||''} ${r.northing||''} ${r.easting||''} ${r.elevation||''}`));
    return new KofPolygon(lines, headerFormat);
  }

  toString() { return this.props.raw ? this.props.raw.join('\n') : ''; }
}
