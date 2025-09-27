"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KofLine = void 0;
const KofPoint_1 = require("./KofPoint");
const geometry_1 = require("./geometry");
class KofLine {
    constructor(kofStrings, headerFormat = null) {
        var _a, _b;
        if (!Array.isArray(kofStrings))
            throw new TypeError('KofLine constructor expects an array of KOF 05 strings');
        this.props = {
            type: 'line',
            raw: kofStrings,
            points: kofStrings.map(s => new KofPoint_1.KofPoint(s, headerFormat)),
            name: null,
            code: null,
        };
        if (this.props.points.length > 0) {
            // Use the first point's name/code if present, otherwise explicitly null
            this.props.name = (_a = this.props.points[0].props.name) !== null && _a !== void 0 ? _a : null;
            this.props.code = (_b = this.props.points[0].props.code) !== null && _b !== void 0 ? _b : null;
        }
    }
    toString() { return this.props.raw ? this.props.raw.join('\n') : ''; }
    toWkbLinestring(meta) {
        if (this.props.points.length === 0)
            return null;
        const pts = this.props.points.map(p => new geometry_1.WkbGeomPoint(p.props.easting, p.props.northing, p.props.elevation, { name: p.props.name, code: p.props.code }));
        return new geometry_1.WkbGeomLinestring(pts, meta);
    }
    toGeoJSON(meta) {
        if (this.props.points.length === 0)
            return null;
        const coords = this.props.points.map(p => (p.props.elevation !== undefined && p.props.elevation !== null)
            ? [p.props.easting, p.props.northing, p.props.elevation]
            : [p.props.easting, p.props.northing]);
        const properties = { name: this.props.name, code: this.props.code, ...meta };
        return {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties,
        };
    }
    static toWkbFromParsedRows(rows, meta) {
        const line = KofLine.fromParsedRows(rows);
        return line.toWkbLinestring(meta);
    }
    static toGeoJSONFromParsedRows(rows, meta) {
        const line = KofLine.fromParsedRows(rows);
        return line.toGeoJSON(meta);
    }
    static fromParsedRows(rows, headerFormat = null) {
        const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name || ''} ${r.code || ''} ${r.northing || ''} ${r.easting || ''} ${r.elevation || ''}`));
        return new KofLine(lines, headerFormat);
    }
}
exports.KofLine = KofLine;
