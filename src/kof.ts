
import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';

// Types for parser output
export type Geometry = WkbGeomPoint | WkbGeomLinestring | WkbGeomPolygon;
export interface ParseResult {
  geometries: Geometry[];
  warnings: string[];
  diagnostics?: { line: number, strategy: string }[];
}

// Parse a KOF row (line) into an object with easting, northing, elevation
export type ParseRowOptions = { mode?: 'columns' | 'tokens', attrs?: Record<string, any> };
export function parseKOFRow(line: string, lineIdx: number, warnings: string[], opts: ParseRowOptions = {}): { easting: number, northing: number, elevation: number, name?: string, code?: string, strategy?: string, attrs?: Record<string, any> } | null {
  const raw = line.replace(/\r?\n$/, '');
  // Helper parsers
  const normalizeNum = (s: string) => {
    if (s === undefined || s === null || s === '') return null;
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const hasDecimal = (s: any) => /\d+[.,]\d+/.test(String(s));
  const numRe = /^-?\d+(?:[.,]\d+)?$/;
  const isPlausibleCoord = (north: number | null, east: number | null) => {
    if (north === null || east === null) return false;
    // Northings in the demo data tend to be large (hundreds of thousands to millions) or contain decimals.
    if (hasDecimal(north)) return true;
    if (Math.abs(north) >= 100000) return true;
    // easting usually > 1000 in these datasets
    if (Math.abs(east) >= 1000) return true;
    return false;
  };

  // Helper to ensure returned object uses easting=x, northing=y ordering.
  const finalize = (easting: number, northing: number, elevation: number, name?: string, code?: string, strategy?: string) => {
    // If the parsed values look swapped (north/east inverted), try swapping to recover
    if (!isPlausibleCoord(northing, easting) && isPlausibleCoord(easting, northing)) {
      // swap
      const tmp = easting;
      easting = northing;
      northing = tmp;
      strategy = strategy ? `${strategy}-swapped` : 'swapped';
    }
    return { easting, northing, elevation, name, code, strategy, attrs: opts.attrs || {} };
  };

  // 1) Columns-first attempt (based on README fixed widths)
  const afterCode = raw.replace(/^\s*05\b\s*/, '');
  const nameWidth = 10, codeWidth = 8, northWidth = 13, eastWidth = 13, elevWidth = 8;
  const padded = afterCode.padEnd(nameWidth + codeWidth + northWidth + eastWidth + elevWidth, ' ');
  const nameField = padded.substr(0, nameWidth).trim();
  const codeField = padded.substr(nameWidth, codeWidth).trim();
  const northField = padded.substr(nameWidth + codeWidth, northWidth).trim();
  const eastField = padded.substr(nameWidth + codeWidth + northWidth, eastWidth).trim();
  const elevField = padded.substr(nameWidth + codeWidth + northWidth + eastWidth, elevWidth).trim();
  if (numRe.test(northField) && numRe.test(eastField)) {
    const northing = normalizeNum(northField)!;
    const easting = normalizeNum(eastField)!;
    const elevation = elevField && numRe.test(elevField) ? normalizeNum(elevField)! : -500;
    if (isPlausibleCoord(northing, easting) || isPlausibleCoord(easting, northing)) {
      return finalize(easting, northing, elevation, nameField || undefined, codeField || undefined, 'columns');
    }
    // fallthrough to token-based heuristics if columns look numeric but implausible
  }

  // 2) Token-based heuristics
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length === 0) {
    warnings.push(`KOF line ${lineIdx + 1} malformed: empty row.`);
    return null;
  }
  // drop leading '05' if present
  if (tokens[0] === '05') tokens.shift();
  if (tokens.length === 0) {
    warnings.push(`KOF line ${lineIdx + 1} malformed: no data after '05'.`);
    return null;
  }

  // Collect numeric tokens with indices
  type NumTok = { t: string; idx: number; n: number; dec: boolean };
  const numToks: NumTok[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (numRe.test(t)) {
      const n = normalizeNum(t)!;
      numToks.push({ t, idx: i, n, dec: hasDecimal(t) });
    }
  }

  let metaTokens: string[] = [];
  // Helper to build return object
  const build = (north: number, east: number, elev: number, metaStartCount: number, strat: string) => {
    metaTokens = tokens.slice(0, metaStartCount);
    const name = metaTokens.length >= 1 ? metaTokens[0] : undefined;
    const code = metaTokens.length >= 2 ? metaTokens[1] : undefined;
  return finalize(east, north, elev, name, code, strat);
  };

  // Strategy A: last 3 tokens contiguous at end (north, east, elev) or last 2 tokens (north,east)
  if (numToks.length >= 2) {
    const last = numToks[numToks.length - 1];
    const prev = numToks[numToks.length - 2];
    // Check they are at the end of the token list (or very near)
    if (last.idx >= tokens.length - 1 && prev.idx >= tokens.length - 2) {
      if (numToks.length >= 3 && numToks[numToks.length - 3].idx === tokens.length - 3) {
        // last-3 contiguous: could be [north,east,elev] or [code,north,east]
        const a = numToks[numToks.length - 3].n;
        const b = prev.n;
        const c = last.n;
        // prefer [north,east,elev] when elevation magnitude looks small and north/east plausible
        if (Math.abs(c) < 1000 && isPlausibleCoord(a, b)) return build(a, b, c, tokens.length - 3, 'tokens-end-3');
        // otherwise, if b/c look like north/east accept them
        if (isPlausibleCoord(b, c)) return build(b, c, -500, tokens.length - 3, 'tokens-end-3-large');
      }
      // last-2 contiguous: [.. north, east]
      const north = prev.n;
      const east = last.n;
      const elev = -500;
      if (isPlausibleCoord(north, east)) return build(north, east, elev, tokens.length - 2, 'tokens-end-2');
    }
  }

  // Strategy B: find first decimal token (likely northing) and use following token as easting
  const decIdx = tokens.findIndex(t => /\d+[.,]\d+/.test(t));
  if (decIdx !== -1 && decIdx + 1 < tokens.length && numRe.test(tokens[decIdx + 1])) {
    const north = normalizeNum(tokens[decIdx])!;
    const east = normalizeNum(tokens[decIdx + 1])!;
    const elev = (decIdx + 2 < tokens.length && numRe.test(tokens[decIdx + 2])) ? normalizeNum(tokens[decIdx + 2])! : -500;
  if (isPlausibleCoord(north, east) || isPlausibleCoord(east, north)) return build(north, east, elev, decIdx, 'decimal-scan');
  }

  // Strategy C: scan left-to-right for a large-magnitude numeric that looks like a northing
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!numRe.test(tokens[i])) continue;
    const maybeNorth = normalizeNum(tokens[i])!;
    if (Math.abs(maybeNorth) >= 100000) {
      if (numRe.test(tokens[i + 1])) {
        const maybeEast = normalizeNum(tokens[i + 1])!;
        const maybeElev = (i + 2 < tokens.length && numRe.test(tokens[i + 2])) ? normalizeNum(tokens[i + 2])! : -500;
        if (isPlausibleCoord(maybeNorth, maybeEast)) return build(maybeNorth, maybeEast, maybeElev, i, 'large-first');
      }
    }
  }

  // If we reach here, we couldn't find plausible coordinates
  warnings.push(`KOF line ${lineIdx + 1} malformed: invalid coordinates.`);
  return null;
}

// ...existing code...
export type ParseOptions = { mode?: 'auto' | 'columns' | 'tokens' };

export function parseKOF(content: string, opts: ParseOptions = {}): ParseResult {
  const lines = content.split(/\r?\n/);
  const geometries: Geometry[] = [];
  const warnings: string[] = [];
  const diagnostics: { line: number, strategy: string }[] = [];
  const mode = opts.mode || 'auto';
  // Detect header row if present (e.g. '-05 PPPPPPPPPP KKKKKKKK ...') and force columns parsing
  const hasHeader = lines.some(l => l.trim().startsWith('-05'));
  const effectiveMode: 'columns' | 'tokens' = hasHeader ? 'columns' : (mode === 'columns' ? 'columns' : 'tokens');
  // Group state
  let groupRows: any[] = [];
  let groupType: 'linestring' | 'polygon' | null = null;
  let groupStartLine: number = 0;
  let inGroup = false;
  let lastGroupEndLine = -1;
  // Attribute rows (attach to next geometry)
  let pendingAttrs: Record<string, any> | null = null;

  function flushGroup() {
    if (!inGroup || !groupType || groupRows.length === 0) return;
  const points = groupRows.map(r => new WkbGeomPoint(r.easting, r.northing, r.elevation, { name: r.name, code: r.code, ...(r.attrs||{}) }));
    if (groupType === 'linestring') {
      if (points.length >= 2) {
        const ls = new WkbGeomLinestring(points);
        if (pendingAttrs) ls.meta = pendingAttrs;
        geometries.push(ls);
      } else {
        warnings.push(`Line group at line ${groupStartLine + 1} has less than 2 points, ignored.`);
      }
    } else if (groupType === 'polygon') {
      if (points.length >= 3) {
        // Ensure polygon is closed
        const closed = points.length >= 4 && points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y;
        if (!closed) {
          const p0 = points[0];
          // p0.x==northing, p0.y==easting
          points.push(new WkbGeomPoint(p0.x, p0.y, p0.z, p0.meta));
        }
        // Polygon expects array of rings, each ring is a WkbGeomLinestring
    const poly = new WkbGeomPolygon([new WkbGeomLinestring(points)]);
    if (pendingAttrs) poly.meta = pendingAttrs;
    geometries.push(poly);
      } else {
        warnings.push(`Polygon group at line ${groupStartLine + 1} has less than 3 points, ignored.`);
      }
    }
    // Reset group state
    groupRows = [];
    groupType = null;
    inGroup = false;
    lastGroupEndLine = groupStartLine;
  pendingAttrs = null;
  }

  for (let i = 0; i < lines.length; ++i) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('-')) {
      // Ignore comment/ignored lines
      // Group consecutive ignored lines
      if (warnings.length > 0 && warnings[warnings.length - 1].startsWith('KOF lines')) {
        // Already grouped
        const last = warnings[warnings.length - 1];
        const match = last.match(/KOF lines (\d+) to (\d+) ignored/);
        if (match && parseInt(match[2]) === i) {
          // Extend range
          warnings[warnings.length - 1] = `KOF lines ${match[1]} to ${i + 1} ignored (start with '-')`;
        } else {
          warnings.push(`KOF lines ${i + 1} ignored (start with '-')`);
        }
      } else {
        warnings.push(`KOF lines ${i + 1} ignored (start with '-')`);
      }
      continue;
    }
    const code = line.substring(0, 2);
    if (code === '05') {
      // Point observation
      // Pass the original untrimmed line to parseKOFRow so fixed-column slicing is accurate
      const row = parseKOFRow(rawLine, i, warnings, { mode: effectiveMode });
      if (!row) continue;
      if (row.strategy) diagnostics.push({ line: i + 1, strategy: row.strategy });
      if (inGroup) {
        // Collect for group, do not emit as point
        groupRows.push(row);
      } else {
  // Standalone point (attach meta) - store as (easting, northing)
  const p = new WkbGeomPoint(row.easting, row.northing, row.elevation, { name: row.name, code: row.code, ...(row.attrs||{}) });
  if (pendingAttrs) p.meta = { ...(p.meta||{}), ...pendingAttrs };
  geometries.push(p);
  pendingAttrs = null;
      }
    } else if (code === '09') {
      // Group start/end
      if (line.includes('91')) {
        // Start of group
        if (inGroup) {
          // Nested group, flush previous
          flushGroup();
        }
        inGroup = true;
        groupRows = [];
        groupType = null;
        groupStartLine = i;
        // Defensive: if line also contains 99 or 96, treat as malformed
        if (line.includes('99')) {
          warnings.push(`KOF line ${i + 1} has both 91 and 99, skipping group.`);
          inGroup = false;
          groupRows = [];
          groupType = null;
        } else if (line.includes('96')) {
          warnings.push(`KOF line ${i + 1} has both 91 and 96, skipping group.`);
          inGroup = false;
          groupRows = [];
          groupType = null;
        }
      } else if (line.includes('99')) {
        // End of linestring group
        if (inGroup) {
          groupType = 'linestring';
          flushGroup();
        } else {
          warnings.push(`KOF line ${i + 1} has 99 but no open group.`);
        }
      } else if (line.includes('96')) {
        // End of polygon group
        if (inGroup) {
          groupType = 'polygon';
          flushGroup();
        } else {
          warnings.push(`KOF line ${i + 1} has 96 but no open group.`);
        }
      } else {
        warnings.push(`KOF line ${i + 1} has unknown 09 code.`);
      }
    } else if (code === '11' || code === '12') {
      // Attribute/annotation rows: attach to next geometry
      // Minimal parsing: if tokens contain key=value pairs, parse, else store raw tokens
      const toks = rawLine.trim().split(/\s+/).slice(1);
      const attrs: Record<string, any> = {};
      for (const t of toks) {
        const kv = (t as string).split('=');
        if (kv.length === 2) attrs[kv[0]] = kv[1];
      }
      if (Object.keys(attrs).length > 0) pendingAttrs = attrs; else pendingAttrs = { _raw: toks };
    } else {
      // Unknown or unsupported code
      warnings.push(`KOF line ${i + 1} has unknown code '${code}'.`);
    }
  }
  // Flush any remaining group at EOF
  flushGroup();
  return { geometries, warnings, diagnostics };
}

// KOF class wrapper (API used by tests)
export class KOF {
  fileName: string;
  fileContent: string;
  parsedData: any[] | null = null;
  errors: string[] = [];
  warnings: string[] = [];
  diagnostics: { line: number, strategy: string }[] = [];
  metadata: Record<string, any> = {};

  constructor(fileName: string, fileContent: string) {
    this.fileName = fileName;
    this.fileContent = fileContent;
    this.metadata = { name: fileName, size: fileContent.length, type: 'text/kof' };
  }

  parse() {
  // Detect header and set metadata.mode
  const headerLine = this.fileContent.split(/\r?\n/).find(l => l.trim().startsWith('-05'));
  if (headerLine) this.metadata.mode = 'columns'; else this.metadata.mode = 'auto';
  const res = parseKOF(this.fileContent, { mode: this.metadata.mode === 'columns' ? 'columns' : 'auto' });
  this.warnings = res.warnings || [];
  this.diagnostics = res.diagnostics || [];
  this.errors = [];
  // Build parsedData roughly from content lines for compatibility with tests
  this.parsedData = this.fileContent.split(/\r?\n/).map((l, idx) => ({ row: idx + 1, fields: l.trim().split(/\s+/) }));
  // expose mode
  this.metadata.parserMode = this.metadata.mode;
  return this.parsedData;
  }

  toWkbGeometries() {
    const res = parseKOF(this.fileContent, { mode: this.metadata.mode === 'columns' ? 'columns' : 'auto' });
    return res.geometries;
  }

  toGeoJSON() {
    const geoms = this.toWkbGeometries();
    const features: any[] = [];
    const geomToFeature = (g: Geometry) => {
      if (g instanceof WkbGeomPoint) {
        const coords = g.z !== undefined ? [g.x, g.y, g.z] : [g.x, g.y];
        return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: g.meta || {} };
      } else if (g instanceof WkbGeomLinestring) {
        const coords = g.points.map(p => p.z !== undefined ? [p.x, p.y, p.z] : [p.x, p.y]);
        return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: g.meta || {} };
      } else if (g instanceof WkbGeomPolygon) {
        const rings = g.rings.map(r => r.points.map(p => p.z !== undefined ? [p.x, p.y, p.z] : [p.x, p.y]));
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties: g.meta || {} };
      }
      return null;
    };
    for (const g of geoms) {
      const f = geomToFeature(g);
      if (f) features.push(f);
    }
    return { type: 'FeatureCollection', features };
  }

  getMetadata() {
    return this.metadata;
  }
}

