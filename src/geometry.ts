// Geometry classes for KOF geodata

export class WkbGeomPoint {
  x: number;
  y: number;
  z?: number;
  meta?: Record<string, any>;
  constructor(x: number, y: number, z?: number, meta?: Record<string, any>) {
    this.x = x;
    this.y = y;
    if (z !== undefined) this.z = z;
    if (meta) this.meta = meta;
  }
}

export class WkbGeomLinestring {
  points: WkbGeomPoint[];
  meta?: Record<string, any>;
  constructor(points: WkbGeomPoint[], meta?: Record<string, any>) {
    this.points = points;
    if (meta) this.meta = meta;
  }
}

export class WkbGeomPolygon {
  points: WkbGeomPoint[];
  meta?: Record<string, any>;
  constructor(points: WkbGeomPoint[], meta?: Record<string, any>) {
    this.points = points;
    if (meta) this.meta = meta;
  }
}
