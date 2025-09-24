"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KofLine = void 0;
var KofPoint_1 = require("./KofPoint");
var geometry_1 = require("./geometry");
var KofLine = /** @class */ (function () {
    function KofLine(lines) {
        if (!Array.isArray(lines))
            throw new TypeError('KofLine expects an array of KOF 05 lines');
        this.rawLines = lines;
        this.points = lines.map(function (l) { return new KofPoint_1.KofPoint(l); });
    }
    KofLine.fromParsedRows = function (rows) {
        var k = new KofLine(rows.map(function (r) { return (r.raw ? r.raw : "05 ".concat(r.name || '', " ").concat(r.code || '', " ").concat(r.northing || '', " ").concat(r.easting || '', " ").concat(r.elevation || '')); }));
        // override points with parsed data
        k.points = rows.map(function (r) { return KofPoint_1.KofPoint.fromParsed(r); });
        return k;
    };
    KofLine.prototype.toWkbLinestring = function (meta) {
        var pts = this.points.map(function (kp) { var _a, _b, _c; return new geometry_1.WkbGeomPoint((_a = kp.props.easting) !== null && _a !== void 0 ? _a : 0, (_b = kp.props.northing) !== null && _b !== void 0 ? _b : 0, (_c = kp.props.elevation) !== null && _c !== void 0 ? _c : -500, __assign(__assign({}, (kp.props.attrs || {})), { name: kp.props.name || null, fcode: kp.props.code || null, code: kp.props.code })); });
        if (pts.length < 2)
            return null;
        var ls = new geometry_1.WkbGeomLinestring(pts);
        ls.meta = meta ? __assign({}, meta) : {};
        var firstMeta = pts[0].meta || {};
        if (!('name' in ls.meta))
            ls.meta.name = firstMeta.name || null;
        if (!('fcode' in ls.meta))
            ls.meta.fcode = firstMeta.fcode || null;
        return ls;
    };
    Object.defineProperty(KofLine.prototype, "length", {
        get: function () { return this.points.length; },
        enumerable: false,
        configurable: true
    });
    KofLine.prototype.toString = function () { return this.rawLines.join('\n'); };
    return KofLine;
}());
exports.KofLine = KofLine;
