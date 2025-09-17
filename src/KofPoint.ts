// Lightweight KofPoint class (self-contained parsing fallback)

export interface KofPointProps {
  raw: string;
  tokens: string[];
  name?: string | null;
  code?: string | null;
  easting?: number | null;
  northing?: number | null;
  elevation?: number | null;
  attrs?: Record<string, any> | null;
}

export class KofPoint {
  props: KofPointProps;

  // Accept optional parsed object (from central parser) to avoid circular imports
  constructor(kof05line: string, parsed?: any) {
    if (typeof kof05line !== 'string') throw new TypeError('KofPoint constructor expects a string');
    let p = parsed;
    if (!p) {
      // lightweight tokenization fallback
      const tokens = kof05line.trim().split(/\s+/).filter(Boolean);
      p = { tokens };
      // strip leading '05' if present
      if (p.tokens[0] === '05') p.tokens.shift();
      // try to pick last two numeric tokens as north/east
      const numRe = /^-?\d+(?:[.,]\d+)?$/;
      const numIdx = p.tokens.map((t: string, i: number) => ({ t, i })).filter((x: any) => numRe.test(x.t));
      if (numIdx.length >= 2) {
        const a = parseFloat(String(numIdx[numIdx.length - 2].t).replace(',', '.'));
        const b = parseFloat(String(numIdx[numIdx.length - 1].t).replace(',', '.'));
        p.easting = b; p.northing = a; p.elevation = -500;
      }
    }
    this.props = {
      raw: kof05line,
      tokens: p.tokens || [],
      name: p.name || null,
      code: p.code || null,
      easting: p.easting ?? null,
      northing: p.northing ?? null,
      elevation: p.elevation ?? null,
      attrs: p.attrs || null,
    };
  }

  toString() { return this.props.raw; }

  static fromParsed(row: any) {
    // Build a reasonable raw string for debugging; not used for parsing
    const parts: string[] = ['05'];
    if (row.name) parts.push(String(row.name));
    if (row.code) parts.push(String(row.code));
    if (row.northing !== undefined) parts.push(String(row.northing));
    if (row.easting !== undefined) parts.push(String(row.easting));
    if (row.elevation !== undefined) parts.push(String(row.elevation));
    return new KofPoint(parts.join(' '), row);
  }
}
