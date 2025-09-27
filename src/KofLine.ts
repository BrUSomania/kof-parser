import { KofPoint } from './KofPoint';
import { WkbGeomLinestring } from './geometry';

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

  static fromParsedRows(rows: any[], headerFormat: string|null = null) {
    const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name||''} ${r.code||''} ${r.northing||''} ${r.easting||''} ${r.elevation||''}`));
    return new KofLine(lines, headerFormat);
  }
}
