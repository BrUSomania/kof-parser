import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';

// kof.ts - Main KOF parser implementation

// Generic FileReader class
export class FileReader {
  fileName: string;
  fileType: string;
  fileContent: string;
  metadata: Record<string, any>;

  constructor(fileName: string, fileContent: string, fileType = "text/plain") {
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileContent = fileContent;
    this.metadata = {};
    this.extractMetadata();
  }

  extractMetadata() {
    this.metadata.size = this.fileContent.length;
    this.metadata.name = this.fileName;
    this.metadata.type = this.fileType;
  }

  getContent() {
    return this.fileContent;
  }

  getMetadata() {
    return this.metadata;
  }
}


// KOF class for parsing, error-checking, and conversion
export class KOF extends FileReader {
  parsedData: any = null;
  errors: string[] = [];
  warnings: string[] = [];

  constructor(fileName: string, fileContent: string) {
    super(fileName, fileContent, 'text/kof');
  }

  /**
   * Convert parsed KOF data into Wkb geometry objects (points, lines, polygons)
   */
  toWkbGeometries() {
    if (!this.parsedData) this.parse();
    const geoms: (WkbGeomPoint | WkbGeomLinestring | WkbGeomPolygon)[] = [];
    let usedRows = new Set();
    let groupRows: any[] = [];
    let currentType: null | 'line' | 'polygon' = null;
    const flushGroup = () => {
      if (currentType === 'line' && groupRows.length > 1) {
        const line = new WkbGeomLinestring(groupRows.map(r => this._robustPoint(r)));
        geoms.push(line);
        groupRows.forEach(r => usedRows.add(r.row));
      } else if (currentType === 'polygon' && groupRows.length > 2) {
        const poly = new WkbGeomPolygon([new WkbGeomLinestring(groupRows.map(r => this._robustPoint(r)))]);
        geoms.push(poly);
        groupRows.forEach(r => usedRows.add(r.row));
      }
      groupRows = [];
      // Do not reset currentType here; let state machine handle it
    };
    // State machine for KOF geometry grouping
    let state = 'none'; // 'none' | 'line' | 'polygon'
    for (const rowObj of this.parsedData || []) {
      const fields = rowObj.fields;
      let code = fields[0];
      if (code === '09' && fields[1]) code = `09_${fields[1]}`;
      if (code === '09_91') {
        // Start of line or polygon block
        flushGroup();
        state = 'line';
        currentType = 'line';
        groupRows = [];
      } else if (code === '09_96') {
        if (state === 'line') {
          // This 09_96 is actually a start of polygon block (after 09_91)
          flushGroup();
          state = 'polygon';
          currentType = 'polygon';
          groupRows = [];
        } else if (state === 'polygon') {
          // This 09_96 is end of polygon
          flushGroup();
          state = 'none';
          currentType = null;
        } else {
          // 09_96 outside any block, treat as end
          flushGroup();
          state = 'none';
          currentType = null;
        }
      } else if (code === '09_99') {
        if (state === 'line') {
          // End of line
          flushGroup();
          state = 'none';
          currentType = null;
        } else {
          // 09_99 outside line, treat as end
          flushGroup();
          state = 'none';
          currentType = null;
        }
      } else if (code === '05') {
        if (state === 'line' || state === 'polygon') {
          groupRows.push(rowObj);
        }
      }
    }
    flushGroup();
    // Add standalone points
    for (const rowObj of this.parsedData || []) {
      if (rowObj.fields[0] === '05' && !usedRows.has(rowObj.row)) {
        geoms.push(this._robustPoint(rowObj));
      }
    }
    return geoms;
  }

  // Robustly extract a point from a row, handling missing optional fields and field order
  _robustPoint(rowObj: any) {
    const fields = rowObj.fields;
    let name = '';
    let code = '';
    let x = NaN, y = NaN, z = -500;
    // Find the first two fields that look like numbers (x/y), rest are name/code
    let coords: number[] = [];
    for (let i = 1; i < fields.length; i++) {
      const f = fields[i];
      if (/^-?\d+(\.\d+)?$/.test(f)) {
        coords.push(parseFloat(f));
      } else if (!name) {
        name = f;
      } else if (!code) {
        code = f;
      }
    }
    if (coords.length >= 2) {
      x = coords[0];
      y = coords[1];
      if (coords.length > 2) z = coords[2];
    }
    return new WkbGeomPoint(x, y, z, { name, code, row: rowObj.row });
  }

  /**
   * Parse the KOF file, handling:
   * - Ignored rows (starting with '-')
   * - Empty rows
   * - Attempting to repair malformed rows
   * - Collecting warnings/errors
   * - Continuing through file regardless of errors
   */
  parse() {
    const lines = this.fileContent.split(/\r?\n/);
    this.parsedData = [];
    this.errors = [];
    this.warnings = [];
    let ignoreStart: number | null = null;
    let ignoreEnd: number | null = null;
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed === "") {
        // Ignore empty lines
        return;
      }
      if (trimmed.startsWith("-")) {
        // Track consecutive ignored lines
        if (ignoreStart === null) ignoreStart = idx + 1;
        ignoreEnd = idx + 1;
        return;
      } else if (ignoreStart !== null && ignoreEnd !== null) {
        // End of consecutive ignored lines
        if (ignoreStart === ignoreEnd) {
          this.warnings.push(`KOF line ${ignoreStart} ignored (starts with '-')`);
        } else {
          this.warnings.push(`KOF lines ${ignoreStart} to ${ignoreEnd} ignored (start with '-')`);
        }
        ignoreStart = ignoreEnd = null;
      }
      // Try to parse/repair row
      const fields = trimmed.split(/\s+/);
      if (fields[0].length === 2 && !isNaN(Number(fields[0]))) {
        // Looks like a valid row code
        this.parsedData.push({ row: idx + 1, fields });
      } else {
        // Try to repair: e.g. missing space after code
        const match = trimmed.match(/^(\d{2})(.+)$/);
        if (match) {
          const repairedFields = [match[1], ...match[2].trim().split(/\s+/)];
          this.parsedData.push({ row: idx + 1, fields: repairedFields });
          this.warnings.push(`Row ${idx + 1} repaired: missing space after code.`);
        } else {
          this.errors.push(`Row ${idx + 1} ignored: cannot parse or repair.`);
        }
      }
    });
    // Handle trailing ignored lines
    if (ignoreStart !== null && ignoreEnd !== null) {
      if (ignoreStart === ignoreEnd) {
        this.warnings.push(`KOF line ${ignoreStart} ignored (starts with '-')`);
      } else {
        this.warnings.push(`KOF lines ${ignoreStart} to ${ignoreEnd} ignored (start with '-')`);
      }
    }
    return this.parsedData;
  }

  errorCheck() {
    // Deprecated: error handling is now in parse()
    return;
  }

  toGeoJSON() {
    // Placeholder: convert parsedData to GeoJSON
    return { type: 'FeatureCollection', features: [] };
  }

  toWKB() {
    // Placeholder: convert parsedData to WKB (not implemented)
    return null;
  }
}
