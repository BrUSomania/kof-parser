"use strict";
// Lightweight KofPoint class (self-contained parsing fallback)
Object.defineProperty(exports, "__esModule", { value: true });
exports.KofPoint = void 0;
var KofPoint = /** @class */ (function () {
    // Accept optional parsed object (from central parser) to avoid circular imports
    function KofPoint(kof05line, parsed) {
        var _a, _b, _c;
        if (typeof kof05line !== 'string')
            throw new TypeError('KofPoint constructor expects a string');
        var p = parsed;
        if (!p) {
            // lightweight tokenization fallback
            var tokens = kof05line.trim().split(/\s+/).filter(Boolean);
            p = { tokens: tokens };
            // strip leading '05' if present
            if (p.tokens[0] === '05')
                p.tokens.shift();
            // try to pick last two numeric tokens as north/east
            var numRe_1 = /^-?\d+(?:[.,]\d+)?$/;
            var numIdx = p.tokens.map(function (t, i) { return ({ t: t, i: i }); }).filter(function (x) { return numRe_1.test(x.t); });
            if (numIdx.length >= 2) {
                var a = parseFloat(String(numIdx[numIdx.length - 2].t).replace(',', '.'));
                var b = parseFloat(String(numIdx[numIdx.length - 1].t).replace(',', '.'));
                p.easting = b;
                p.northing = a;
                p.elevation = -500;
            }
        }
        this.props = {
            raw: kof05line,
            tokens: p.tokens || [],
            name: p.name || null,
            code: p.code || null,
            easting: (_a = p.easting) !== null && _a !== void 0 ? _a : null,
            northing: (_b = p.northing) !== null && _b !== void 0 ? _b : null,
            elevation: (_c = p.elevation) !== null && _c !== void 0 ? _c : null,
            attrs: p.attrs || null,
        };
    }
    KofPoint.prototype.toString = function () { return this.props.raw; };
    KofPoint.fromParsed = function (row) {
        // Build a reasonable raw string for debugging; not used for parsing
        var parts = ['05'];
        if (row.name)
            parts.push(String(row.name));
        if (row.code)
            parts.push(String(row.code));
        if (row.northing !== undefined)
            parts.push(String(row.northing));
        if (row.easting !== undefined)
            parts.push(String(row.easting));
        if (row.elevation !== undefined)
            parts.push(String(row.elevation));
        return new KofPoint(parts.join(' '), row);
    };
    return KofPoint;
}());
exports.KofPoint = KofPoint;
