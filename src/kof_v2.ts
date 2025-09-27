import * as fs from 'fs';
import * as path from 'path';
import epsgDefs from './data/epsg/epsg_list.json';
import csysDescriptions from './data/epsg/epsg_vs_csysDescription.json';
// Geometry classes
import { KofPoint } from './KofPoint';
import { KofLine } from './KofLine';
import { KofPolygon } from './KofPolygon';
import { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';
import { Key } from 'readline';

// To run directly with Node.js for testing (from project root) - preferred command first:
// npx tsc --project .\tsconfig.json; node .\dist\kof_v2.js;  <---
// or
// tsc .\src\kof_v2.ts; node .\src\kof_v2.js;
//
// Create a basic class KOF_V2 with a constructor that takes a version number and a method to display the version.
// Create one static property to hold the default version.

type KofCode = 
    // Basic codes 00 to 12 and 20
    "00" | "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12" | "20" |
    // 100 to 161
    "100" | "101" | "102" | "103" | "104" | "105" | "106" | "107" | "108" | "109" | "110" | "111" | "112" | "113" | "114" | "115" | "116" | "117" | "118" | "119" |
    "120" | "121" | "122" | "123" | "124" | "125" | "126" | "127" | "128" | "129" | "130" | "131" | "132" | "133" | "134" | "135" | "136" | "137" | "138" | "139" |
    "140" | "141" | "142" | "143" | "144" | "145" | "146" | "147" | "148" | "149" | "150" | "151" | "152" | "153" | "154" | "155" | "156" | "157" | "158" | "159" |
    "160" | "161" |
    // 09_xx codes for multiline and group records
    "09_72" | "09_73" | "09_74" | "09_75" | "09_76" | "09_77" | "09_78" | "09_79" |
    "09_82" | "09_83" | "09_84" | "09_85" | "09_86" | "09_87" | "09_88" | "09_89" |
    "09_90" | "09_91" | "09_92" | "09_93" | "09_94" | "09_96" | "09_99";

type KofCodeDefinition = {
    lineFormat: string;
    description: string;
}
// A set of KOF line codes and short format/descriptions taken from the
// KOF_format_dokumentasjon.pdf. Some formats are approximate and intended
// as guidance for parsing/validation; they can be tightened later.
const kofCodes = new Map<KofCode, KofCodeDefinition>([
    // Basic record types
    ["00", { lineFormat: "^ I2 ^ A64", description: "Comment / free text block" }],
    ["01", { lineFormat: "^ I2 ^ A12 ^ I8 ^ I3 ^ I7 ^ I4 ^ A12 ^ A12", description: "Administrative header: mission, date, version, coordinate system, municipality, units, observer" }],
    ["02", { lineFormat: "^ I2 ^ A20 ^ A10", description: "Station definition: station name, height reference, optional metadata" }],
    ["03", { lineFormat: "^ I2 ^ A20", description: "Point description / attribute block" }],
    ["04", { lineFormat: "^ I2 ^ A20", description: "Measurement metadata / instrument info" }],
    ["05", { lineFormat: "^ I2 ^ A10 ^ A8 ^ F12.3 ^ F11.3 ^ F8.3 ^ I2 ^ A7", description: "Coordinate observation: row code, point name, point code, northing/lat, easting/lon, elevation, quality, attributes" }],
    ["06", { lineFormat: "^ I2 ^ A20", description: "Height observation / leveling" }],
    ["07", { lineFormat: "^ I2 ^ A20", description: "Description / comment for previous record" }],
    ["08", { lineFormat: "^ I2 ^ A20", description: "Auxiliary data / instrument settings" }],
    ["09", { lineFormat: "^ I2(,A2)?", description: "Composite/group record marker with optional subtype (see 09_xx entries)" }],
    ["10", { lineFormat: "^ I2 ^ A.*", description: "Generic metadata or reserved record" }],
    ["11", { lineFormat: "^ I2 ^ A40   ^ A6      ^ A4   ^ A10    ^ A6      ^ A2 ", description: "TELE INKA ADM DATA" }],
    ["12", { lineFormat: "^ I2 ^ A70", description: "TELE EGENSKAPER" }],
    ["20", { lineFormat: "^ I2 ^ F4.1 ^ F4.1", description: "Measurement correction data: Scale factor and addition constant" }],

    // 100-to-161-series: Point attribute codes (from KOF documentation)
    // We'll add a default pattern and a short description for each code in this range.
    // Format used: '^ I3 ^ A.*' means an integer 3-char code followed by free text (attributes)

    // Multiline saw method records (09.72 .. 09.79)
    ["09_72", { lineFormat: "^ A5", description: "Start multiline 2 - saw method" }],
    ["09_73", { lineFormat: "^ A5", description: "Start multiline 3 - saw method" }],
    ["09_74", { lineFormat: "^ A5", description: "Start multiline 4 - saw method" }],
    ["09_75", { lineFormat: "^ A5", description: "Start multiline 5 - saw method" }],
    ["09_76", { lineFormat: "^ A5", description: "Start multiline 6 - saw method" }],
    ["09_77", { lineFormat: "^ A5", description: "Start multiline 7 - saw method" }],
    ["09_78", { lineFormat: "^ A5", description: "Start multiline 8 - saw method" }],
    ["09_79", { lineFormat: "^ A5", description: "Start multiline 9 - saw method" }],

    // Multiline wave method records (09.82 .. 09.89)
    ["09_82", { lineFormat: "^ A5", description: "Start multiline 2 - wave method" }],
    ["09_83", { lineFormat: "^ A5", description: "Start multiline 3 - wave method" }],
    ["09_84", { lineFormat: "^ A5", description: "Start multiline 4 - wave method" }],
    ["09_85", { lineFormat: "^ A5", description: "Start multiline 5 - wave method" }],
    ["09_86", { lineFormat: "^ A5", description: "Start multiline 6 - wave method" }],
    ["09_87", { lineFormat: "^ A5", description: "Start multiline 7 - wave method" }],
    ["09_88", { lineFormat: "^ A5", description: "Start multiline 8 - wave method" }],
    ["09_89", { lineFormat: "^ A5", description: "Start multiline 9 - wave method" }],

    // Other 09_xx records (group/structure markers)
    ["09_90", { lineFormat: "^ A5", description: "Multiple lines/polygons start (group)" }],
    ["09_91", { lineFormat: "^ A5", description: "Single line start / polyline start" }],
    ["09_92", { lineFormat: "^ A5", description: "Start single line spline (spline parameters follow)" }],
    ["09_93", { lineFormat: "^ A5", description: "Start single line circle (circle parameters follow)" }],
    ["09_94", { lineFormat: "^ A5", description: "Start point cloud / point collection" }],
    ["09_96", { lineFormat: "^ A5", description: "Close line -> becomes polygon" }],
    ["09_99", { lineFormat: "^ A5", description: "End of line(s) / end of group" }],
]);

// Helper: generate entries for 100..161 and then add them to kofCodes
const kof100to161: Array<[string, KofCodeDefinition]> = Array.from({ length: 62 }).map((_, i) => {
    const codeNum = 100 + i;
    const key = String(codeNum);
    return [key, { lineFormat: '^ I3 ^ A.*', description: `Point attribute code ${key}` }];
});
// Append generated entries to kofCodes
kof100to161.forEach(e => kofCodes.set(e[0] as KofCode, e[1]));

    
type KofMetadata = {
    fileName: string;
    fileExtension: string;
    fileSize: number;
    sosiCodes: Set<string>;
    fileSizeUnit: string;
    fileType: string;
    numberOfFileLines: number;
    numberOfSosiCodes: number;
    geomCounts: { points: number; lineStrings: number; linePoints: number; polygons: number; polygonPoints: number; };
    // Fill with keys from kofCodes map, counts set to 0 initially
    kofCodeCounts: { [key: string]: number };
};
type EpsgCode = keyof typeof epsgDefs | null;
type KofComments = Record<number, { data: string; comment: string }>;  // when "00" line is parsed
type KofAdmin = Record<number, { data: string; adminInfo: string }>;  // when "01" line is parsed
type KofLineError = Record<number, { data: string; errorMessage: string }>;  // if an error occurs while parsing a line

export class KOF_V2 {
    // Instance properties
    _filePath: string;
    _fileVersion: string;
    _header: string;
    _fileContent: string[];
    _commentBlocks: KofComments = {};
    _adminBlocks: KofAdmin = {};
    _errors: KofLineError = {};
    // Ignored lines should be an object where line numbers map to the actual line content
    _ignoredLines: { [lineNumber: number]: string };
    _fileGeometries: Array<KofPoint | KofLine | KofPolygon>; // Placeholder for parsed geometries
    _kofType: "coordinates" | "measurements" | null = null;
    _sourceEpsg: EpsgCode = null; // Default to UTM32 / ETRS89
    _targetEpsg: EpsgCode = null;
    _sourceEpsgDescription: string | null = null;
    _targetEpsgDescription: string | null = null;
    _metadata: KofMetadata;

    // Static properties
    static _classVersion: string = "0.0.1";

    // Runtime-enforced constructor key — prevents JS callers from instantiating without using factories
    private static readonly _ctorKey: unique symbol = Symbol('KOF_V2_ctor');

    // Constructor - PRIVATE: enforce creating instances via static factory methods
    private constructor(filePath: string, _key?: typeof KOF_V2._ctorKey) {
        if (_key !== KOF_V2._ctorKey) throw new Error('KOF_V2: use static factory methods to create instances');
        this._filePath = filePath;
        this._fileVersion = "1.0.0"; // Default version for demonstration
        this._header = "-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ";
        this._fileContent = KOF_V2.convertKofLinesToArray(filePath);
        this._ignoredLines = {};
        this._fileGeometries = []; // Placeholder for parsed geometries
        this._kofType = null;
        this._sourceEpsg = null;
        this._targetEpsg = null;
        this._metadata = {
            fileName: path.basename(filePath),
            fileExtension: path.extname(filePath),
            fileSize: fs.statSync(filePath).size,
            fileSizeUnit: "bytes",
            fileType: "KOF",
            sosiCodes: KOF_V2.getSosiCodesSet(this._fileContent),
            numberOfFileLines: this._fileContent.length,
            numberOfSosiCodes: KOF_V2.getSosiCodesSet(this._fileContent).size,
            geomCounts: {
                points: 0,
                lineStrings: 0,
                linePoints: 0,
                polygons: 0,
                polygonPoints: 0,
            },
            kofCodeCounts: Object.fromEntries(Array.from(kofCodes.keys()).map(k => [k, 0])),
        };
    }

    // Getters for private properties
    getFilePath(): string { return this._filePath; }
    getFileVersion(): string { return this._fileVersion; }
    getHeader(): string { return this._header; }
    getCommentBlocks(): KofComments { return this._commentBlocks; }
    getAdminBlocks(): KofAdmin { return this._adminBlocks; }
    getFileContent(): string[] { return this._fileContent; }
    getErrors(): KofLineError { return this._errors; }
    getIgnoredLines(): string[] { return Object.values(this._ignoredLines); }
    getFileGeometries(): Array<KofPoint | KofLine | KofPolygon> { return this._fileGeometries; }
    getEpsg(): Object { return { source: this._sourceEpsg, target: this._targetEpsg, sourceDescription: this._sourceEpsgDescription, targetDescription: this._targetEpsgDescription }; }
    getKofType(): "coordinates" | "measurements" | null { return this._kofType; }
    getMetadata(): KofMetadata { return this._metadata; }
    getSosiCodes(): Set<string> { return KOF_V2.getSosiCodesSet(this._fileContent); }

    // Class instance methods
    _isEpsgValid(epsg: EpsgCode, isSource: boolean = true): boolean {
        if (!epsg) return false;
        const epsgStr = String(epsg);
        // Accept either 'EPSG:1234' or plain numeric '1234'
        if (!/^EPSG:\d{3,6}$/i.test(epsgStr) && !/^\d{3,6}$/.test(epsgStr)) return false;
        const keyWithPrefix = epsgStr.toUpperCase();
        const keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        return !!((epsgDefs as any)[keyWithPrefix] || (epsgDefs as any)[keyNoPrefix]);
    }

    _isCsysDescriptionAvailable(epsg: EpsgCode): boolean {
        if (!epsg) return false;
        const epsgStr = String(epsg).toUpperCase();
        const keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        return !!((csysDescriptions as any)[epsgStr] || (csysDescriptions as any)[keyNoPrefix]);
    }
    
    setSourceCrs(epsg: EpsgCode): void {
        if (!this._isEpsgValid(epsg)) throw new Error("Invalid EPSG code");
        const epsgStr = String(epsg).toUpperCase();
        const keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        this._sourceEpsg = (epsgStr in (epsgDefs as any) ? epsgStr : keyNoPrefix) as keyof typeof epsgDefs;
        if (!this._isCsysDescriptionAvailable(this._sourceEpsg)) throw new Error("No coordinate system description available for EPSG code");
        this._sourceEpsgDescription = this._sourceEpsg && (epsgDefs as any)[this._sourceEpsg] ? (epsgDefs as any)[this._sourceEpsg] : null;
    }

    setTargetCrs(epsg: EpsgCode): void {
        if (!this._isEpsgValid(epsg)) throw new Error("Invalid EPSG code");
        const epsgStr = String(epsg).toUpperCase();
        const keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        this._targetEpsg = (epsgStr in (epsgDefs as any) ? epsgStr : keyNoPrefix) as keyof typeof epsgDefs;
        if (!this._isCsysDescriptionAvailable(this._targetEpsg)) throw new Error("No coordinate system description available for EPSG code");
        this._targetEpsgDescription = this._targetEpsg && (epsgDefs as any)[this._targetEpsg] ? (epsgDefs as any)[this._targetEpsg] : null;
    }

    printFileVersion(): string {
        return `KOF_V2 Version: ${this._fileVersion}`;
    }

    printContent(): string {
        return this._fileContent.join('\n');
    }

    printMetadata(): Record<string, any> {
        return this._metadata;
    }

    reproject(sourceEpsg: string, targetEpsg: string): void {
        // Placeholder: actual reprojection logic would go here
        console.log(`Reprojecting from ${sourceEpsg} to ${targetEpsg} - not yet implemented`);
    }

    convertToWkbGeometries(): any[] {
        // Placeholder: actual conversion logic to WKB geometries would go here
        return [];
    }

    convertToGeoJson(): any {
        // Placeholder: actual conversion logic to GeoJSON would go here
        return {};
    }

    addGeometry(geometry: KofPoint | KofLine | KofPolygon): void {
        const geometryType = geometry.constructor.name;
        switch (geometryType) {
            case 'KofPoint':
                const pointGeom = geometry as KofPoint;
                this._fileGeometries.push(pointGeom);
                this._metadata.geomCounts.points += 1;
                break;
            case 'KofLine':
                const lineGeom = geometry as KofLine;
                this._fileGeometries.push(lineGeom);
                this._metadata.geomCounts.lineStrings += 1;
                this._metadata.geomCounts.linePoints += lineGeom.props.points.length;
                break;
            case 'KofPolygon':
                const polygonGeom = geometry as KofPolygon;
                this._fileGeometries.push(polygonGeom);
                this._metadata.geomCounts.polygons += 1;
                this._metadata.geomCounts.polygonPoints += polygonGeom.props.points.length;
                break;
            default:
                throw new Error(`[addGeometry()] Unsupported geometry type: ${geometryType}`);
        }
    }

    _parseKofPoint(kofString: string): KofPoint | null {
        const kofPoint = new KofPoint(kofString);
        return (kofPoint.props.northing !== 0 && kofPoint.props.easting !== 0) ? kofPoint : null;
    }

    _getIndexAndCodeOfStopcode(startIndex: number): { endIndex: number, code: KofCode } {
        for (let i = startIndex; i < this._fileContent.length; i++) {
            const line = this._fileContent[i].trim();
            // If line starts with 09_91 (single line start), 09_96 (close line -> polygon) or 09_99 or 09_72..09_79 or 09_82..09_89 (multiline starts), it's the end of the current line/polygon
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine[0] === '-') continue;
            const kofCode: KofCode = (trimmedLine.split(/\s+/)[0] as KofCode).replace(/\s+/g, '_') as KofCode;
            if (kofCode === '09_96' || kofCode === '09_99' || kofCode === '09_91' ||
                (kofCode >= '09_72' && kofCode <= '09_79') ||
                (kofCode >= '09_82' && kofCode <= '09_89')) {
                return { endIndex: i, code: kofCode };
            }
        }
        return { endIndex: this._fileContent.length - 1, code: '09_99' }; // Default to end of file if no stop code found
    }

    _getKofLinesFromIndexToNextStopCode(startIndex: number, endIndex: number): string[] {
        const lines: string[] = [];
        for (let i = startIndex; i <= endIndex; i++) {
            lines.push(this._fileContent[i]);
        }
        return lines;
    }

    _constructKofLinesFromSawMethod(lines: string[], numberOfLines: number): string[] {
        // Use round-robin distribution for saw to evenly distribute points
        // across the requested number of lines. This matches expected
        // behaviour for demo files where each output line should receive
        // roughly totalPoints/numberOfLines points (balanced).
        if (!Array.isArray(lines) || numberOfLines <= 0) return [];
        const buckets: string[][] = Array.from({ length: numberOfLines }, () => []);
        for (let i = 0; i < lines.length; i++) {
            const idx = i % numberOfLines;
            buckets[idx].push(lines[i]);
        }
        return buckets.flat();
    }

    _constructKofLinesFromWaveMethod(lines: string[], numberOfLines: number): string[] {
        // Wave distribution: up-then-down assignment across N lines.
        // For numberOfLines = N, produce an index sequence like:
        // 0,1,2,...,N-1, N-1, N-2, ..., 1,0, 0,1,... (cycle length = 2*N)
        // This intentionally repeats the endpoints so a block of 2*N points
        // maps to forward then backward including the endpoints (matching
        // the demo expectation: a b c d e f f e d c b a for N=6).
        if (!Array.isArray(lines) || numberOfLines <= 0) return [];
        if (numberOfLines === 1) return lines.slice();

        const buckets: string[][] = Array.from({ length: numberOfLines }, () => []);
        const cycleLen = numberOfLines * 2;
        for (let i = 0; i < lines.length; i++) {
            const k = i % cycleLen;
            const idx = (k < numberOfLines) ? k : (cycleLen - k - 1);
            buckets[idx].push(lines[i]);
        }
        return buckets.flat();
    }

    parseContentToGeometries(): void {
        for (let lineIndex = 0; lineIndex < this._fileContent.length; lineIndex++) {
            // Iterate with index to track line numbers and ignore lines starting with '-'
            const line = this._fileContent[lineIndex];
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine[0] === '-') { // Example: ignore comment lines starting with '-'
                this._ignoredLines[lineIndex+1] = line;
                continue;
            }
            const tokens = trimmedLine.split(/\s+/);  // Split by whitespace
            let code = tokens[0].replace(/\s+/g, '_');  // Normalize spaces to underscores

            let stopCode: { endIndex: number, code: KofCode } | null = null;
            let lineStrings: string[] = [];
            // Parse geometry based on code
            switch (code) {
                case '00':  // Comment / free text block
                    // Add comment handling if needed
                    break;
                case '05':  // Point record (could be part of line or polygon)
                    const kofPoint = this._parseKofPoint(line);
                    if (kofPoint) this.addGeometry(kofPoint);
                    break;
                case '09_72':
                case '09_73':
                case '09_74':
                case '09_75':
                case '09_76':
                case '09_77':
                case '09_78':
                case '09_79':
                    const numberOfMultilineSaw = parseInt(code.split('_')[1], 10) - 70;
                    stopCode = this._getIndexAndCodeOfStopcode(lineIndex + 1);
                    lineStrings = this._getKofLinesFromIndexToNextStopCode(lineIndex + 1, stopCode.endIndex - 1);
                    lineIndex = stopCode.endIndex; // Move index to end of line/polygon
                    // Start multiline N - saw method
                    break;
                case '09_82':
                case '09_83':
                case '09_84':
                case '09_85':
                case '09_86':
                case '09_87':
                case '09_88':
                case '09_89':
                    const numberOfMultilineWave = parseInt(code.split('_')[1], 10) - 80;
                    stopCode = this._getIndexAndCodeOfStopcode(lineIndex + 1);
                    lineStrings = this._getKofLinesFromIndexToNextStopCode(lineIndex + 1, stopCode.endIndex - 1);
                    lineIndex = stopCode.endIndex; // Move index to end of line/polygon
                    // Start multiline N - wave method
                    break;
                case '09_91':
                    // Start single line / polyline - find line end (09_96 or 09_99)
                    stopCode = this._getIndexAndCodeOfStopcode(lineIndex + 1);
                    lineStrings = this._getKofLinesFromIndexToNextStopCode(lineIndex + 1, stopCode.endIndex - 1);
                    lineIndex = stopCode.endIndex; // Move index to end of line/polygon
                    switch (stopCode.code) {
                        case '09_91':  // stop current line (same as "09_99") and start a new one ("09_91") by decrementing lineIndex
                        case '09_72': case '09_73': case '09_74': case '09_75': case '09_76': case '09_77': case '09_78': case '09_79':
                        case '09_82': case '09_83': case '09_84': case '09_85': case '09_86': case '09_87': case '09_88': case '09_89':
                            const kofLineStop91 = new KofLine(lineStrings);
                            this.addGeometry(kofLineStop91);
                            lineIndex--; // This makes sure we re-process the new 09_91 line in the next iteration
                            break;
                        case '09_96':
                            const kofPolygon = new KofPolygon(lineStrings);
                            this.addGeometry(kofPolygon);
                            break;
                        case '09_99':
                            const kofLineStop99 = new KofLine(lineStrings);
                            this.addGeometry(kofLineStop99);
                            break;
                    break;
                // Add more cases as needed for other codes
                default:  // e.g. "09_96", "09_99" while not creating a line/polygon
                    this._ignoredLines[lineIndex + 1] = line;
                    this._errors[lineIndex + 1] = { data: line, errorMessage: `Unexpected standalone code ${code}` };
                    throw new Error(`[parseLine()] Unexpected standalone code ${code} at line ${lineIndex + 1}`);
                }
            }
        }
    }

    // Static methods
    static convertKofLinesToArray(filePath: string): string[] {
        // Read file content each line into an array
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return fileContent.split(/\r?\n/);
    }

    static validateKofContent(fileContent: string[]): void {
        // Pass for now
    }

    static getSosiCodesSet(fileContent: string[]): Set<string> {
        const sosiCodes = new Set<string>();
        // Two parsing strategies:
        // 1) Columns mode (when a header like '-05 PPPPPPPPPP KKKKKKKK ...' is present)
        //    -> extract the 8-char KKKKKKKK field from fixed columns on 05 rows
        // 2) Token mode (fallback) -> scan whitespace-separated tokens for an integer code
        const headerLine = fileContent.find(l => !!l && l.trim().startsWith('-05'));
        // If there is a header and it contains the literal KKKKKKKK token, use its absolute column index.
        // Otherwise fall back to the standard KOF header column start for KKKKKKKK (index 15, 0-based)
        let headerCodeStart: number | null = null;
        if (headerLine) {
            const idx = headerLine.indexOf('KKKKKKKK');
            if (idx >= 0) headerCodeStart = idx;
        }
        if (headerCodeStart === null) {
            // standard header (as in the README): '-05 PPPPPPPPPP KKKKKKKK ...' -> 'KKKKKKKK' starts at column 15 (0-based)
            headerCodeStart = 15;
        }

        fileContent.forEach(line => {
            if (!line || !line.trim()) return;
            const raw = line.replace(/\r?\n$/, '');
            const trimmed = raw.trim();
            if (!trimmed.startsWith('05')) return;

            if (headerCodeStart !== null) {
                // Use the absolute column from the header to extract the 8-char code field
                const codeField = (raw.length >= headerCodeStart)
                    ? raw.substr(headerCodeStart, 8).trim()
                    : raw.slice(-8).trim(); // fallback to last 8 chars if line too short
                if (/^\d{1,8}$/.test(codeField)) sosiCodes.add(codeField);
            } else {
                // Previous token-based fallback: find the first integer-like token after the '05' token
                const toks = trimmed.split(/\s+/);
                for (let i = 1; i < toks.length; i++) {
                    const t = toks[i];
                    if (/^\d{1,8}$/.test(t)) {
                        sosiCodes.add(t);
                        break;
                    }
                }
            }
        });
        return sosiCodes;
    }

    static displayClassVersion(): string {
        return `KOF_V2 Class Version: ${KOF_V2._classVersion}`;
    }

    static validateKofExtension(filePath: string): boolean {
        return filePath.toLowerCase().endsWith('.kof');
    }

    static _readSingleFile(filePath: string, validateExtensionIsKof: boolean = true): KOF_V2 {
    if (validateExtensionIsKof && !KOF_V2.validateKofExtension(filePath)) throw new Error("Invalid file extension");
    return new KOF_V2(filePath, KOF_V2._ctorKey);
    }

    static _readMultipleFiles(filePaths: string[], validateExtensionIsKof: boolean = true): KOF_V2[] {
        const kofFiles: KOF_V2[] = [];
        filePaths.forEach(fp => {
            if (validateExtensionIsKof && !KOF_V2.validateKofExtension(fp)) throw new Error("Invalid file extension");
            kofFiles.push(new KOF_V2(fp, KOF_V2._ctorKey));
        });
        return kofFiles;
    }

    static _readFolder(folderPath: string, recursive: boolean = false): KOF_V2[] {
        const kofFiles: KOF_V2[] = [];
        const walk = (dir: string) => {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            items.forEach(item => {
                if (item.isDirectory() && recursive) {
                    walk(path.join(dir, item.name));
                } else if (item.isFile() && item.name.endsWith('.kof')) {
                    kofFiles.push(new KOF_V2(path.join(dir, item.name), KOF_V2._ctorKey));
                }
            });
        };
        walk(folderPath);
        return kofFiles;
    }
    
    // The main read function checks the type of input and calls the appropriate static method
    static read(input: string | string[], validateExtensionIsKof: boolean = true, recursive: boolean = false): KOF_V2[] {
        let isInputDirectory = false;
        try {
            const stats = fs.statSync(input as string);
            isInputDirectory = stats.isDirectory();
        } catch (error) {
            isInputDirectory = false;
        }
        // Determine the type of input (single file, multiple files or path) and call the appropriate method
        if (isInputDirectory)       return KOF_V2._readFolder(input as string, recursive);
        if (Array.isArray(input))   return KOF_V2._readMultipleFiles(input as string[], validateExtensionIsKof);
        else                        return [KOF_V2._readSingleFile(input as string, validateExtensionIsKof)];
    }
}



{ // Only run this when we run the file directly with Node.js for testing
    if (require.main === module) {
        // Example usage:
        const kofPointsFilePath = './src/demo/kof_files/01-03_points_multiple_utm32_epsg25832.kof';
        const kofPolygonsFilePath = './src/demo/kof_files/03-02_polygon_single_utm32_epsg25832_with_header.kof';
        const kofPolygonsInstance = KOF_V2.read(kofPolygonsFilePath)[0];
        const kofMixedPath = './src/demo/kof_files/04_mixed_multiple_utm32_epsg25832.kof';
        // Log to terminal
        console.log(KOF_V2.displayClassVersion());
        console.log(kofPolygonsInstance.printFileVersion());
        console.log(kofPolygonsInstance.printMetadata());
        console.log(kofPolygonsInstance.printContent());

        // // Multiple files
        // const kofMultipleInstances = KOF_V2.read([kofPointsFilePath, kofPolygonsFilePath]);
        // kofMultipleInstances.forEach((instance, index) => {
        //     console.log(`\n--- File ${index + 1} ---`);
        //     console.log(instance.printFileVersion());
        //     console.log(instance.printMetadata());
        //     console.log(instance.printContent());
        // });

        // // Read folder
        // const kofFolderPath = './src/demo/kof_files';
        // const kofFolderInstances = KOF_V2.read(kofFolderPath, false);
        // kofFolderInstances.forEach((instance, index) => {
        //     console.log(`\n--- Folder File ${index + 1} ---`);
        //     console.log(instance.printFileVersion());
        //     console.log(instance.printMetadata());
        //     console.log(instance.printContent());
        // });

        // // Try creating KOF instance as "new KOF_V2()" - should fail
        // try {
        //     // @ts-ignore
        //     const invalidInstance = new KOF_V2(kofPointsFilePath);
        // } catch (error) {
        //     console.error("Error creating KOF_V2 instance directly:", (error as Error).message);
        // }
    }
}
