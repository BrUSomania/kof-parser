
// import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';
// import { KofPoint } from './KofPoint';
// import { KofLine } from './KofLine';
// import { KofPolygon } from './KofPolygon';
// import { parseKOFRow } from './parseRow';
// // Lazy require proj4 to avoid hard dependency surprises in some consumers
// let proj4: any = (() => {
//   try { return (typeof require !== 'undefined') ? require('proj4') : null; } catch (e) { return null; }
// })();

// // Test helper: allow tests to override the internal proj4 used by the parser
// export function __setProj4(p: any) { proj4 = p; }

// // Types for parser output
// export type Geometry = WkbGeomPoint | WkbGeomLinestring | WkbGeomPolygon;
// export interface WarningObj { line: number; message: string; code?: string }
// export interface ParseResult {
//   geometries: Geometry[];
//   warnings: WarningObj[];
//   diagnostics?: { line: number, strategy: string }[];
// }

// // Parse a KOF row (line) into an object with easting, northing, elevation
// // moved parseKOFRow to src/parseRow.ts

// // ...existing code...
// export type ParseOptions = { mode?: 'auto' | 'columns' | 'tokens' };

// export function parseKOF(content: string, opts: ParseOptions = {}): ParseResult {
//   const lines = content.split(/\r?\n/);
//   const geometries: Geometry[] = [];
//   const warnings: WarningObj[] = [];
//   const diagnostics: { line: number, strategy: string }[] = [];
//   const fileMetadata: Record<string, any> = {};
//   const mode = opts.mode || 'auto';
//   // Detect header row if present (e.g. '-05 PPPPPPPPPP KKKKKKKK ...') and force columns parsing
//   const hasHeader = lines.some(l => l.trim().startsWith('-05'));
//   const effectiveMode: 'columns' | 'tokens' = hasHeader ? 'columns' : (mode === 'columns' ? 'columns' : 'tokens');
//   // Group state
//   let groupRows: any[] = [];
//   let groupType: 'linestring' | 'polygon' | null = null;
//   let groupStartLine: number = 0;
//   let inGroup = false;
//   let lastGroupEndLine = -1;
//   // Multi-line pattern state (codes 72-79 = saw/zigzag, 82-89 = wave)
//   let multiMode: null | 'saw' | 'wave' = null;
//   let multiNumLines = 0;
//   let multiLinesPoints: any[][] = [];
//   // internal state for assignment
//   let multiAssign = {
//     // for saw: idx and dir for zigzag bounce
//     idx: 0,
//     dir: 1,
//     // for wave (numLines==2): flags
//     firstAssigned: false,
//     waveTarget: 1,
//     waveRemaining: 0
//   };
//   // Attribute rows (attach to next geometry)
//   let pendingAttrs: Record<string, any> | null = null;

//   // Helper to parse key=value pairs (supports quoted values and escaped quotes)
//   const parseAttrsFrom = (line: string): Record<string, any> => {
//     const remainder = line.replace(/^\s*(10|20|30|11|12)\b\s*/, '').trim();
//     const attrs: Record<string, any> = {};
//     const kvRe = /([^\s=]+)=("((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s]+))/g;
//     let m: RegExpExecArray | null;
//     while ((m = kvRe.exec(remainder)) !== null) {
//       const k = m[1];
//       let v = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5]);
//       if (typeof v === 'string') v = v.replace(/\\(["'\\])/g, '$1');
//       attrs[k] = v;
//     }
//     if (Object.keys(attrs).length === 0) return { _raw: remainder.split(/\s+/).filter(Boolean) };
//     return attrs;
//   };

//   function flushGroup() {
//     if (!inGroup || !groupType || groupRows.length === 0) return;
//     // If multiMode is active, build per-line geometries from multiLinesPoints
//     if (multiMode && multiLinesPoints && multiLinesPoints.length > 0) {

//       if (groupType === 'linestring') {
//         for (let li = 0; li < multiLinesPoints.length; li++) {
//           const bucket = multiLinesPoints[li];
//           if (!bucket || bucket.length === 0) { warnings.push({ line: groupStartLine + 1, message: `Multi-line segment ${li} in group at line ${groupStartLine + 1} has no points, ignored.`, code: '09' }); continue; }
//           const kline = KofLine.fromParsedRows(bucket);
//           const ls = kline.toWkbLinestring(pendingAttrs || undefined);
//           if (ls) geometries.push(ls); else warnings.push({ line: groupStartLine + 1, message: `Multi-line segment ${li} in group at line ${groupStartLine + 1} has less than 2 points, ignored.`, code: '09' });
//         }
//       } else if (groupType === 'polygon') {
//         // For polygons with multi-lines, try to create polygons from the first non-empty line only
//         const firstNonEmpty = multiLinesPoints.find(p => p.length >= 3);
//         if (firstNonEmpty) {
//           const kpoly = KofPolygon.fromParsedRows(firstNonEmpty);
//           const poly = kpoly.toWkbPolygon(pendingAttrs || undefined);
//           if (poly) geometries.push(poly); else warnings.push({ line: groupStartLine + 1, message: `Polygon group at line ${groupStartLine + 1} has no sufficiently large multi-line ring, ignored.`, code: '09' });
//         } else {
//           warnings.push({ line: groupStartLine + 1, message: `Polygon group at line ${groupStartLine + 1} has no sufficiently large multi-line ring, ignored.`, code: '09' });
//         }
//       }
//       // reset multiMode state
//       multiMode = null;
//       multiNumLines = 0;
//       multiLinesPoints = [];
//       multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
//       // Reset group state and pending attrs
//       groupRows = [];
//       groupType = null;
//       inGroup = false;
//       lastGroupEndLine = groupStartLine;
//       pendingAttrs = null;
//       return;
//     }
//     const points = groupRows.map(r => new WkbGeomPoint(r.easting, r.northing, r.elevation, { name: r.name || null, fcode: r.code || null, code: r.code, ...(r.attrs || {}) }));
//     if (groupType === 'linestring') {
//       if (points.length >= 2) {
//         const ls = new WkbGeomLinestring(points);
//         // Ensure linestring meta has name and fcode (take from first point if missing)
//         ls.meta = pendingAttrs ? { ...(pendingAttrs || {}) } : {};
//         const firstMeta = points[0].meta || {};
//         if (!('name' in ls.meta)) ls.meta.name = firstMeta.name || null;
//         if (!('fcode' in ls.meta)) ls.meta.fcode = firstMeta.fcode || null;
//         geometries.push(ls);
//       } else {
//         warnings.push({ line: groupStartLine + 1, message: `Line group at line ${groupStartLine + 1} has less than 2 points, ignored.`, code: '09' });
//       }
//     } else if (groupType === 'polygon') {
//       if (points.length >= 3) {
//         // Ensure polygon is closed
//         const closed = points.length >= 4 && points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y;
//         if (!closed) {
//           const p0 = points[0];
//           // p0.x==northing, p0.y==easting
//           points.push(new WkbGeomPoint(p0.x, p0.y, p0.z, p0.meta));
//         }
//         // Polygon expects array of rings, each ring is a WkbGeomLinestring
//         const poly = new WkbGeomPolygon([new WkbGeomLinestring(points)]);
//         poly.meta = pendingAttrs ? { ...(pendingAttrs || {}) } : {};
//         const firstMeta = points[0].meta || {};
//         if (!('name' in poly.meta)) poly.meta.name = firstMeta.name || null;
//         if (!('fcode' in poly.meta)) poly.meta.fcode = firstMeta.fcode || null;
//         geometries.push(poly);
//       } else {
//         warnings.push({ line: groupStartLine + 1, message: `Polygon group at line ${groupStartLine + 1} has less than 3 points, ignored.`, code: '09' });
//       }
//     }
//     // Reset group state
//     groupRows = [];
//     groupType = null;
//     inGroup = false;
//     lastGroupEndLine = groupStartLine;
//     pendingAttrs = null;
//   }

//   // Handlers for different codes - keep as inner functions so they capture parser state
//   const handleIgnoredLine = (idx: number) => {
//     // Group consecutive ignored lines
//     if (warnings.length > 0 && warnings[warnings.length - 1].message && warnings[warnings.length - 1].message.startsWith('KOF lines')) {
//       const last = warnings[warnings.length - 1].message;
//       const match = last.match(/KOF lines (\d+) to (\d+) ignored/);
//       if (match && parseInt(match[2], 10) === idx) {
//         warnings[warnings.length - 1] = { line: warnings[warnings.length - 1].line, message: `KOF lines ${match[1]} to ${idx + 1} ignored (start with '-')` };
//       } else {
//         warnings.push({ line: idx + 1, message: `KOF lines ${idx + 1} ignored (start with '-')` });
//       }
//     } else {
//       warnings.push({ line: idx + 1, message: `KOF lines ${idx + 1} ignored (start with '-')` });
//     }
//   };

//   const handle10 = (rawLine: string) => {
//     const attrs = parseAttrsFrom(rawLine);
//     Object.assign(fileMetadata, attrs);
//   };

//   // Code 11 and 12: attribute lines that attach to next geometry or file metadata
//   const handle11 = (rawLine: string) => {
//     // Attach parsed attrs to pendingAttrs (next geometry)
//     pendingAttrs = parseAttrsFrom(rawLine);
//   };

//   const handle12 = (rawLine: string) => {
//     // File-level metadata similar to code 10
//     const attrs = parseAttrsFrom(rawLine);
//     Object.assign(fileMetadata, attrs);
//   };

//   const handle20 = (rawLine: string, idx: number) => {
//     const attrs = parseAttrsFrom(rawLine);
//     warnings.push({ line: idx + 1, message: `KOF line ${idx + 1} measurement/20 parsed: ${JSON.stringify(attrs)}`, code: '20' });
//   };

//   const handle30 = (rawLine: string) => {
//     pendingAttrs = parseAttrsFrom(rawLine);
//   };

//   const handle05 = (rawLine: string, idx: number) => {
//     const row = parseKOFRow(rawLine, idx, warnings, { mode: effectiveMode });
//     if (!row) return;
//     if (row.strategy) diagnostics.push({ line: idx + 1, strategy: row.strategy });
//     // create a KofPoint wrapper (lightweight) with parsed row data
//     const kp = new KofPoint(rawLine, row);
//     const pRow = {
//       easting: kp.props.easting,
//       northing: kp.props.northing,
//       elevation: kp.props.elevation,
//       name: kp.props.name,
//       code: kp.props.code,
//       attrs: kp.props.attrs
//     } as any;
//     if (inGroup) {
//       if (multiMode && multiNumLines > 0) {
//         if (!multiLinesPoints || multiLinesPoints.length === 0) {
//           multiLinesPoints = Array.from({ length: multiNumLines }, () => [] as any[]);
//           multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
//           if (multiMode === 'wave') {
//             multiAssign.waveTarget = 1; multiAssign.waveRemaining = 0;
//           }
//         }
//         multiLinesPoints[multiAssign.idx].push(pRow);
//         if (multiNumLines > 1) multiAssign.idx = (multiAssign.idx + 1) % multiNumLines;
//         groupRows.push(pRow);
//       } else {
//         groupRows.push(pRow);
//       }
//     } else {
//       const p = new WkbGeomPoint(pRow.easting, pRow.northing, pRow.elevation, { name: pRow.name || null, fcode: pRow.code || null, code: pRow.code, ...(pRow.attrs || {}) });
//       if (pendingAttrs) p.meta = { ...(p.meta || {}), ...pendingAttrs };
//       geometries.push(p);
//       pendingAttrs = null;
//     }
//   };

//   const handle09 = (rawLine: string, idx: number) => {
//     const rest = rawLine.replace(/^\s*09[_\s]*/, '').trim();
//     const hasToken = (tok: string) => new RegExp("\\b" + tok + "\\b").test(rest);
//     const compactMatch = rawLine.match(/^\s*09[_\s]?([0-9]{2})/);
//     if (compactMatch) {
//       const codeNum = parseInt(compactMatch[1], 10);
//       if (codeNum >= 72 && codeNum <= 79) {
//         multiMode = 'saw';
//         multiNumLines = Math.max(2, codeNum - 70);
//         multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
//         multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
//         if (!inGroup) { inGroup = true; groupRows = []; groupType = null; groupStartLine = idx; }
//         return;
//       }
//       if (codeNum >= 82 && codeNum <= 89) {
//         multiMode = 'wave';
//         multiNumLines = Math.max(2, codeNum - 80);
//         multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
//         multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
//         if (!inGroup) { inGroup = true; groupRows = []; groupType = null; groupStartLine = idx; }
//         return;
//       }
//     }
//     if (hasToken('91')) {
//       if (inGroup) flushGroup();
//       inGroup = true; groupRows = []; groupType = null; groupStartLine = idx;
//       if (hasToken('99') || hasToken('96')) {
//         warnings.push({ line: idx + 1, message: `KOF line ${idx + 1} has both 91 and 99/96, skipping group.`, code: '09' });
//         inGroup = false; groupRows = []; groupType = null;
//       }
//       return;
//     } else if (hasToken('99')) {
//       if (inGroup) { groupType = 'linestring'; flushGroup(); }
//       else warnings.push({ line: idx + 1, message: `KOF line ${idx + 1} has 99 but no open group.`, code: '09' });
//       return;
//     } else if (hasToken('96')) {
//       if (inGroup) { groupType = 'polygon'; flushGroup(); }
//       else warnings.push({ line: idx + 1, message: `KOF line ${idx + 1} has 96 but no open group.`, code: '09' });
//       return;
//     } else if (/(7[2-9])/.test(rest)) {
//       const m = rest.match(/(7[2-9])/);
//       if (m) {
//         const codeNum = parseInt(m[1], 10);
//         multiMode = 'saw';
//         multiNumLines = Math.max(2, codeNum - 70);
//         multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
//         multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
//         if (!inGroup) { inGroup = true; groupRows = []; groupType = null; groupStartLine = idx; }
//       }
//       return;
//     } else if (/(8[2-9])/.test(rest)) {
//       const m = rest.match(/(8[2-9])/);
//       if (m) {
//         const codeNum = parseInt(m[1], 10);
//         multiMode = 'wave';
//         multiNumLines = Math.max(2, codeNum - 80);
//         multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
//         multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
//         if (!inGroup) { inGroup = true; groupRows = []; groupType = null; groupStartLine = idx; }
//       }
//       return;
//     } else {
//       warnings.push({ line: idx + 1, message: `KOF line ${idx + 1} has unknown 09 code.`, code: '09' });
//       return;
//     }
//   };

//   const handleUnknown = (rawLine: string, idx: number, code: string) => {
//     warnings.push({ line: idx + 1, message: `KOF line ${idx + 1} has unknown code '${code}'.`, code });
//   };

//   for (let i = 0; i < lines.length; ++i) {
//     const rawLine = lines[i];
//     const line = rawLine.trim();
//     if (!line) continue;
//     if (line.startsWith('-')) { handleIgnoredLine(i); continue; }
//     const code = line.substring(0, 2);
//     /*
//      KOF row code summary (00..99) - parser coverage notes

//      Implemented handlers (handled below):
//        05 - Observation/point rows (parsed by parseKOFRow and handled in handle05)
//        09 - Group/control wrapper rows (handle09) which recognizes embedded tokens like 91/99/96
//        10 - File-level metadata (handle10)
//        11 - Attribute lines attached to next geometry (handle11)
//        12 - File-level metadata (handle12)
//        20 - Measurement/attrs (handle20)
//        30 - Pending attributes (handle30)

//      Partial / notes:
//        72..79 - multi-line 'saw' (zig-zag) patterns: implemented when appearing as tokens inside a '09' line
//        82..89 - multi-line 'wave' patterns: implemented when appearing as tokens inside a '09' line
//        91     - group START token: recognized when embedded in a '09' line; standalone '91' now delegated to handle09
//        96     - polygon CLOSE token: recognized when embedded in a '09' line; standalone '96' now delegated to handle09
//        99     - group END token: recognized when embedded in a '09' line; standalone '99' now delegated to handle09

//      Not implemented (or unhandled directly by the parser):
//        00-04, 06-08, 13-19, 21-29, 31-69, 70-71, 80-81, 90, 92-95, 97-98

//      Notes and recommendations:
//      - Many codes are legacy or optional; implement on-demand as required by incoming datasets.
//      - The parser treats unknown two-character codes with a warning via handleUnknown. For robustness, prefer
//        adding dedicated handlers (small functions) for any code(s) you need to support.
//      - See repository file `test/mocha/logs/kof_code_status.json` and `kof_code_status.csv` for a per-code
//        matrix generated during development.
//     */
//     switch (code) {
//       case '10': handle10(rawLine); break;
//       case '11': handle11(rawLine); break;
//       case '12': handle12(rawLine); break;
//       case '20': handle20(rawLine, i); break;
//       case '30': handle30(rawLine); break;
//       case '05': handle05(rawLine, i); break;
//       // Group/control: support both '09' wrapper lines and standalone group codes
//       case '09': handle09(rawLine, i); break;
//       case '91':
//       case '96':
//       case '99':
//         // Delegate to handle09 so standalone '91'/'96'/'99' lines behave like embedded tokens
//         try { handle09(rawLine.replace(/^\s*(91|96|99)[_\s]*/, '09 '), i); } catch (e) { handleUnknown(rawLine, i, code); }
//         break;
//       default: handleUnknown(rawLine, i, code); break;
//     }
//   }
//   // Flush any remaining group at EOF
//   flushGroup();
//   return { geometries, warnings, diagnostics, ...(fileMetadata && { metadata: fileMetadata }) } as any;
// }

// // KOF class wrapper (API used by tests)
// export class KOF {
//   fileName: string;
//   fileContent: string;
//   parsedData: any[] | null = null;
//   errors: string[] = [];
//   warnings: WarningObj[] = [];
//   diagnostics: { line: number, strategy: string }[] = [];
//   metadata: Record<string, any> = {};
//   // optional CRS settings (string like 'EPSG:25832')
//   sourceCrs: string | null = null;
//   targetCrs: string | null = null;

//   constructor(fileName: string, fileContent: string, opts?: { sourceCrs?: string, targetCrs?: string }) {
//     this.fileName = fileName;
//     this.fileContent = fileContent;
//     this.metadata = { name: fileName, size: fileContent.length, type: 'text/kof' };
//     if (opts) {
//       if (opts.sourceCrs) { this.sourceCrs = opts.sourceCrs; this.metadata.sourceCrs = opts.sourceCrs; }
//       if (opts.targetCrs) { this.targetCrs = opts.targetCrs; this.metadata.targetCrs = opts.targetCrs; }
//     }
//   }

//   setSourceCrs(crs: string | null) { this.sourceCrs = crs; if (crs) this.metadata.sourceCrs = crs; }
//   setTargetCrs(crs: string | null) { this.targetCrs = crs; if (crs) this.metadata.targetCrs = crs; }

//   // Convenience: reproject the parsed geometries to a target CRS and return GeoJSON.
//   // If proj4 is unavailable, returns the original GeoJSON and records a metadata warning.
//   reproject(targetCrs: string) {
//     const src = this.sourceCrs || (this.metadata && this.metadata.sourceCrs) || null;
//     if (!src) {
//       this.metadata.reprojectionError = 'Source CRS not set on KOF';
//       return this.toGeoJSON();
//     }
//     if (!proj4) {
//       this.metadata.reprojectionError = 'proj4 not available';
//       return this.toGeoJSON();
//     }
//     // Defer to toGeoJSON's per-call option shape
//     return this.toGeoJSON({ crs: { from: src, to: targetCrs } });
//   }

//   parse() {
//     // Detect header and set metadata.mode
//     const headerLine = this.fileContent.split(/\r?\n/).find(l => l.trim().startsWith('-05'));
//     if (headerLine) this.metadata.mode = 'columns'; else this.metadata.mode = 'auto';
//     const res = parseKOF(this.fileContent, { mode: this.metadata.mode === 'columns' ? 'columns' : 'auto' });
//     this.warnings = res.warnings || [];
//     this.diagnostics = res.diagnostics || [];
//     this.errors = [];
//     if ((res as any).metadata) Object.assign(this.metadata, (res as any).metadata);
//     // Build parsedData roughly from content lines for compatibility with tests
//     this.parsedData = this.fileContent.split(/\r?\n/).map((l, idx) => ({ row: idx + 1, fields: l.trim().split(/\s+/) }));
//     // expose mode
//     this.metadata.parserMode = this.metadata.mode;
//     this.warnings = res.warnings || [];
//     this.diagnostics = res.diagnostics || [];
//     return this.parsedData;
//   }

//   toWkbGeometries() {
//     const res = parseKOF(this.fileContent, { mode: this.metadata.mode === 'columns' ? 'columns' : 'auto' });
//     if ((res as any).metadata) Object.assign(this.metadata, (res as any).metadata);
//     return res.geometries;
//   }

//   // Note: Node-only helpers (parseMultipleFiles/parseDirectory/show) moved to src/nodeHelpers.ts

//   toGeoJSON(opts?: { sourceCrs?: string | null, targetCrs?: string | null, crs?: { from?: string | null, to?: string | null } }) {
//     const geoms = this.toWkbGeometries();
//     const features: any[] = [];
//     const geomToFeature = (g: Geometry) => {
//       if (g instanceof WkbGeomPoint) {
//         const coords = g.z !== undefined ? [g.x, g.y, g.z] : [g.x, g.y];
//         const props = { ...(g.meta || {}) };
//         if (!('name' in props)) props.name = null;
//         if (!('fcode' in props)) props.fcode = ('code' in props ? props.code : null);
//         return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: props };
//       } else if (g instanceof WkbGeomLinestring) {
//         const coords = g.points.map(p => p.z !== undefined ? [p.x, p.y, p.z] : [p.x, p.y]);
//         const props = { ...(g.meta || {}) };
//         if (!('name' in props)) props.name = (g.points[0] && g.points[0].meta && ('name' in g.points[0].meta)) ? g.points[0].meta.name : null;
//         if (!('fcode' in props)) props.fcode = (g.points[0] && g.points[0].meta && ('fcode' in g.points[0].meta)) ? g.points[0].meta.fcode : null;
//         return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props };
//       } else if (g instanceof WkbGeomPolygon) {
//         const rings = g.rings.map(r => r.points.map(p => p.z !== undefined ? [p.x, p.y, p.z] : [p.x, p.y]));
//         const props = { ...(g.meta || {}) };
//         const firstPoint = (g.rings[0] && g.rings[0].points && g.rings[0].points[0]) ? g.rings[0].points[0] : null;
//         if (!('name' in props)) props.name = firstPoint && firstPoint.meta && ('name' in firstPoint.meta) ? firstPoint.meta.name : null;
//         if (!('fcode' in props)) props.fcode = firstPoint && firstPoint.meta && ('fcode' in firstPoint.meta) ? firstPoint.meta.fcode : null;
//         return { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties: props };
//       }
//       return null;
//     };
//     for (const g of geoms) {
//       const f = geomToFeature(g);
//       if (f) features.push(f);
//     }
//     const gj = { type: 'FeatureCollection', features };
//     // Determine effective source/target CRS: per-call opts override instance settings
//     // Prefer crs.from/crs.to when provided (new option shape). Fall back to older opts keys or instance metadata.
//     const src = (opts && opts.crs && opts.crs.from) || (opts && opts.sourceCrs) || this.sourceCrs || (this.metadata && this.metadata.sourceCrs) || null;
//     const tgt = (opts && opts.crs && opts.crs.to) || (opts && opts.targetCrs) || this.targetCrs || (this.metadata && this.metadata.targetCrs) || null;
//     if (proj4 && src && tgt && src.toLowerCase() !== tgt.toLowerCase()) {
//       const reproject = (inGJ: any, from: string, to: string) => {
//         const out = JSON.parse(JSON.stringify(inGJ));
//         const transformCoords = (coords: any): any => {
//           if (typeof coords[0] === 'number') {
//             const [x, y] = coords;
//             const p = proj4(from, to, [x, y]);
//             return [p[0], p[1]];
//           }
//           return coords.map(transformCoords);
//         };
//         for (const f of out.features) {
//           f.geometry.coordinates = transformCoords(f.geometry.coordinates);
//         }
//         return out;
//       };
//       try {
//         return reproject(gj, src, tgt);
//       } catch (e: any) {
//         // If reprojection fails, return the original geojson and leave an error in metadata
//         this.metadata.reprojectionError = String((e && (e as any).message) ? (e as any).message : e);
//         return gj;
//       }
//     }
//     return gj;
//   }

//   getMetadata() {
//     return this.metadata;
//   }
// }

