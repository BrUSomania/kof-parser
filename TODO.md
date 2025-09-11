# TODO — KOF parser

This file lists missing features, KOF codes and prioritized tasks to improve the KOF parser implementation.

Priority: High
- Implement strict header-driven parsing mode (partially done)
  - The parser already detects the `-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ` header and prefers fixed-column parsing for that file.
  - Next: make a strict mode that rejects rows which don't match the exact column widths (emitting raw-line diagnostics) and expose a per-file `mode` flag that can be forced by callers.

- Full support for common KOF row codes (beyond current subset):
  - 05: Observation/point — Already parsed, but improve handling of optional name/code, variable spacing, and elevation defaults.
  - 09: Group control — implemented for `91` (start), `99` (end linestring) and `96` (end polygon). Add support for intermediate 09 subcodes if present in dataset (e.g., group attributes or multipart ids).

Priority: Medium
- KOF codes to add / improve support for:
  - 01 / 02 / common header/meta rows — detect and parse file-level metadata if present (coordinate system, units, date).
  - 11 / 12 / 20 etc. — annotation or property rows that attach attributes to following geometry rows. Implement a mechanism to collect and attach attributes to the next geometry.
  - 01 / 02 / common header/meta rows — basic `10` header parsing is implemented; expand to other metadata codes and normalize known keys (e.g., declared CRS -> parse EPSG id).
  - 11 / 12 / 20 etc. — attribute rows are supported and attach to next geometry. Continue expanding key parsing and tests.
  - 92 / 93 / 94 — potential variant group markers or segment markers seen in some KOF dialects; treat unknown 09 variants defensively but allow extension points.

Priority: Low
- Extras & robustness (some items implemented):
  - Unit tests for `parseKOFRow` exist indirectly via the parser tests; consider adding more focused unit tests for boundary cases.
  - Diagnostics: parser already emits strategy diagnostics and structured warnings; next improvement is to include raw-line tokens and the numeric token indices in warnings.
  - `mode` parameter: parser supports `columns`/`tokens`/`auto` internally and `KOF.metadata.parserMode` contains the detected mode; add an explicit public API flag to force a mode for a file.
  - GeoJSON export is implemented and includes `name` and `fcode` in feature properties.
  - Coordinate validation: tests include a reprojection check for `epsg25832` demo files; consider reading declared CRS from file metadata (if present) and using it automatically for reprojection.

Notes / rationale
- The attached KOF spec shows many optional codes and file-level control rows; we should support a pragmatic subset first (05, 09 family, file header) and then add attribute/annotation rows.
- Header-driven strict parsing will eliminate many current mis-parses where name/code tokens look numeric. For files without headers, keep the current heuristic fallbacks.

Completed / implemented since TODO was first written
- Columns-first parsing with token-based fallbacks and a `finalize()` swap heuristic to fix inverted easting/northing. (done)
- Group parsing for lines/polygons via 09-start/99-end/96-end markers. (done)
- Attribute/annotation parsing for 11/12/30/20/10 codes with structured warnings and metadata. (done)
- GeoJSON export with properties and an optional proj4-based reprojection step used in tests. (done)
- Test harness that writes `.log` files, cleans logs before tests, and exports demo GeoJSON (ignored by git). (done)

Release prep

- Added `LICENSE` file (MIT).
- Removed accidental `fs` and `path` entries from `devDependencies` in `package.json`.


Recommended next actions
- Implement strict header-mode enforcement and better raw-line diagnostics (high priority).
- Add an authoritative proj4 definition for EPSG:5110 (or read it from a resource) to improve NTM10 reprojection accuracy.
- Add a small CLI or opts to `KOF` to request reprojection to a target CRS (e.g., EPSG:4326) during export.
- Improve warnings to include token indices and raw token lists for easier triage.

Suggested immediate next action
- Implement header-detection and strict columns parsing for headered files; add unit tests for `parseKOFRow` and add a small parser-mode flag in `KOF`.
