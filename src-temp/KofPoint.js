"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KofPoint = void 0;
const geometry_1 = require("./geometry");
class KofPoint {
    constructor(kofString, headerFormat = null) {
        if (typeof kofString !== 'string')
            throw new TypeError('KofPoint constructor expects a string');
        // headerFormat === null means the caller explicitly requests no header
        // (force whitespace fallback). If headerFormat is undefined/empty, use a
        // sensible default header template. Only compute tokenPositions when we
        // have a non-null header string.
        let tokenPositions = {};
        if (headerFormat !== null) {
            if (!headerFormat) {
                headerFormat = "-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ"; // default header template
            }
            // Map header tokens to absolute column start and length using only the
            // first letter as the key (P, K, X, Y, Z). We compute each token span
            // from its start to the next token start so we capture the full column
            // width (including padding) which preserves empty fields.
            const headerTokens = headerFormat.trim().split(/\s+/);
            // Find absolute starts for each token text
            const starts = [];
            let cursor = 0;
            for (const t of headerTokens) {
                const idx = headerFormat.indexOf(t, cursor);
                starts.push(idx);
                cursor = idx + t.length;
            }
            for (let i = 0; i < headerTokens.length; i++) {
                const t = headerTokens[i];
                const idx = starts[i];
                const next = (i + 1 < starts.length) ? starts[i + 1] : headerFormat.length;
                const key = t[0];
                tokenPositions[key] = { start: idx, len: Math.max(0, next - idx) };
            }
        }
        const rawLine = kofString.replace(/\r?\n$/, '');
        const headerStartsWithDash = (headerFormat && headerFormat.length > 0 && headerFormat[0] === '-') ? true : false;
        const rawStartsWithDash = rawLine.length > 0 && rawLine[0] === '-';
        const shift = headerStartsWithDash && !rawStartsWithDash ? -1 : 0;
        const getFieldByKey = (k) => {
            const pos = tokenPositions[k];
            if (!pos)
                return null;
            const start = pos.start + shift;
            if (start < 0)
                return null;
            if (rawLine.length <= start)
                return null;
            return rawLine.substr(start, pos.len).trim() || null;
        };
        // If tokenPositions contains expected keys use column extraction, else
        // fall back to whitespace-splitting (legacy behavior).
        let name = null;
        let code = null;
        let northing = 0;
        let easting = 0;
        let elevation = undefined;
        if (tokenPositions['P'] && tokenPositions['K'] && tokenPositions['X'] && tokenPositions['Y']) {
            name = getFieldByKey('P');
            code = getFieldByKey('K');
            // If the P-field accidentally captured a trailing code (common when
            // columns are not perfectly aligned), try to split it. Move a numeric
            // second token into the `code` field and keep the first token as name.
            if (name && /\s+/.test(name)) {
                const parts = name.split(/\s+/).filter(Boolean);
                if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
                    // numeric second part looks like a code
                    code = code || parts[1];
                    name = parts[0];
                }
                else {
                    // keep only the first visible token as the name
                    name = parts[0];
                }
            }
            if (code) {
                code = (code + '').split(/\s+/)[0];
            }
            const northStr = getFieldByKey('X');
            const eastStr = getFieldByKey('Y');
            const zStr = getFieldByKey('Z');
            northing = northStr ? parseFloat(northStr) : 0;
            easting = eastStr ? parseFloat(eastStr) : 0;
            elevation = zStr ? parseFloat(zStr) : undefined;
        }
        else {
            // Legacy whitespace fallback
            const tokens = kofString.trim().split(/\s+/).filter(Boolean);
            if (tokens[0] === '05')
                tokens.shift();
            name = tokens[0] || null;
            code = tokens[1] || null;
            northing = parseFloat(tokens[2] || '0');
            easting = parseFloat(tokens[3] || '0');
            elevation = tokens[4] ? parseFloat(tokens[4]) : undefined;
        }
        this.props = {
            type: 'point',
            raw: kofString,
            name,
            code,
            northing,
            easting,
            elevation,
        };
    }
    toString() { return this.props.raw || ''; }
    toWkbPoint(meta) {
        return new geometry_1.WkbGeomPoint(this.props.easting, this.props.northing, this.props.elevation, { name: this.props.name, code: this.props.code, ...meta });
    }
    // Create a KofPoint from a parsed object. Example:
    // const p = KofPoint.fromParsed({ name: 'Point1', northing: 1000, easting: 2000, elevation: 50 });
    // const p_min = KofPoint.fromParsed({ northing: 1000, easting: 2000 });  // the minimal valid point
    static fromParsed(parsed) {
        if (typeof parsed !== 'object' || parsed === null)
            throw new TypeError('KofPoint.fromParsed expects an object');
        if (typeof parsed.northing !== 'number' || typeof parsed.easting !== 'number') {
            throw new TypeError('KofPoint.fromParsed requires at least northing and easting as numbers');
        }
        return new KofPoint(parsed.raw || `05 ${parsed.name || ''} ${parsed.code || ''} ${parsed.northing || ''} ${parsed.easting || ''} ${parsed.elevation || ''}`);
    }
}
exports.KofPoint = KofPoint;
