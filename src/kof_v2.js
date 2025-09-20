"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KOF_V2 = void 0;
var fs = require("fs");
var path = require("path");
var epsgDefs = require("@data/epsg/epsg_list.json");
var KOF_V2 = /** @class */ (function () {
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
        this._kofType = null;
        this._sourceEpsg = null;
        this._targetEpsg = null;
        this._metadata = {
            fileName: path.basename(filePath),
            fileExtension: path.extname(filePath),
            fileSize: fs.statSync(filePath).size,
            sosiCodes: KOF_V2.getSosiCodesSet(this._fileContent),
            fileSizeUnit: "bytes",
            fileType: "KOF",
            numberOfLines: this._fileContent.length,
            numberOfPoints: 0,
            numberOfLineStrings: 0,
            numberOfLinePoints: 0,
            numberOfPolygons: 0,
            numberOfPolygonPoints: 0,
            numberOfSosiCodes: 0,
        };
    }
    // Class instance methods
    KOF_V2.prototype._isEpsgValid = function (epsg, isSource) {
        if (isSource === void 0) { isSource = true; }
        if (!epsg)
            return false;
        if (!/^EPSG:\d{3,5}$/i.test(epsg))
            return false;
        if (!epsgDefs[epsg.toUpperCase()])
            return false;
        return true;
    };
    KOF_V2.prototype.setSourceCrs = function (epsg) {
        if (!this._isEpsgValid(epsg))
            throw new Error("Invalid EPSG code");
        this._sourceEpsg = epsg ? epsg.toUpperCase() : null;
        this._sourceEpsgDescription = this._sourceEpsg && epsgDefs[this._sourceEpsg] ? epsgDefs[this._sourceEpsg] : null;
    };
    KOF_V2.prototype.setTargetCrs = function (epsg) {
        if (!this._isEpsgValid(epsg))
            throw new Error("Invalid EPSG code");
        this._targetEpsg = epsg ? epsg.toUpperCase() : null;
        this._targetEpsgDescription = this._targetEpsg && epsgDefs[this._targetEpsg] ? epsgDefs[this._targetEpsg] : null;
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
exports.KOF_V2 = KOF_V2;
{ // Only run this when we run the file directly with Node.js for testing
    if (require.main === module) {
        // Example usage:
        var kofPointsFilePath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files\\01-03_points_multiple_utm32_epsg25832.kof';
        var kofPolygonsFilePath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files\\03-02_polygon_single_utm32_epsg25832_with_header.kof';
        var kofPolygonsInstance = KOF_V2.read(kofPolygonsFilePath)[0];
        var kofMixedPath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files\\04_mixed_multiple_utm32_epsg25832.kof';
        // Log to terminal
        console.log(KOF_V2.displayClassVersion());
        console.log(kofPolygonsInstance.printFileVersion());
        // console.log(kofPolygonsInstance.printMetadata());
        // console.log(kofPolygonsInstance.printContent());
        // // Multiple files
        // const kofMultipleInstances = KOF_V2.read([kofPointsFilePath, kofPolygonsFilePath]);
        // kofMultipleInstances.forEach((instance, index) => {
        //     console.log(`\n--- File ${index + 1} ---`);
        //     console.log(instance.printFileVersion());
        //     console.log(instance.printMetadata());
        //     console.log(instance.printContent());
        // });
        // // Read folder
        // const kofFolderPath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files';
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
