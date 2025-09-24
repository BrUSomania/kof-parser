"use strict";
// Geometry classes for KOF geodata
Object.defineProperty(exports, "__esModule", { value: true });
exports.WkbGeomPolygon = exports.WkbGeomLinestring = exports.WkbGeomPoint = void 0;
var WkbGeomPoint = /** @class */ (function () {
    function WkbGeomPoint(x, y, z, meta) {
        this.x = x;
        this.y = y;
        if (z !== undefined)
            this.z = z;
        if (meta)
            this.meta = meta;
    }
    return WkbGeomPoint;
}());
exports.WkbGeomPoint = WkbGeomPoint;
var WkbGeomLinestring = /** @class */ (function () {
    function WkbGeomLinestring(points, meta) {
        this.points = points;
        if (meta)
            this.meta = meta;
    }
    return WkbGeomLinestring;
}());
exports.WkbGeomLinestring = WkbGeomLinestring;
var WkbGeomPolygon = /** @class */ (function () {
    function WkbGeomPolygon(rings, meta) {
        this.rings = rings;
        if (meta)
            this.meta = meta;
    }
    return WkbGeomPolygon;
}());
exports.WkbGeomPolygon = WkbGeomPolygon;
