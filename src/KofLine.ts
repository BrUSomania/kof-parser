import { KofPoint } from './KofPoint';
import { WkbGeomLinestring } from './geometry';

export interface KofLineProps {
  raw?: string;
  name?: string;
  code?: string;
  points: KofPoint[];
}

export class KofLine {
  props: KofLineProps;

  constructor(kofPoints: KofPoint[]) {
    if (!Array.isArray(kofPoints) || kofPoints.length === 0) {
      throw new TypeError('KofLine expects a non-empty array of KofPoint instances');
    }
    this.props = {
      raw: kofPoints.map(p => p.props.raw).join('\n'),
      name: kofPoints[0].props.name || undefined,
      code: kofPoints[0].props.code || undefined,
      points: kofPoints
    };
  }

  toString() { return this.props.raw; }

  // toWkbLinestring(meta?: Record<string, any>) {
  //   if (this.props.points.length < 2) return null;
  //   const pts = this.props.points.map(p => new KofPoint(p.props.raw, null /* no headerFormat here */));
  //   const wkbPoints = pts.map(p => new KofPoint(p.props.raw, null /* no headerFormat here */));
  //   const linestring = new WkbGeomLinestring(wkbPoints);
  //   return linestring.toWkb();
  // }

  static fromParsedRows(rows: any[]) {
    const points = rows.map(r => KofPoint.fromParsed(r));
    return new KofLine(points);
  }
}
