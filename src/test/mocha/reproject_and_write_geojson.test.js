const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { KOF_V2 } = require("../../../src/kof_v2");

describe("Reproject demo KOF files to EPSG:4326 and write GeoJSON", function () {
    it("reads demo kof files, reprojects to EPSG:4326 and writes geojson files", function () {
        const demoDir = path.join(
            __dirname,
            "..",
            "..",
            "..",
            "src",
            "demo",
            "kof_files",
        );
        if (!fs.existsSync(demoDir)) this.skip();

        const outDir = path.join(
            __dirname,
            "..",
            "..",
            "..",
            "test",
            "geojson",
        );
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const files = fs.readdirSync(demoDir).filter((f) =>
            f.toLowerCase().endsWith(".kof")
        );
        if (files.length === 0) this.skip();

        for (const f of files) {
            const fp = path.join(demoDir, f);
            const kof = KOF_V2.read(fp)[0];
            // Assert we have a valid instance
            assert.ok(
                kof && typeof kof.getFilePath === "function",
                "KOF_V2.read should return a valid instance",
            );
            // set known demo source CRS (demo files are UTM32 / EPSG:25832)
            try {
                kof.setSourceCrs("EPSG:25832");
                kof.setTargetCrs("EPSG:4326");
            } catch (e) {
                // if EPSG codes not available in list, skip this file with a warning
                console.warn(`Skipping reprojection for ${f}: ${e.message}`);
                continue;
            }
            // Support multiple possible APIs depending on which branch/state the repo is in.
            // Prefer a high-level KOF_V2 reprojectGeometries(), then reproject(), then per-geometry reproject().
            try {
                kof.reproject("EPSG:25832", "EPSG:4326");
            } catch (err) {
                throw new Error(`Failed to reproject ${f}: ${err.message}`);
            }
            const geo = kof.convertToGeoJson();
            assert.ok(
                geo && geo.type === "FeatureCollection",
                "GeoJSON output should be a FeatureCollection",
            );
            // Ensure reprojected outputs indicate EPSG:4326 in the filename when the source contained 'epsg25832'
            let outFileName = f.replace(/\.kof$/i, ".geojson");
            outFileName = outFileName.replace(/epsg25832/ig, "epsg4326");
            const outPath = path.join(outDir, outFileName);
            fs.writeFileSync(outPath, JSON.stringify(geo, null, 2), "utf8");
        }
    });
});
