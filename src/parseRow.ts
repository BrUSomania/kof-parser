// parseRow.ts - extract of parseKOFRow implementation to keep kof.ts smaller

export type ParseRowOptions = { mode?: 'columns' | 'tokens', attrs?: Record<string, any> };
export type WarningObj = { line: number; message: string; code?: string };

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
    if (hasDecimal(north)) return true;
    if (Math.abs(north) >= 100000) return true;
    if (Math.abs(east) >= 1000) return true;
    return false;
  };

  const finalize = (easting: number, northing: number, elevation: number, name?: string, code?: string, strategy?: string, extraAttrs: Record<string, any> = {}) => {
    if (!isPlausibleCoord(northing, easting) && isPlausibleCoord(easting, northing)) {
      const tmp = easting;
      easting = northing;
      northing = tmp;
      strategy = strategy ? `${strategy}-swapped` : 'swapped';
    }
    return { easting, northing, elevation, name, code, strategy, attrs: { ...(opts.attrs || {}), ...extraAttrs } };
  };

  // 1) Columns-first attempt
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
      const trailing = afterCode.length > nameWidth + codeWidth + northWidth + eastWidth + elevWidth
        ? afterCode.substr(nameWidth + codeWidth + northWidth + eastWidth + elevWidth).trim()
        : '';
      const extra: Record<string, any> = {};
      if (trailing) {
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
  }

  // 2) Token-based heuristics
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length === 0) {
    warnings.push({ line: lineIdx + 1, message: `KOF line ${lineIdx + 1} malformed: empty row.` });
    return null;
  }
  if (tokens[0] === '05') tokens.shift();
  if (tokens.length === 0) {
    warnings.push({ line: lineIdx + 1, message: `KOF line ${lineIdx + 1} malformed: no data after '05'.` });
    return null;
  }

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
  const build = (north: number, east: number, elev: number, metaStartCount: number, strat: string, lastNumIdx: number) => {
    metaTokens = tokens.slice(0, metaStartCount);
    const name = metaTokens.length >= 1 ? metaTokens[0] : undefined;
    const code = metaTokens.length >= 2 ? metaTokens[1] : undefined;
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

  if (numToks.length >= 2) {
    const last = numToks[numToks.length - 1];
    const prev = numToks[numToks.length - 2];
    if (last.idx >= tokens.length - 1 && prev.idx >= tokens.length - 2) {
      if (numToks.length >= 3 && numToks[numToks.length - 3].idx === tokens.length - 3) {
        const a = numToks[numToks.length - 3].n;
        const b = prev.n;
        const c = last.n;
        if (Math.abs(c) < 1000 && isPlausibleCoord(a, b)) return build(a, b, c, tokens.length - 3, 'tokens-end-3', numToks[numToks.length - 1].idx);
        if (isPlausibleCoord(b, c)) return build(b, c, -500, tokens.length - 3, 'tokens-end-3-large', numToks[numToks.length - 1].idx);
      }
      const north = prev.n;
      const east = last.n;
      const elev = -500;
      if (isPlausibleCoord(north, east)) return build(north, east, elev, tokens.length - 2, 'tokens-end-2', last.idx);
    }
  }

  const decIdx = tokens.findIndex(t => /\d+[.,]\d+/.test(t));
  if (decIdx !== -1 && decIdx + 1 < tokens.length && numRe.test(tokens[decIdx + 1])) {
    const north = normalizeNum(tokens[decIdx])!;
    const east = normalizeNum(tokens[decIdx + 1])!;
    const elev = (decIdx + 2 < tokens.length && numRe.test(tokens[decIdx + 2])) ? normalizeNum(tokens[decIdx + 2])! : -500;
    if (isPlausibleCoord(north, east) || isPlausibleCoord(east, north)) return build(north, east, elev, decIdx, 'decimal-scan', decIdx + 1);
  }

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

  warnings.push({ line: lineIdx + 1, message: `KOF line ${lineIdx + 1} malformed: invalid coordinates.` });
  return null;
}
