# TODO — KOF parser

This file lists missing features, KOF codes and prioritized tasks to improve the KOF parser implementation.

Priority: High
- Implement strict header-driven parsing mode
  - Detect the `-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ` header and force fixed-column parsing for that file.
  - When header is present, reject rows that don't match column widths and emit clear warnings including the raw line.

- Full support for common KOF row codes (beyond current subset):
  - 05: Observation/point — Already parsed, but improve handling of optional name/code, variable spacing, and elevation defaults.
  - 09: Group control — implemented for `91` (start), `99` (end linestring) and `96` (end polygon). Add support for intermediate 09 subcodes if present in dataset (e.g., group attributes or multipart ids).

Priority: Medium
- KOF codes to add / improve support for:
  - 01 / 02 / common header/meta rows — detect and parse file-level metadata if present (coordinate system, units, date).
  - 11 / 12 / 20 etc. — annotation or property rows that attach attributes to following geometry rows. Implement a mechanism to collect and attach attributes to the next geometry.
  - 92 / 93 / 94 — potential variant group markers or segment markers seen in some KOF dialects; treat unknown 09 variants defensively but allow extension points.

Priority: Low
- Extras & robustness:
  - Add unit tests for `parseKOFRow` covering canonical and malformed cases.
  - Improve diagnostics: include raw line, token list and chosen numeric tokens when emitting a warning.
  - Add an explicit `mode` parameter to the parser API (`columns` | `tokens` | `auto`) and expose it in the `KOF` wrapper metadata.
  - Add GeoJSON export implementation for geometries with properties (name, code, any parsed attributes).
  - Consider coordinate validation against declared CRS (if header declares EPSG) and report inconsistent coordinate ranges.

Notes / rationale
- The attached KOF spec shows many optional codes and file-level control rows; we should support a pragmatic subset first (05, 09 family, file header) and then add attribute/annotation rows.
- Header-driven strict parsing will eliminate many current mis-parses where name/code tokens look numeric. For files without headers, keep the current heuristic fallbacks.

Suggested immediate next action
- Implement header-detection and strict columns parsing for headered files; add unit tests for `parseKOFRow` and add a small parser-mode flag in `KOF`.
