// Lightweight KofPoint class (self-contained parsing fallback)

export interface KofPointProps {
  type:  'point';  
  raw:  string | null;
  name: string | null;
  code: string | null;
  northing:   number;
  easting:    number;
  elevation?: number;
}

export class KofPoint {
  props: KofPointProps;

  constructor(kofString: string, headerFormat: string|null = null) {
    if (typeof kofString !== 'string') throw new TypeError('KofPoint constructor expects a string');
    if (!headerFormat) {
      headerFormat = "-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ"  // indices are created from the header whitespace splits
    }
    // Map header tokens to absolute column start and length using only the
    // first letter as the key (P, K, X, Y, Z). This lets us extract fields by
    // fixed-column slicing so empty fields are preserved.
    const headerTokens = headerFormat.trim().split(/\s+/);
    const tokenPositions = {} as Record<string, { start: number; len: number }>;
    // Compute token start positions by searching the header string from a cursor
    let cursor = 0;
    for (const t of headerTokens) {
      const idx = headerFormat.indexOf(t, cursor);
      const key = t[0];
      tokenPositions[key] = { start: idx, len: t.length };
      cursor = idx + t.length;
    }

    const rawLine = kofString.replace(/\r?\n$/, '');

    const getFieldByKey = (k: string): string | null => {
      const pos = tokenPositions[k];
      if (!pos) return null;
      if (rawLine.length <= pos.start) return null;
      return rawLine.substr(pos.start, pos.len).trim() || null;
    };

    // If tokenPositions contains expected keys use column extraction, else
    // fall back to whitespace-splitting (legacy behavior).
    let name: string | null = null;
    let code: string | null = null;
    let northing = 0;
    let easting = 0;
    let elevation: number | undefined = undefined;

    if (tokenPositions['P'] && tokenPositions['K'] && tokenPositions['X'] && tokenPositions['Y']) {
      name = getFieldByKey('P');
      code = getFieldByKey('K');
      const northStr = getFieldByKey('X');
      const eastStr = getFieldByKey('Y');
      const zStr = getFieldByKey('Z');
      northing = northStr ? parseFloat(northStr) : 0;
      easting = eastStr ? parseFloat(eastStr) : 0;
      elevation = zStr ? parseFloat(zStr) : undefined;
    } else {
      // Legacy whitespace fallback
      const tokens = kofString.trim().split(/\s+/).filter(Boolean);
      if (tokens[0] === '05') tokens.shift();
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

  // Create a KofPoint from a parsed object. Example:
  // const p = KofPoint.fromParsed({ name: 'Point1', northing: 1000, easting: 2000, elevation: 50 });
  // const p_min = KofPoint.fromParsed({ northing: 1000, easting: 2000 });  // the minimal valid point
  static fromParsed(parsed: Partial<KofPointProps>): KofPoint {
    if (typeof parsed !== 'object' || parsed === null) throw new TypeError('KofPoint.fromParsed expects an object');
    if (typeof parsed.northing !== 'number' || typeof parsed.easting !== 'number') {
      throw new TypeError('KofPoint.fromParsed requires at least northing and easting as numbers');
    }
    return new KofPoint(
      parsed.raw || `05 ${parsed.name||''} ${parsed.code||''} ${parsed.northing||''} ${parsed.easting||''} ${parsed.elevation||''}`
    );
  }
}
