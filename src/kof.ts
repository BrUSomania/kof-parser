
import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';
// Lazy require proj4 to avoid hard dependency surprises in some consumers
let proj4: any = (() => {
  try { return (typeof require !== 'undefined') ? require('proj4') : null; } catch (e) { return null; }
})();

// Test helper: allow tests to override the internal proj4 used by the parser
export function __setProj4(p: any) { proj4 = p; }

// Types for parser output
export type Geometry = WkbGeomPoint | WkbGeomLinestring | WkbGeomPolygon;
export interface WarningObj { line: number; message: string; code?: string }
export interface ParseResult {
  geometries: Geometry[];
  warnings: WarningObj[];
  diagnostics?: { line: number, strategy: string }[];
}

// Parse a KOF row (line) into an object with easting, northing, elevation
export type ParseRowOptions = { mode?: 'columns' | 'tokens', attrs?: Record<string, any> };
export function parseKOFRow(line: string, lineIdx: number, warnings: WarningObj[], opts: ParseRowOptions = {}): { easting: number, northing: number, elevation: number, name?: string, code?: string, strategy?: string, attrs?: Record<string, any> } | null {
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
  const finalize = (easting: number, northing: number, elevation: number, name?: string, code?: string, strategy?: string, extraAttrs: Record<string, any> = {}) => {
    // If the parsed values look swapped (north/east inverted), try swapping to recover
    if (!isPlausibleCoord(northing, easting) && isPlausibleCoord(easting, northing)) {
      // swap
      const tmp = easting;
      easting = northing;
      northing = tmp;
      strategy = strategy ? `${strategy}-swapped` : 'swapped';
    }
  return { easting, northing, elevation, name, code, strategy, attrs: { ...(opts.attrs || {}), ...extraAttrs } };
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
      // capture any trailing text after the fixed-width fields
      const trailing = afterCode.length > nameWidth + codeWidth + northWidth + eastWidth + elevWidth
        ? afterCode.substr(nameWidth + codeWidth + northWidth + eastWidth + elevWidth).trim()
        : '';
      const extra: Record<string, any> = {};
      if (trailing) {
        // try to parse key=value pairs
        const kvRe = /([^\s=]+)=("([^"]*)"|'([^']*)'|([^\s]+))/g;
        let mm: RegExpExecArray | null;
        while ((mm = kvRe.exec(trailing)) !== null) {
          const k = mm[1];
          const v = mm[3] !== undefined ? mm[3] : (mm[4] !== undefined ? mm[4] : mm[5]);
          extra[k] = typeof v === 'string' ? v.replace(/\\(["'\\])/g, '$1') : v;
        }
        if (Object.keys(extra).length === 0) extra._extra = trailing.split(/\s+/);
      }
      return finalize(easting, northing, elevation, nameField || undefined, codeField || undefined, 'columns', extra);
    }
    // fallthrough to token-based heuristics if columns look numeric but implausible
  }

  // 2) Token-based heuristics
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length === 0) {
    warnings.push({ line: lineIdx + 1, message: `KOF line ${lineIdx + 1} malformed: empty row.` });
    return null;
  }
  // drop leading '05' if present
  if (tokens[0] === '05') tokens.shift();
  if (tokens.length === 0) {
    warnings.push({ line: lineIdx + 1, message: `KOF line ${lineIdx + 1} malformed: no data after '05'.` });
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
  const build = (north: number, east: number, elev: number, metaStartCount: number, strat: string, lastNumIdx: number) => {
    metaTokens = tokens.slice(0, metaStartCount);
    const name = metaTokens.length >= 1 ? metaTokens[0] : undefined;
    const code = metaTokens.length >= 2 ? metaTokens[1] : undefined;
    // capture trailing tokens after last numeric token
    const trailingToks = tokens.slice(lastNumIdx + 1);
    const extra: Record<string, any> = {};
    if (trailingToks.length > 0) {
      const trailingStr = trailingToks.join(' ');
      const kvRe = /([^\s=]+)=("((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s]+))/g;
      let mm: RegExpExecArray | null;
      while ((mm = kvRe.exec(trailingStr)) !== null) {
        const k = mm[1];
        const v = mm[3] !== undefined ? mm[3] : (mm[4] !== undefined ? mm[4] : mm[5]);
        extra[k] = typeof v === 'string' ? v.replace(/\\(["'\\])/g, '$1') : v;
      }
      if (Object.keys(extra).length === 0) extra._extra = trailingToks;
    }
    return finalize(east, north, elev, name, code, strat, extra);
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
  if (Math.abs(c) < 1000 && isPlausibleCoord(a, b)) return build(a, b, c, tokens.length - 3, 'tokens-end-3', numToks[numToks.length - 1].idx);
  // otherwise, if b/c look like north/east accept them
  if (isPlausibleCoord(b, c)) return build(b, c, -500, tokens.length - 3, 'tokens-end-3-large', numToks[numToks.length - 1].idx);
      }
      // last-2 contiguous: [.. north, east]
      const north = prev.n;
      const east = last.n;
      const elev = -500;
  if (isPlausibleCoord(north, east)) return build(north, east, elev, tokens.length - 2, 'tokens-end-2', last.idx);
    }
  }

  // Strategy B: find first decimal token (likely northing) and use following token as easting
  const decIdx = tokens.findIndex(t => /\d+[.,]\d+/.test(t));
  if (decIdx !== -1 && decIdx + 1 < tokens.length && numRe.test(tokens[decIdx + 1])) {
    const north = normalizeNum(tokens[decIdx])!;
    const east = normalizeNum(tokens[decIdx + 1])!;
    const elev = (decIdx + 2 < tokens.length && numRe.test(tokens[decIdx + 2])) ? normalizeNum(tokens[decIdx + 2])! : -500;
  if (isPlausibleCoord(north, east) || isPlausibleCoord(east, north)) return build(north, east, elev, decIdx, 'decimal-scan', decIdx + 1);
  }

  // Strategy C: scan left-to-right for a large-magnitude numeric that looks like a northing
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!numRe.test(tokens[i])) continue;
    const maybeNorth = normalizeNum(tokens[i])!;
    if (Math.abs(maybeNorth) >= 100000) {
      if (numRe.test(tokens[i + 1])) {
        const maybeEast = normalizeNum(tokens[i + 1])!;
        const maybeElev = (i + 2 < tokens.length && numRe.test(tokens[i + 2])) ? normalizeNum(tokens[i + 2])! : -500;
  if (isPlausibleCoord(maybeNorth, maybeEast)) return build(maybeNorth, maybeEast, maybeElev, i, 'large-first', i + 1);
      }
    }
  }

  // If we reach here, we couldn't find plausible coordinates
  warnings.push({ line: lineIdx + 1, message: `KOF line ${lineIdx + 1} malformed: invalid coordinates.` });
  return null;
}

// ...existing code...
export type ParseOptions = { mode?: 'auto' | 'columns' | 'tokens' };

export function parseKOF(content: string, opts: ParseOptions = {}): ParseResult {
  const lines = content.split(/\r?\n/);
  const geometries: Geometry[] = [];
  const warnings: WarningObj[] = [];
  const diagnostics: { line: number, strategy: string }[] = [];
  const fileMetadata: Record<string, any> = {};
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
  // Multi-line pattern state (codes 72-79 = saw/zigzag, 82-89 = wave)
  let multiMode: null | 'saw' | 'wave' = null;
  let multiNumLines = 0;
  let multiLinesPoints: any[][] = [];
  // internal state for assignment
  let multiAssign = {
    // for saw: idx and dir for zigzag bounce
    idx: 0,
    dir: 1,
    // for wave (numLines==2): flags
    firstAssigned: false,
    waveTarget: 1,
    waveRemaining: 0
  };
  // Attribute rows (attach to next geometry)
  let pendingAttrs: Record<string, any> | null = null;

  // Helper to parse key=value pairs (supports quoted values and escaped quotes)
  const parseAttrsFrom = (line: string): Record<string, any> => {
    const remainder = line.replace(/^\s*(10|20|30|11|12)\b\s*/, '').trim();
    const attrs: Record<string, any> = {};
    const kvRe = /([^\s=]+)=("((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s]+))/g;
    let m: RegExpExecArray | null;
    while ((m = kvRe.exec(remainder)) !== null) {
      const k = m[1];
      let v = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5]);
      if (typeof v === 'string') v = v.replace(/\\(["'\\])/g, '$1');
      attrs[k] = v;
    }
    if (Object.keys(attrs).length === 0) return { _raw: remainder.split(/\s+/).filter(Boolean) };
    return attrs;
  };

  function flushGroup() {
    if (!inGroup || !groupType || groupRows.length === 0) return;
  // If multiMode is active, build per-line geometries from multiLinesPoints
  if (multiMode && multiLinesPoints && multiLinesPoints.length > 0) {
    if (groupType === 'linestring') {
      for (let li = 0; li < multiLinesPoints.length; li++) {
        const pts = multiLinesPoints[li].map(r => new WkbGeomPoint(r.easting, r.northing, r.elevation, { name: r.name || null, fcode: r.code || null, code: r.code, ...(r.attrs||{}) }));
        if (pts.length >= 2) {
          const ls = new WkbGeomLinestring(pts);
          ls.meta = pendingAttrs ? { ...(pendingAttrs||{}) } : {};
          const firstMeta = pts[0].meta || {};
          if (!('name' in ls.meta)) ls.meta.name = firstMeta.name || null;
          if (!('fcode' in ls.meta)) ls.meta.fcode = firstMeta.fcode || null;
          geometries.push(ls);
        } else {
          warnings.push({ line: groupStartLine + 1, message: `Multi-line segment ${li} in group at line ${groupStartLine + 1} has less than 2 points, ignored.`, code: '09' });
        }
      }
    } else if (groupType === 'polygon') {
      // For polygons with multi-lines, try to create polygons from the first non-empty line only
      const firstNonEmpty = multiLinesPoints.find(p => p.length >= 3);
      if (firstNonEmpty) {
        const pts = firstNonEmpty.map(r => new WkbGeomPoint(r.easting, r.northing, r.elevation, { name: r.name || null, fcode: r.code || null, code: r.code, ...(r.attrs||{}) }));
        const closed = pts.length >= 4 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y;
        if (!closed) {
          const p0 = pts[0];
          pts.push(new WkbGeomPoint(p0.x, p0.y, p0.z, p0.meta));
        }
        const poly = new WkbGeomPolygon([new WkbGeomLinestring(pts)]);
        poly.meta = pendingAttrs ? { ...(pendingAttrs||{}) } : {};
        const firstMeta = pts[0].meta || {};
        if (!('name' in poly.meta)) poly.meta.name = firstMeta.name || null;
        if (!('fcode' in poly.meta)) poly.meta.fcode = firstMeta.fcode || null;
        geometries.push(poly);
      } else {
        warnings.push({ line: groupStartLine + 1, message: `Polygon group at line ${groupStartLine + 1} has no sufficiently large multi-line ring, ignored.`, code: '09' });
      }
    }
    // reset multiMode state
    multiMode = null;
    multiNumLines = 0;
    multiLinesPoints = [];
    multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
    // Reset group state and pending attrs
    groupRows = [];
    groupType = null;
    inGroup = false;
    lastGroupEndLine = groupStartLine;
    pendingAttrs = null;
    return;
  }
  const points = groupRows.map(r => new WkbGeomPoint(r.easting, r.northing, r.elevation, { name: r.name || null, fcode: r.code || null, code: r.code, ...(r.attrs||{}) }));
    if (groupType === 'linestring') {
      if (points.length >= 2) {
        const ls = new WkbGeomLinestring(points);
        // Ensure linestring meta has name and fcode (take from first point if missing)
        ls.meta = pendingAttrs ? { ...(pendingAttrs||{}) } : {};
        const firstMeta = points[0].meta || {};
        if (!('name' in ls.meta)) ls.meta.name = firstMeta.name || null;
        if (!('fcode' in ls.meta)) ls.meta.fcode = firstMeta.fcode || null;
        geometries.push(ls);
      } else {
        warnings.push({ line: groupStartLine + 1, message: `Line group at line ${groupStartLine + 1} has less than 2 points, ignored.`, code: '09' });
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
  poly.meta = pendingAttrs ? { ...(pendingAttrs||{}) } : {};
  const firstMeta = points[0].meta || {};
  if (!('name' in poly.meta)) poly.meta.name = firstMeta.name || null;
  if (!('fcode' in poly.meta)) poly.meta.fcode = firstMeta.fcode || null;
    geometries.push(poly);
        } else {
        warnings.push({ line: groupStartLine + 1, message: `Polygon group at line ${groupStartLine + 1} has less than 3 points, ignored.`, code: '09' });
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
      if (warnings.length > 0 && warnings[warnings.length - 1].message && warnings[warnings.length - 1].message.startsWith('KOF lines')) {
        // Already grouped
        const last = warnings[warnings.length - 1].message;
        const match = last.match(/KOF lines (\d+) to (\d+) ignored/);
        if (match && parseInt(match[2]) === i) {
          // Extend range
          warnings[warnings.length - 1] = { line: warnings[warnings.length - 1].line, message: `KOF lines ${match[1]} to ${i + 1} ignored (start with '-')` };
        } else {
          warnings.push({ line: i + 1, message: `KOF lines ${i + 1} ignored (start with '-')` });
        }
      } else {
        warnings.push({ line: i + 1, message: `KOF lines ${i + 1} ignored (start with '-')` });
      }
      continue;
    }
    const code = line.substring(0, 2);
    // New codes: 10,20,30 handling
    if (code === '10') {
      // Header/metadata line - parse key=value pairs and attach to file metadata
      const attrs = parseAttrsFrom(rawLine);
      Object.assign(fileMetadata, attrs);
      continue;
    }
    if (code === '20') {
      // Measurement / auxiliary line - record in warnings for now
      const attrs = parseAttrsFrom(rawLine);
      warnings.push({ line: i + 1, message: `KOF line ${i + 1} measurement/20 parsed: ${JSON.stringify(attrs)}`, code: '20' });
      continue;
    }
    if (code === '30') {
      // Additional attributes line - attach to next geometry
      pendingAttrs = parseAttrsFrom(rawLine);
      continue;
    }
    if (code === '05') {
      // Point observation
      // Pass the original untrimmed line to parseKOFRow so fixed-column slicing is accurate
      const row = parseKOFRow(rawLine, i, warnings, { mode: effectiveMode });
      if (!row) continue;
      if (row.strategy) diagnostics.push({ line: i + 1, strategy: row.strategy });
      if (inGroup) {
        // If multi-mode active, distribute into separate lines
        if (multiMode && multiNumLines > 0) {
          // initialize arrays if needed
          if (!multiLinesPoints || multiLinesPoints.length === 0) {
            multiLinesPoints = Array.from({ length: multiNumLines }, () => [] as any[]);
            multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
            // For wave mode, start with line 0 assigned first
            if (multiMode === 'wave') {
              multiAssign.waveTarget = 1;
              multiAssign.waveRemaining = 0;
            }
          }
          // Assignment logic
          if (multiMode === 'saw') {
            // Zigzag bounce between lines 0..n-1
            multiLinesPoints[multiAssign.idx].push(row);
            // advance
            if (multiNumLines > 1) {
              multiAssign.idx += multiAssign.dir;
              if (multiAssign.idx >= multiNumLines) { multiAssign.idx = multiNumLines - 2; multiAssign.dir = -1; }
              if (multiAssign.idx < 0) { multiAssign.idx = 1; multiAssign.dir = 1; }
            }
          } else if (multiMode === 'wave') {
            // Wave pattern: alternates blocks between lines; for code explanation, use a simple strategy:
            // Start: assign first point to line 0; then assign two points to line1, then two to line0, etc.
            if (!multiAssign.firstAssigned) {
              multiLinesPoints[0].push(row);
              multiAssign.firstAssigned = true;
              multiAssign.waveTarget = 1 % multiNumLines;
              multiAssign.waveRemaining = 2; // next two to target
            } else {
              multiLinesPoints[multiAssign.waveTarget].push(row);
              multiAssign.waveRemaining -= 1;
              if (multiAssign.waveRemaining <= 0) {
                // flip target to the other line (for multiNumLines==2 flip between 0 and 1)
                if (multiNumLines === 2) multiAssign.waveTarget = multiAssign.waveTarget === 0 ? 1 : 0;
                else multiAssign.waveTarget = (multiAssign.waveTarget + 1) % multiNumLines;
                multiAssign.waveRemaining = 2;
              }
            }
          }
          // Also keep raw groupRows for backward compatibility
          groupRows.push(row);
        } else {
          // Collect for group, do not emit as point
          groupRows.push(row);
        }
      } else {
  // Standalone point (attach meta) - store as (easting, northing)
  const p = new WkbGeomPoint(row.easting, row.northing, row.elevation, { name: row.name || null, fcode: row.code || null, code: row.code, ...(row.attrs||{}) });
  if (pendingAttrs) p.meta = { ...(p.meta||{}), ...pendingAttrs };
  geometries.push(p);
  pendingAttrs = null;
      }
    } else if (code === '09') {
      // Normalize the suffix after '09' so we accept forms like '09', '09_72', '09 74', etc.
      const rest = rawLine.replace(/^\s*09[_\s]*/, '').trim();
      // Helper to detect tokens inside the rest
      const hasToken = (tok: string) => new RegExp("\\b" + tok + "\\b").test(rest);

      // Start of group (91)
      // Also accept compact markers like '09_72' or '09 72' by inspecting the raw line directly
      const compactMatch = rawLine.match(/^\s*09[_\s]?([0-9]{2})/);
      if (compactMatch) {
        const codeNum = parseInt(compactMatch[1], 10);
        if (codeNum >= 72 && codeNum <= 79) {
          multiMode = 'saw';
          multiNumLines = Math.max(2, codeNum - 70);
          multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
          multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
          if (!inGroup) { inGroup = true; groupRows = []; groupType = null; groupStartLine = i; }
          continue;
        }
        if (codeNum >= 82 && codeNum <= 89) {
          multiMode = 'wave';
          multiNumLines = Math.max(2, codeNum - 80);
          multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
          multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
          if (!inGroup) { inGroup = true; groupRows = []; groupType = null; groupStartLine = i; }
          continue;
        }
      }
      if (hasToken('91')) {
        if (inGroup) flushGroup();
        inGroup = true;
        groupRows = [];
        groupType = null;
        groupStartLine = i;
        // Defensive: if rest also contains 99 or 96, treat as malformed
        if (hasToken('99') || hasToken('96')) {
          warnings.push({ line: i + 1, message: `KOF line ${i + 1} has both 91 and 99/96, skipping group.`, code: '09' });
          inGroup = false; groupRows = []; groupType = null;
        }
        // done
      } else if (hasToken('99')) {
        // End of linestring group
        if (inGroup) { groupType = 'linestring'; flushGroup(); }
        else warnings.push({ line: i + 1, message: `KOF line ${i + 1} has 99 but no open group.`, code: '09' });
      } else if (hasToken('96')) {
        // End of polygon group
        if (inGroup) { groupType = 'polygon'; flushGroup(); }
        else warnings.push({ line: i + 1, message: `KOF line ${i + 1} has 96 but no open group.`, code: '09' });
      } else if (/(7[2-9])/.test(rest)) {
        // Saw/zigzag pattern detected (72..79)
        const m = rest.match(/(7[2-9])/);
        if (m) {
          const codeNum = parseInt(m[1], 10);
          multiMode = 'saw';
          multiNumLines = Math.max(2, codeNum - 70);
          multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
          multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
          // Open a group so following 05 rows are collected
          if (!inGroup) {
            inGroup = true;
            groupRows = [];
            groupType = null;
            groupStartLine = i;
          }
        }
      } else if (/(8[2-9])/.test(rest)) {
        // Wave pattern detected (82..89)
        const m = rest.match(/(8[2-9])/);
        if (m) {
          const codeNum = parseInt(m[1], 10);
          multiMode = 'wave';
          multiNumLines = Math.max(2, codeNum - 80);
          multiLinesPoints = Array.from({ length: multiNumLines }, () => []);
          multiAssign = { idx: 0, dir: 1, firstAssigned: false, waveTarget: 1, waveRemaining: 0 };
          // Open a group so following 05 rows are collected
          if (!inGroup) {
            inGroup = true;
            groupRows = [];
            groupType = null;
            groupStartLine = i;
          }
        }
      } else {
        warnings.push({ line: i + 1, message: `KOF line ${i + 1} has unknown 09 code.`, code: '09' });
      }
    } else {
      // Unknown or unsupported code
      warnings.push({ line: i + 1, message: `KOF line ${i + 1} has unknown code '${code}'.`, code });
    }
  }
  // Flush any remaining group at EOF
  flushGroup();
  return { geometries, warnings, diagnostics, ...(fileMetadata && { metadata: fileMetadata }) } as any;
}

// KOF class wrapper (API used by tests)
export class KOF {
  fileName: string;
  fileContent: string;
  parsedData: any[] | null = null;
  errors: string[] = [];
  warnings: WarningObj[] = [];
  diagnostics: { line: number, strategy: string }[] = [];
  metadata: Record<string, any> = {};
  // optional CRS settings (string like 'EPSG:25832')
  sourceCrs: string | null = null;
  targetCrs: string | null = null;

  constructor(fileName: string, fileContent: string, opts?: { sourceCrs?: string, targetCrs?: string }) {
    this.fileName = fileName;
    this.fileContent = fileContent;
    this.metadata = { name: fileName, size: fileContent.length, type: 'text/kof' };
    if (opts) {
      if (opts.sourceCrs) { this.sourceCrs = opts.sourceCrs; this.metadata.sourceCrs = opts.sourceCrs; }
      if (opts.targetCrs) { this.targetCrs = opts.targetCrs; this.metadata.targetCrs = opts.targetCrs; }
    }
  }

  setSourceCrs(crs: string | null) { this.sourceCrs = crs; if (crs) this.metadata.sourceCrs = crs; }
  setTargetCrs(crs: string | null) { this.targetCrs = crs; if (crs) this.metadata.targetCrs = crs; }

  // Convenience: reproject the parsed geometries to a target CRS and return GeoJSON.
  // If proj4 is unavailable, returns the original GeoJSON and records a metadata warning.
  reproject(targetCrs: string) {
    const src = this.sourceCrs || (this.metadata && this.metadata.sourceCrs) || null;
    if (!src) {
      this.metadata.reprojectionError = 'Source CRS not set on KOF';
      return this.toGeoJSON();
    }
    if (!proj4) {
      this.metadata.reprojectionError = 'proj4 not available';
      return this.toGeoJSON();
    }
    // Defer to toGeoJSON's per-call option shape
    return this.toGeoJSON({ crs: { from: src, to: targetCrs } });
  }

  parse() {
  // Detect header and set metadata.mode
  const headerLine = this.fileContent.split(/\r?\n/).find(l => l.trim().startsWith('-05'));
  if (headerLine) this.metadata.mode = 'columns'; else this.metadata.mode = 'auto';
  const res = parseKOF(this.fileContent, { mode: this.metadata.mode === 'columns' ? 'columns' : 'auto' });
  this.warnings = res.warnings || [];
  this.diagnostics = res.diagnostics || [];
  this.errors = [];
  if ((res as any).metadata) Object.assign(this.metadata, (res as any).metadata);
  // Build parsedData roughly from content lines for compatibility with tests
  this.parsedData = this.fileContent.split(/\r?\n/).map((l, idx) => ({ row: idx + 1, fields: l.trim().split(/\s+/) }));
  // expose mode
  this.metadata.parserMode = this.metadata.mode;
  this.warnings = res.warnings || [];
  this.diagnostics = res.diagnostics || [];
  return this.parsedData;
  }

  toWkbGeometries() {
  const res = parseKOF(this.fileContent, { mode: this.metadata.mode === 'columns' ? 'columns' : 'auto' });
  if ((res as any).metadata) Object.assign(this.metadata, (res as any).metadata);
    return res.geometries;
  }

  toGeoJSON(opts?: { sourceCrs?: string | null, targetCrs?: string | null, crs?: { from?: string | null, to?: string | null } }) {
  const geoms = this.toWkbGeometries();
    const features: any[] = [];
    const geomToFeature = (g: Geometry) => {
      if (g instanceof WkbGeomPoint) {
        const coords = g.z !== undefined ? [g.x, g.y, g.z] : [g.x, g.y];
        const props = { ...(g.meta || {}) };
        if (!('name' in props)) props.name = null;
        if (!('fcode' in props)) props.fcode = ('code' in props ? props.code : null);
        return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: props };
      } else if (g instanceof WkbGeomLinestring) {
        const coords = g.points.map(p => p.z !== undefined ? [p.x, p.y, p.z] : [p.x, p.y]);
        const props = { ...(g.meta || {}) };
        if (!('name' in props)) props.name = (g.points[0] && g.points[0].meta && ('name' in g.points[0].meta)) ? g.points[0].meta.name : null;
        if (!('fcode' in props)) props.fcode = (g.points[0] && g.points[0].meta && ('fcode' in g.points[0].meta)) ? g.points[0].meta.fcode : null;
        return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props };
      } else if (g instanceof WkbGeomPolygon) {
        const rings = g.rings.map(r => r.points.map(p => p.z !== undefined ? [p.x, p.y, p.z] : [p.x, p.y]));
        const props = { ...(g.meta || {}) };
        const firstPoint = (g.rings[0] && g.rings[0].points && g.rings[0].points[0]) ? g.rings[0].points[0] : null;
        if (!('name' in props)) props.name = firstPoint && firstPoint.meta && ('name' in firstPoint.meta) ? firstPoint.meta.name : null;
        if (!('fcode' in props)) props.fcode = firstPoint && firstPoint.meta && ('fcode' in firstPoint.meta) ? firstPoint.meta.fcode : null;
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties: props };
      }
      return null;
    };
    for (const g of geoms) {
      const f = geomToFeature(g);
      if (f) features.push(f);
    }
    const gj = { type: 'FeatureCollection', features };
    // Determine effective source/target CRS: per-call opts override instance settings
  // Prefer crs.from/crs.to when provided (new option shape). Fall back to older opts keys or instance metadata.
  const src = (opts && opts.crs && opts.crs.from) || (opts && opts.sourceCrs) || this.sourceCrs || (this.metadata && this.metadata.sourceCrs) || null;
  const tgt = (opts && opts.crs && opts.crs.to) || (opts && opts.targetCrs) || this.targetCrs || (this.metadata && this.metadata.targetCrs) || null;
    if (proj4 && src && tgt && src.toLowerCase() !== tgt.toLowerCase()) {
      const reproject = (inGJ: any, from: string, to: string) => {
        const out = JSON.parse(JSON.stringify(inGJ));
        const transformCoords = (coords: any): any => {
          if (typeof coords[0] === 'number') {
            const [x, y] = coords;
            const p = proj4(from, to, [x, y]);
            return [p[0], p[1]];
          }
          return coords.map(transformCoords);
        };
        for (const f of out.features) {
          f.geometry.coordinates = transformCoords(f.geometry.coordinates);
        }
        return out;
      };
      try {
        return reproject(gj, src, tgt);
      } catch (e: any) {
        // If reprojection fails, return the original geojson and leave an error in metadata
        this.metadata.reprojectionError = String((e && (e as any).message) ? (e as any).message : e);
        return gj;
      }
    }
    return gj;
  }

  getMetadata() {
    return this.metadata;
  }
}

