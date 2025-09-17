KOF Guide
=========

This guide explains how to use the `KOF` class and the Node-only helper functions shipped in `dist/kof-parser.node.cjs.js` to read KOF files, parse them into geometries, export GeoJSON, and work with multiple files in bulk.

## Quick start (Node)

Install and require the Node bundle:

```js
// Require the node-only bundle (built artifact)
const pkg = require('./dist/kof-parser.node.cjs.js');
const KOF = pkg.KOF;
```

Parse a single file:

```js
const kof = KOF.parseMultipleFiles(['path/to/file.kof'])[0];
console.log(kof.fileName);
console.log('Warnings:', kof.warnings.length);
const geojson = kof.toGeoJSON();
```

Parse all demo KOF files (shorthand):

```js
// If called with no args, parseMultipleFiles will look for demo/kof_files in the project root
const registry = KOF.parseMultipleFiles();
console.log('Parsed', registry.length, 'files');
```

Parse a directory recursively:

```js
// recursive=true will walk subdirectories
const registry = KOF.parseDirectory('demo/kof_files', true);
```

Show a short registry summary:

```js
// prints to stdout and returns metadata array
KOF.show(registry);
```

## API reference

### Class: KOF

Constructors and creation
- `new KOF(fileName: string, fileContent: string, opts?: { sourceCrs?: string, targetCrs?: string })`
  - Create a KOF instance from file content. Typically you won't need to instantiate directly when using the Node helpers which call `parse()` for you.

Instance properties
- `fileName: string` — the base filename used when constructing the instance.
- `fileContent: string` — raw file content.
- `parsedData: any[] | null` — array of parsed lines (simple rows metadata), set by calling `parse()`.
- `warnings: WarningObj[]` — warnings collected during parsing.
- `errors: string[]` — any errors collected.
- `metadata: Record<string, any>` — file-level metadata parsed from header rows (codes 10/12) and other info like detected parser mode.
- `sourceCrs: string | null` — optional CRS string (like `EPSG:25832`) detected or set.
- `targetCrs: string | null` — optional target CRS.

Instance methods
- `parse()`
  - Parses the `fileContent`, populates `parsedData`, `warnings`, `diagnostics`, and `metadata`. Returns `parsedData`.

- `toWkbGeometries()`
  - Returns the internal WKB geometry objects (instances of `WkbGeomPoint`, `WkbGeomLinestring`, `WkbGeomPolygon`). Useful for internal manipulations or writing custom outputs.

- `toGeoJSON(opts?: { sourceCrs?: string|null, targetCrs?: string|null, crs?: { from?: string|null, to?: string|null } })`
  - Returns a GeoJSON FeatureCollection of parsed geometries. If `opts.crs` (from/to) is provided, and if `proj4` is available, coordinates will be reprojected.

- `reproject(targetCrs: string)`
  - Convenience wrapper that reprojects the stored geometries from the instance's source CRS to `targetCrs` using `proj4` (if available). Stores reprojection error in `metadata.reprojectionError` on failure.

- `getMetadata()`
  - Returns the `metadata` object collected during parsing.

### Node helper functions (static methods attached to KOF in Node)

These are exported by `dist/kof-parser.node.cjs.js` and also attached as static methods on the `KOF` class when the Node helpers module is loaded.

- `KOF.parseMultipleFiles(filePaths?: string[] | null, opts?: { sourceCrs?: string | null, targetCrs?: string | null }) => KOF[]`
  - Parse multiple files provided as an array of absolute or relative paths.
  - If called with no arguments (or an empty array), the function will attempt to parse `demo/kof_files` in the project root (non-recursively). If `demo/kof_files` is missing, it throws an Error.
  - Returns an array of `KOF` instances. Each instance already had `.parse()` called and has `parsedData`, `warnings` etc. populated.

- `KOF.parseDirectory(dirPath: string, recursive = false, opts?: { sourceCrs?: string | null, targetCrs?: string | null }) => KOF[]`
  - Walks `dirPath` (optionally recursively) to collect `.kof` files and delegates to `parseMultipleFiles`.

- `KOF.show(registry: KOF[], index?: number | number[]) => any[]`
  - Prints a concise summary to stdout for the given registry entries and returns an array of metadata objects.

## Examples

Write GeoJSON for parsed files to disk (EPSG:4326):

```js
const fs = require('fs');
const KOF = require('./dist/kof-parser.node.cjs.js').KOF;
const registry = KOF.parseDirectory('demo/kof_files', false);
for (const kof of registry) {
  const gj = kof.toGeoJSON({ crs: { from: kof.sourceCrs || kof.metadata.sourceCrs, to: 'EPSG:4326' } });
  fs.writeFileSync(`out/${kof.fileName}.geojson`, JSON.stringify(gj, null, 2), 'utf8');
}
```

Inspect a single file programmatically

```js
const kof = KOF.parseMultipleFiles(['demo/kof_files/09_72_epsg25832.kof'])[0];
console.log(kof.getMetadata());
console.log('Geometries count:', kof.toWkbGeometries().length);
```

Read a single file using the KOF constructor (no multi-file helpers)

```js
const fs = require('fs');
const KOF = require('./dist/kof-parser.node.cjs.js').KOF;
const content = fs.readFileSync('demo/kof_files/09_72_epsg25832.kof', 'utf8');
const single = new KOF('09_72_epsg25832.kof', content);
single.parse();
console.log(single.getMetadata());
console.log('Warnings:', single.warnings.length);
const gj = single.toGeoJSON();
```

## Notes, edge cases and troubleshooting

- The Node helpers are intentionally separated from the core to keep browser builds free of Node `fs`/`path` dependencies.
- `KOF.parseMultipleFiles()` and `KOF.parseDirectory()` are Node-only conveniences and are not present in the browser bundle.
- Reprojection requires `proj4`. If `proj4` is not available at runtime, `toGeoJSON` and `reproject` will return the original coordinates and set `metadata.reprojectionError`.
- When parsing malformed rows, the parser attempts to continue and adds warnings rather than throwing. Inspect `kof.warnings` to see issues.

## Contributing

If you change how helpers are exported (for example moving them back to the core), update the README and the tests that rely on `dist/kof-parser.node.cjs.js`.

---

This guide was generated to complement the code in `src/` and the Node-only bundle in `dist/`. If you'd like an expanded guide with copy-paste scripts for common workflows (CI, batch conversions), I can add them.
