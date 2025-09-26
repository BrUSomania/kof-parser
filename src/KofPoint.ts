// Lightweight KofPoint class (self-contained parsing fallback)

export interface KofPointProps {
  raw: string;
  name: string | null;
  code: string | null;
  northing: number;
  easting: number;
  elevation?: number;
}

export class KofPoint {
  props: KofPointProps;

  constructor(kofString: string, headerFormat: string|null = null) {
    if (typeof kofString !== 'string') throw new TypeError('KofPoint constructor expects a string');
    if (!headerFormat) {
      headerFormat = "-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ"  // indices are created from the header whitespace splits
    }
    // Map header tokens to their index using only the first letter as the key
    const tokenIndices = headerFormat.trim().split(/\s+/)
      .map((t, i) => ({ t, i }))
      .reduce((acc, cur) => { acc[cur.t[0]] = cur.i; return acc; }, {} as Record<string, number>);  // map of first-letter token to index
    const tokens = kofString.trim().split(/\s+/).filter(Boolean);
    if (tokens[0] === '05') tokens.shift();

    this.props = {
      raw: kofString,
      name: tokens[tokenIndices['P']] || null,
      code: tokens[tokenIndices['K']] || null,
      northing:   parseFloat(tokens[tokenIndices['X']] || '0'),
      easting:    parseFloat(tokens[tokenIndices['Y']] || '0'),
      elevation:  parseFloat(tokens[tokenIndices['Z']] || '0'),
    };
  }

  // Create a KofPoint from a parsed object. Example:
  // const p = KofPoint.fromParsed({ name: 'Point1', northing: 1000, easting: 2000, elevation: 50 });
  // const p_min = KofPoint.fromParsed({ northing: 1000, easting: 2000 });  // the minimal valid point
  static fromParsed(parsed: Partial<KofPointProps>) {
    return new KofPoint(
      parsed.raw || `05 ${parsed.name||''} ${parsed.code||''} ${parsed.northing||''} ${parsed.easting||''} ${parsed.elevation||''}`
    );
  }
}
