"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KOF_V2 = void 0;
var fs = require("fs");
var path = require("path");
var epsg_list_json_1 = require("./data/epsg/epsg_list.json");
var epsg_vs_csysDescription_json_1 = require("./data/epsg/epsg_vs_csysDescription.json");
var KofLine_1 = require("./KofLine");
// A set of KOF line codes and short format/descriptions taken from the
// KOF_format_dokumentasjon.pdf. Some formats are approximate and intended
// as guidance for parsing/validation; they can be tightened later.
var kofCodes = new Map([
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
    // Multiline saw method records (09.71 .. 09.79)
    ["09.71", { lineFormat: "^ A5", description: "Start multiline 1 - saw method" }],
    ["09.72", { lineFormat: "^ A5", description: "Start multiline 2 - saw method" }],
    ["09.73", { lineFormat: "^ A5", description: "Start multiline 3 - saw method" }],
    ["09.74", { lineFormat: "^ A5", description: "Start multiline 4 - saw method" }],
    ["09.75", { lineFormat: "^ A5", description: "Start multiline 5 - saw method" }],
    ["09.76", { lineFormat: "^ A5", description: "Start multiline 6 - saw method" }],
    ["09.77", { lineFormat: "^ A5", description: "Start multiline 7 - saw method" }],
    ["09.78", { lineFormat: "^ A5", description: "Start multiline 8 - saw method" }],
    ["09.79", { lineFormat: "^ A5", description: "Start multiline 9 - saw method" }],
    // Multiline wave method records (09.81 .. 09.89)
    ["09.81", { lineFormat: "^ A5", description: "Start multiline 1 - wave method" }],
    ["09.82", { lineFormat: "^ A5", description: "Start multiline 2 - wave method" }],
    ["09.83", { lineFormat: "^ A5", description: "Start multiline 3 - wave method" }],
    ["09.84", { lineFormat: "^ A5", description: "Start multiline 4 - wave method" }],
    ["09.85", { lineFormat: "^ A5", description: "Start multiline 5 - wave method" }],
    ["09.86", { lineFormat: "^ A5", description: "Start multiline 6 - wave method" }],
    ["09.87", { lineFormat: "^ A5", description: "Start multiline 7 - wave method" }],
    ["09.88", { lineFormat: "^ A5", description: "Start multiline 8 - wave method" }],
    ["09.89", { lineFormat: "^ A5", description: "Start multiline 9 - wave method" }],
    // Other 09_xx records (group/structure markers)
    ["09.90", { lineFormat: "^ A5", description: "Multiple lines/polygons start (group)" }],
    ["09.91", { lineFormat: "^ A5", description: "Single line start / polyline start" }],
    ["09.92", { lineFormat: "^ A5", description: "Start single line spline (spline parameters follow)" }],
    ["09.93", { lineFormat: "^ A5", description: "Start single line circle (circle parameters follow)" }],
    ["09.94", { lineFormat: "^ A5", description: "Start point cloud / point collection" }],
    ["09.96", { lineFormat: "^ A5", description: "Close line -> becomes polygon" }],
    ["09.99", { lineFormat: "^ A5", description: "End of line(s) / end of group" }],
]);
// Helper: generate entries for 100..161 and then add them to kofCodes
var kof100to161 = Array.from({ length: 62 }).map(function (_, i) {
    var codeNum = 100 + i;
    var key = String(codeNum);
    return [key, { lineFormat: '^ I3 ^ A.*', description: "Point attribute code ".concat(key) }];
});
// Append generated entries to kofCodes
kof100to161.forEach(function (e) { return kofCodes.set(e[0], e[1]); });
var KOF_V2 = exports.KOF_V2 = /** @class */ (function () {
    // Constructor - PRIVATE: enforce creating instances via static factory methods
    function KOF_V2(filePath, _key) {
        this._kofType = null;
        this._sourceEpsg = null; // Default to UTM32 / ETRS89
        this._targetEpsg = null;
        this._sourceEpsgDescription = null;
        this._targetEpsgDescription = null;
        if (_key !== KOF_V2._ctorKey)
            throw new Error('KOF_V2: use static factory methods to create instances');
        this._filePath = filePath;
        this._fileVersion = "1.0.0"; // Default version for demonstration
        this._header = "-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ";
        this._fileContent = KOF_V2.convertKofLinesToArray(filePath);
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
            kofCodeCounts: Object.fromEntries(Array.from(kofCodes.keys()).map(function (k) { return [k, 0]; })),
        };
    }
    // Getters for private properties
    KOF_V2.prototype.getfilePath = function () { return this._filePath; };
    KOF_V2.prototype.getfileVersion = function () { return this._fileVersion; };
    KOF_V2.prototype.getheader = function () { return this._header; };
    KOF_V2.prototype.getfileContent = function () { return this._fileContent; };
    KOF_V2.prototype.getEpsg = function () { return { source: this._sourceEpsg, target: this._targetEpsg, sourceDescription: this._sourceEpsgDescription, targetDescription: this._targetEpsgDescription }; };
    KOF_V2.prototype.getKofType = function () { return this._kofType; };
    KOF_V2.prototype.getMetadata = function () { return this._metadata; };
    // Class instance methods
    KOF_V2.prototype._isEpsgValid = function (epsg, isSource) {
        if (isSource === void 0) { isSource = true; }
        if (!epsg)
            return false;
        var epsgStr = String(epsg);
        // Accept either 'EPSG:1234' or plain numeric '1234'
        if (!/^EPSG:\d{3,6}$/i.test(epsgStr) && !/^\d{3,6}$/.test(epsgStr))
            return false;
        var keyWithPrefix = epsgStr.toUpperCase();
        var keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        return !!(epsg_list_json_1.default[keyWithPrefix] || epsg_list_json_1.default[keyNoPrefix]);
    };
    KOF_V2.prototype._isCsysDescriptionAvailable = function (epsg) {
        if (!epsg)
            return false;
        var epsgStr = String(epsg).toUpperCase();
        var keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        return !!(epsg_vs_csysDescription_json_1.default[epsgStr] || epsg_vs_csysDescription_json_1.default[keyNoPrefix]);
    };
    KOF_V2.prototype.setSourceCrs = function (epsg) {
        if (!this._isEpsgValid(epsg))
            throw new Error("Invalid EPSG code");
        var epsgStr = String(epsg).toUpperCase();
        var keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        this._sourceEpsg = (epsgStr in epsg_list_json_1.default ? epsgStr : keyNoPrefix);
        if (!this._isCsysDescriptionAvailable(this._sourceEpsg))
            throw new Error("No coordinate system description available for EPSG code");
        this._sourceEpsgDescription = this._sourceEpsg && epsg_list_json_1.default[this._sourceEpsg] ? epsg_list_json_1.default[this._sourceEpsg] : null;
    };
    KOF_V2.prototype.setTargetCrs = function (epsg) {
        if (!this._isEpsgValid(epsg))
            throw new Error("Invalid EPSG code");
        var epsgStr = String(epsg).toUpperCase();
        var keyNoPrefix = epsgStr.replace(/^EPSG:/i, '');
        this._targetEpsg = (epsgStr in epsg_list_json_1.default ? epsgStr : keyNoPrefix);
        if (!this._isCsysDescriptionAvailable(this._targetEpsg))
            throw new Error("No coordinate system description available for EPSG code");
        this._targetEpsgDescription = this._targetEpsg && epsg_list_json_1.default[this._targetEpsg] ? epsg_list_json_1.default[this._targetEpsg] : null;
    };
    KOF_V2.prototype.printFileVersion = function () {
        return "KOF_V2 Version: ".concat(this._fileVersion);
    };
    KOF_V2.prototype.printContent = function () {
        return this._fileContent.join('\n');
    };
    KOF_V2.prototype.printMetadata = function () {
        return this._metadata;
    };
    KOF_V2.prototype.reproject = function (sourceEpsg, targetEpsg) {
        // Placeholder: actual reprojection logic would go here
        console.log("Reprojecting from ".concat(sourceEpsg, " to ").concat(targetEpsg, " - not yet implemented"));
    };
    KOF_V2.prototype.convertToWkbGeometries = function () {
        // Placeholder: actual conversion logic to WKB geometries would go here
        return [];
    };
    KOF_V2.prototype.convertToGeoJson = function () {
        // Placeholder: actual conversion logic to GeoJSON would go here
        return {};
    };
    KOF_V2.prototype.getSosiCodes = function () {
        return KOF_V2.getSosiCodesSet(this._fileContent);
    };
    KOF_V2.prototype.parseContentToGeometries = function () {
        for (var _i = 0, _a = this._fileContent; _i < _a.length; _i++) {
            var line = _a[_i];
            var trimmed = line.trim();
            if (!trimmed)
                continue;
            // The code could be either "05", "09_91", "09 91", "POLYGON", etc.
            // If it's e.g. "09 91" we should convert the space to underscore for matching
            // We'll split by whitespace and check the first token(s)
            var tokens = trimmed.split(/\s+/); // Split by whitespace
            if (tokens.length === 0)
                continue;
            var code = tokens[0].replace(/\s+/g, '_'); // Normalize spaces to underscores
            // Parse geometry based on code
            switch (code) {
                case '05': // Point record (could be part of line or polygon)
                    // this._fileGeometries.push(new KofPoint(tokens));
                    break;
                case '09_72':
                case '09_73':
                case '09_74':
                case '09_75':
                case '09_76':
                case '09_77':
                case '09_78':
                case '09_79':
                    var numberOfMultilineSaw = parseInt(code.split('_')[1], 10) - 70;
                    // Start multiline N - saw method
                    break;
                case '09_81':
                case '09_82':
                case '09_83':
                case '09_84':
                case '09_85':
                case '09_86':
                case '09_87':
                case '09_88':
                case '09_89':
                    var numberOfMultilineWave = parseInt(code.split('_')[1], 10) - 80;
                    // Start multiline N - wave method
                    break;
                case '09_91':
                    this._fileGeometries.push(new KofLine_1.KofLine(tokens));
                    break;
                case '09_96':
                    // Close line -> line becomes polygon
                    break;
                case '09_99':
                    // End of line(s) / end of group
                    break;
                // Add more cases as needed for other codes
                default:
                    continue; // Ignore other codes for now
            }
        }
    };
    // Static methods
    KOF_V2.convertKofLinesToArray = function (filePath) {
        // Read file content each line into an array
        var fileContent = fs.readFileSync(filePath, 'utf8');
        return fileContent.split(/\r?\n/);
    };
    KOF_V2.validateKofContent = function (fileContent) {
        // Pass for now
    };
    KOF_V2.getSosiCodesSet = function (fileContent) {
        var sosiCodes = new Set();
        // Two parsing strategies:
        // 1) Columns mode (when a header like '-05 PPPPPPPPPP KKKKKKKK ...' is present)
        //    -> extract the 8-char KKKKKKKK field from fixed columns on 05 rows
        // 2) Token mode (fallback) -> scan whitespace-separated tokens for an integer code
        var headerLine = fileContent.find(function (l) { return !!l && l.trim().startsWith('-05'); });
        // If there is a header and it contains the literal KKKKKKKK token, use its absolute column index.
        // Otherwise fall back to the standard KOF header column start for KKKKKKKK (index 15, 0-based)
        var headerCodeStart = null;
        if (headerLine) {
            var idx = headerLine.indexOf('KKKKKKKK');
            if (idx >= 0)
                headerCodeStart = idx;
        }
        if (headerCodeStart === null) {
            // standard header (as in the README): '-05 PPPPPPPPPP KKKKKKKK ...' -> 'KKKKKKKK' starts at column 15 (0-based)
            headerCodeStart = 15;
        }
        fileContent.forEach(function (line) {
            if (!line || !line.trim())
                return;
            var raw = line.replace(/\r?\n$/, '');
            var trimmed = raw.trim();
            if (!trimmed.startsWith('05'))
                return;
            if (headerCodeStart !== null) {
                // Use the absolute column from the header to extract the 8-char code field
                var codeField = (raw.length >= headerCodeStart)
                    ? raw.substr(headerCodeStart, 8).trim()
                    : raw.slice(-8).trim(); // fallback to last 8 chars if line too short
                if (/^\d{1,8}$/.test(codeField))
                    sosiCodes.add(codeField);
            }
            else {
                // Previous token-based fallback: find the first integer-like token after the '05' token
                var toks = trimmed.split(/\s+/);
                for (var i = 1; i < toks.length; i++) {
                    var t = toks[i];
                    if (/^\d{1,8}$/.test(t)) {
                        sosiCodes.add(t);
                        break;
                    }
                }
            }
        });
        return sosiCodes;
    };
    KOF_V2.displayClassVersion = function () {
        return "KOF_V2 Class Version: ".concat(KOF_V2._classVersion);
    };
    KOF_V2.validateKofExtension = function (filePath) {
        return filePath.toLowerCase().endsWith('.kof');
    };
    KOF_V2._readSingleFile = function (filePath, validateExtensionIsKof) {
        if (validateExtensionIsKof === void 0) { validateExtensionIsKof = true; }
        if (validateExtensionIsKof && !KOF_V2.validateKofExtension(filePath))
            throw new Error("Invalid file extension");
        return new KOF_V2(filePath, KOF_V2._ctorKey);
    };
    KOF_V2._readMultipleFiles = function (filePaths, validateExtensionIsKof) {
        if (validateExtensionIsKof === void 0) { validateExtensionIsKof = true; }
        var kofFiles = [];
        filePaths.forEach(function (fp) {
            if (validateExtensionIsKof && !KOF_V2.validateKofExtension(fp))
                throw new Error("Invalid file extension");
            kofFiles.push(new KOF_V2(fp, KOF_V2._ctorKey));
        });
        return kofFiles;
    };
    KOF_V2._readFolder = function (folderPath, recursive) {
        if (recursive === void 0) { recursive = false; }
        var kofFiles = [];
        var walk = function (dir) {
            var items = fs.readdirSync(dir, { withFileTypes: true });
            items.forEach(function (item) {
                if (item.isDirectory() && recursive) {
                    walk(path.join(dir, item.name));
                }
                else if (item.isFile() && item.name.endsWith('.kof')) {
                    kofFiles.push(new KOF_V2(path.join(dir, item.name), KOF_V2._ctorKey));
                }
            });
        };
        walk(folderPath);
        return kofFiles;
    };
    // The main read function checks the type of input and calls the appropriate static method
    KOF_V2.read = function (input, validateExtensionIsKof, recursive) {
        if (validateExtensionIsKof === void 0) { validateExtensionIsKof = true; }
        if (recursive === void 0) { recursive = false; }
        var isInputDirectory = false;
        try {
            var stats = fs.statSync(input);
            isInputDirectory = stats.isDirectory();
        }
        catch (error) {
            isInputDirectory = false;
        }
        // Determine the type of input (single file, multiple files or path) and call the appropriate method
        if (isInputDirectory)
            return KOF_V2._readFolder(input, recursive);
        if (Array.isArray(input))
            return KOF_V2._readMultipleFiles(input, validateExtensionIsKof);
        else
            return [KOF_V2._readSingleFile(input, validateExtensionIsKof)];
    };
    // Static properties
    KOF_V2._classVersion = "0.0.1";
    // Runtime-enforced constructor key — prevents JS callers from instantiating without using factories
    KOF_V2._ctorKey = Symbol('KOF_V2_ctor');
    return KOF_V2;
}());
{ // Only run this when we run the file directly with Node.js for testing
    if (require.main === module) {
        // Example usage:
        var kofPointsFilePath = './src/demo/kof_files/01-03_points_multiple_utm32_epsg25832.kof';
        var kofPolygonsFilePath = './src/demo/kof_files/03-02_polygon_single_utm32_epsg25832_with_header.kof';
        var kofPolygonsInstance = KOF_V2.read(kofPolygonsFilePath)[0];
        var kofMixedPath = './src/demo/kof_files/04_mixed_multiple_utm32_epsg25832.kof';
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
