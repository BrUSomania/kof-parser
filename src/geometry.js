"use strict";
// Geometry classes for KOF geodata
Object.defineProperty(exports, "__esModule", { value: true });
exports.WkbGeomPolygon = exports.WkbGeomLinestring = exports.WkbGeomPoint = void 0;
class WkbGeomPoint {
    constructor(x, y, z, meta) {
        this.x = x;
        this.y = y;
        if (z !== undefined)
            this.z = z;
        if (meta)
            this.meta = meta;
    }
}
exports.WkbGeomPoint = WkbGeomPoint;
class WkbGeomLinestring {
    constructor(points, meta) {
        this.points = points;
        if (meta)
            this.meta = meta;
    }
}
exports.WkbGeomLinestring = WkbGeomLinestring;
class WkbGeomPolygon {
    constructor(points, meta) {
        this.points = points;
        if (meta)
            this.meta = meta;
    }
}
exports.WkbGeomPolygon = WkbGeomPolygon;
