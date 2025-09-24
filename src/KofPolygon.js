"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KofPolygon = void 0;
var KofLine_1 = require("./KofLine");
var geometry_1 = require("./geometry");
var KofPolygon = /** @class */ (function () {
    function KofPolygon(lines) {
        if (!Array.isArray(lines))
            throw new TypeError('KofPolygon expects an array of KOF 05 lines');
        this.rawLines = lines;
        // For now treat entire set as a single outer ring
        this.rings = [new KofLine_1.KofLine(lines)];
    }
    KofPolygon.fromParsedRows = function (rows) {
        var lines = rows.map(function (r) { return (r.raw ? r.raw : "05 ".concat(r.name || '', " ").concat(r.code || '', " ").concat(r.northing || '', " ").concat(r.easting || '', " ").concat(r.elevation || '')); });
        var p = new KofPolygon(lines);
        p.rings = [KofLine_1.KofLine.fromParsedRows(rows)];
        return p;
    };
    KofPolygon.prototype.toWkbPolygon = function (meta) {
        var ring = this.rings[0];
        var ls = ring.toWkbLinestring(meta);
        if (!ls)
            return null;
        // Ensure closed
        var pts = ls.points;
        var closed = pts.length >= 4 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y;
        if (!closed) {
            var p0 = pts[0];
            pts.push(new geometry_1.WkbGeomPoint(p0.x, p0.y, p0.z, p0.meta));
        }
        var poly = new geometry_1.WkbGeomPolygon([ls]);
        poly.meta = ls.meta || {};
        return poly;
    };
    KofPolygon.prototype.toString = function () { return this.rawLines.join('\n'); };
    return KofPolygon;
}());
exports.KofPolygon = KofPolygon;
