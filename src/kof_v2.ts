import * as fs from 'fs';
import * as path from 'path';

// To run directly with Node.js for testing (from project root):
// tsc .\src\kof_v2.ts; node .\src\kof_v2.js;
// or
// npx tsc .\src\kof_v2.ts;
//
// Create a basic class KOF_V2 with a constructor that takes a version number and a method to display the version.
// Create one static property to hold the default version.
export class KOF_V2 {
    // Instance properties
    _filePath: string;
    _fileVersion: string;
    _header: string;
    _fileContent: string[];
    _kofType: "coordinates" | "measurements" | null = null;
    _sourceEpsg: string | null = null;
    _targetEpsg: string | null = null;
    _metadata: Record<string, any>;

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
        };
    }

    // Instance methods
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

    getSosiCodes(): Set<string> {
        return KOF_V2.getSosiCodesSet(this._fileContent);
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
        const kofPointsFilePath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files\\01-03_points_multiple_utm32_epsg25832.kof';
        const kofPolygonsFilePath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files\\03-02_polygon_single_utm32_epsg25832_with_header.kof';
        const kofPolygonsInstance = KOF_V2.read(kofPolygonsFilePath)[0];
        const kofMixedPath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files\\04_mixed_multiple_utm32_epsg25832.kof';
        // Log to terminal
        console.log(KOF_V2.displayClassVersion());
        console.log(kofPolygonsInstance.printFileVersion());
        console.log(kofPolygonsInstance.printMetadata());
        console.log(kofPolygonsInstance.printContent());

        // Multiple files
        const kofMultipleInstances = KOF_V2.read([kofPointsFilePath, kofPolygonsFilePath]);
        kofMultipleInstances.forEach((instance, index) => {
            console.log(`\n--- File ${index + 1} ---`);
            console.log(instance.printFileVersion());
            console.log(instance.printMetadata());
            console.log(instance.printContent());
        });

        // Read folder
        const kofFolderPath = 'C:\\VisualStudioCode\\JavaScript\\kof-parser\\demo\\kof_files';
        const kofFolderInstances = KOF_V2.read(kofFolderPath, false);
        kofFolderInstances.forEach((instance, index) => {
            console.log(`\n--- Folder File ${index + 1} ---`);
            console.log(instance.printFileVersion());
            console.log(instance.printMetadata());
            console.log(instance.printContent());
        });

        // Try creating KOF instance as "new KOF_V2()" - should fail
        try {
            // @ts-ignore
            const invalidInstance = new KOF_V2(kofPointsFilePath);
        } catch (error) {
            console.error("Error creating KOF_V2 instance directly:", (error as Error).message);
        }
    }
}
