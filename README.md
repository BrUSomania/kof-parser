## Copilot Instructions: KOF File Structure Basics
When working with KOF files, follow these rules:

- Points are represented by a single row with code `05`.
- Lines start with a row code `91` (e.g. `09_91`), followed by one or more `05` rows for vertices, and end with a row code `99` (e.g. `09_99`).
- Polygons start with a row code `91` (e.g. `09_91`), followed by one or more `05` rows for vertices, and are closed with a row code `96` (e.g. `09_96`).
- The column layout is described by a header string like `-05 PPPPPPPPPP KKKKKKKK XXXXXXXX.XXX YYYYYYY.YYY ZZZZ.ZZZ`.
- The parser should allow for optional point names, codes, and elevation, and accept additional columns after elevation.
- Northing/latitude and easting/longitude are required for observations, but not for start/close codes.
- Elevation is optional and should default to -500 if not present.
# kof-parser

A JavaScript/TypeScript parser for Norwegian KOF files. Usable as an ES module or via script injection. Includes demo scripts and sample KOF files.

## Features
- Parse Norwegian KOF files
- Use as ES module or via `<script src=...>`
- TypeScript and JavaScript support
- Demo scripts and sample files included

## Example KOF Files
Example KOF files for testing parsing functionality are located in:

  demo/kof-files

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

## License
MIT
