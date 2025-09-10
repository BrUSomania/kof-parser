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
