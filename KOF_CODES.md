# KOF codes coverage

This file summarizes which KOF two-digit row codes (00..99) are implemented by the parser and which are not.

See also `test/mocha/logs/kof_code_status.json` and `test/mocha/logs/kof_code_status.csv` for a programmatic export of the same matrix.

Implemented / Partial codes

- 05: Point/observation rows (implemented).
- 09: Group/control wrapper rows (implemented). Recognizes embedded tokens such as `91` (start), `99` (end), and `96` (polygon close). Also recognizes multi-line ranges `72..79` (saw) and `82..89` (wave) when they appear inside a `09` row.
- 10, 11, 12: Metadata / attribute rows (implemented).
- 20: Measurement/attrs (implemented with warning).
- 30: Pending attributes (implemented).

Partial handling

- 72..79 and 82..89: multi-line modes are implemented only when these codes are used inside a `09` (e.g. `09 72`). If your files use standalone `72` (line prefix `72`), the current parser treats them as unknown unless they appear embedded in a `09` row. The codebase already delegates standalone `91/96/99` lines to the same handler as `09` lines; consider doing the same for `72..79` and `82..89` if required.

Not implemented

- The following codes are not specifically implemented and are reported as unknown by the parser (a warning is emitted):
  - 00-04, 06-08, 13-19, 21-29, 31-69, 70-71, 80-81, 90, 92-95, 97-98

Recommendations

- Add small dedicated handlers for codes you need to support. Prefer tiny functions that reuse `handle09` behaviour for group-like codes.
- Add unit tests covering both styles (embedded in `09` and standalone) to avoid regressions.

Files:
- `src/kof.ts` — main parser (see large comment above the main dispatch switch).
- `test/mocha/logs/kof_code_status.json` — generated per-code matrix (00..99) with status and notes.
- `test/mocha/logs/kof_code_status.csv` — CSV equivalent.

If you want, I can implement handlers for additional standalone codes now (for example make `72..79` and `82..89` standalone-dispatchable).