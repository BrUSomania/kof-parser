"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KofPolygon = void 0;
const KofLine_1 = require("./KofLine");
const geometry_1 = require("./geometry");
// KofPolygon reuses KofLine behaviour. We extend KofLine and replace the
// props object with a polygon-specific shape while preserving the points and
// raw input built by the super constructor.
class KofPolygon extends KofLine_1.KofLine {
    // Don't redeclare `props` with a conflicting type. Instead provide a
    // typed view into the superclass props for polygon consumers.
    constructor(kofStrings, headerFormat = null) {
        super(kofStrings, headerFormat);
    }
    get propsAsPolygon() {
        var _a, _b;
        const sp = this.props;
        return {
            type: 'polygon',
            raw: sp.raw,
            points: sp.points,
            name: (_a = sp.name) !== null && _a !== void 0 ? _a : null,
            code: (_b = sp.code) !== null && _b !== void 0 ? _b : null,
        };
    }
    toString() { return this.props.raw ? this.props.raw.join('\n') : ''; }
    toWkbPolygon(meta) {
        if (this.propsAsPolygon.points.length === 0)
            return null;
        const pts = this.propsAsPolygon.points.map(p => new geometry_1.WkbGeomPoint(p.props.easting, p.props.northing, p.props.elevation, { name: p.props.name, code: p.props.code }));
        return new geometry_1.WkbGeomPolygon(pts, meta);
    }
    toGeoJSON(meta) {
        if (this.propsAsPolygon.points.length === 0)
            return null;
        // GeoJSON polygon uses an array of linear rings; ensure first ring is closed
        const coords = this.propsAsPolygon.points.map(p => (p.props.elevation !== undefined && p.props.elevation !== null)
            ? [p.props.easting, p.props.northing, p.props.elevation]
            : [p.props.easting, p.props.northing]);
        // Close ring if necessary
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first && last && (first[0] !== last[0] || first[1] !== last[1]))
            coords.push(first.slice());
        const properties = { name: this.propsAsPolygon.name, code: this.propsAsPolygon.code, ...meta };
        return {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [coords] },
            properties,
        };
    }
    static toWkbFromParsedRows(rows, meta) {
        const poly = KofPolygon.fromParsedRows(rows);
        return poly.toWkbPolygon(meta);
    }
    static toGeoJSONFromParsedRows(rows, meta) {
        const poly = KofPolygon.fromParsedRows(rows);
        return poly.toGeoJSON(meta);
    }
    static fromParsedRows(rows, headerFormat = null) {
        const lines = rows.map(r => (r.raw ? r.raw : `05 ${r.name || ''} ${r.code || ''} ${r.northing || ''} ${r.easting || ''} ${r.elevation || ''}`));
        return new KofPolygon(lines, headerFormat);
    }
}
exports.KofPolygon = KofPolygon;
