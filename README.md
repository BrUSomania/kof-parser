# kof-parser

A JavaScript/TypeScript parser for Norwegian KOF files. Usable as an ES module or via script injection. Includes demo scripts and sample KOF files.

## Features
- Parse Norwegian KOF files
- Use as ES module or via `<script src=...>`
- TypeScript and JavaScript support
- Demo scripts and sample files included

Additional features added during development
- Export parsed geometries (Point / LineString / Polygon) to GeoJSON.
- Optionally produce reprojections to EPSG:4326 (lat/lon) for demo files that contain an EPSG hint (currently supports EPSG:25832 and a best-effort EPSG:5110 definition) using proj4.
- Geometry properties include `name` (PPPPPPPPPP) and `fcode` (KKKKKKKK). Lines/polygons inherit these from their first point when not explicitly set.
- Tests generate human-readable `.log` output per demo file (under `test/mocha/logs/`) and a `test/geojson/` folder containing produced GeoJSON files (both are gitignored by default).
- Parser emits structured warnings with line numbers and diagnostic strategies to aid debugging.

## Example KOF Files
Example KOF files for testing parsing functionality are located in:

  demo/kof_files

## KOF File Format (Column Description)
The positioning of the data content in a KOF file is given by the following header description string (which tells us in which column ranges the data is located):

  -05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ

Where:
- `05` is the row code **(required)**
- `PPPPPPPPPP` is the observation/point name **(optional)** (the parser will use an ID system per object and per observation, so the point name can be optional)
- `KKKKKKKK` is the code of the observation/point **(optional)** (defaults to empty string if blank)
- `XXXXXXXX.XXX` is northing or latitude **(required if the row contains an observation; not required for start/close codes like 91, 99, 96, etc.)**
- `YYYYYYY.YYY` is easting or longitude **(required if the row contains an observation; not required for start/close codes like 91, 99, 96, etc.)**
- `ZZZZ.ZZZ` is elevation **(optional; set to -500 if not found)**
- Other optional parameters after `ZZZZ.ZZZ` are allowed and will be parsed if present.


### Geometry Start/Stop in KOF Files
KOF files use special codes to indicate the start and end of geometries:

- **Points:** Each point is a single row with code `05`.
- **Lines:**
  - Start with a row code `91` (e.g. `09_91`), followed by one or more `05` rows for the line's vertices.
  - End with a row code `99` (e.g. `09_99`).
- **Polygons:**
  - Start with a row code `91` (e.g. `09_91`), followed by one or more `05` rows for the polygon's vertices.
  - Closed with a row code `96` (e.g. `09_96`).
  - Multiple polygons may be present in a file, each with their own start/close codes.

### Example KOF File Snippet
From an actual KOF file with header and data:

```plaintext
-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ
 05 LYKT-04    8751      6540290.081  314103.268    7.934
```

## Usage

### ES Module
```js
import { kof } from 'kof-parser';
const result = kof.parse(kofString);
```

### Script Injection
```html
<script src="dist/kof-parser.umd.js"></script>
<script>
  const result = kof.parse(kofString);
</script>
```

### Quick API examples

Node / CommonJS (parsing and GeoJSON export):

```js
const { KOF } = require('kof-parser');
const fs = require('fs');

const content = fs.readFileSync('demo/kof_files/example.kof', 'utf8');
const k = new KOF('example.kof', content, { sourceCrs: 'EPSG:25832' });
k.parse();
// Export GeoJSON (no reprojection)
const gj = k.toGeoJSON();
console.log(gj.type, gj.features.length);

// Reproject to EPSG:4326 (if proj4 available)
const gj4326 = k.reproject('EPSG:4326');
console.log('Reprojected:', gj4326.features.length);
```

ES module example:

```js
import { KOF } from 'kof-parser';
const content = await fetch('/demo/kof_files/example.kof').then(r => r.text());
const k = new KOF('example.kof', content, { sourceCrs: 'EPSG:25832' });
k.parse();
const geojson = k.toGeoJSON({ crs: { from: 'EPSG:25832', to: 'EPSG:4326' } });
console.log(geojson);
```

## Notes and development status

- The parser prefers fixed-column parsing when a header line (`-05 PPPPPPPPPP KKKKKKKK ...`) is present; for files without a header it falls back to heuristic token parsing.
- The project includes a comprehensive Mocha test-suite under `test/mocha/` that covers attributes, encodings, grouping, KOF codes and demo GeoJSON exports. Running `npm test` will clean old logs, run tests, and (for demo files) produce GeoJSON and reprojection outputs under `test/geojson/`.
- Reprojection: `proj4` is used during testing to convert demo files containing `epsg25832` or `epsg5110` in their filenames to EPSG:4326; the converted files are written with `epsg4326` in their filenames.
- EPSG:5110: the repo registers a reasonable NTM10-like proj4 definition as a best-effort. Replace this definition with an authoritative proj4 string if you have one.

## Build / CI note

To ensure clean, reproducible builds and to avoid TypeScript write-errors when a `dist/` folder is present in a working tree, the project now performs an explicit clean before building:

- Locally: run `npm run clean` (this removes the `dist/` directory) or `npm run build` which will run the clean step automatically.
- CI: the GitHub Actions workflow runs a `git clean -fdx` step before building so the runner has a fresh workspace and `tsc` can write output into `dist/` without conflicts.

This keeps local and CI builds consistent and prevents "TS5055: Cannot write file ... because it would overwrite input file" errors when `dist/` is present in the repo.

## License

This project is released under the MIT License; see the `LICENSE` file in the repository for full terms.

## Release v0.1.0

- Added explicit `LICENSE` (MIT).
- Cleaned package metadata (removed accidental core-module devDependencies).
- Tests and demo exports generate `.log` and `test/geojson/` artifacts (gitignored).

Publishing notes

- The package is configured to publish `dist/` and `types/` via the `files` field in `package.json`. Before publishing, run a fresh build (`npm run build`) and validate the bundle with `npm pack`.


## License
MIT
