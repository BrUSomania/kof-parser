export { FileReader } from './FileReader';
// Export the newer KOF_V2 as the public KOF symbol so consumers get the
// updated implementation. The old `src/kof.ts` implementation is legacy and
// several symbols are intentionally commented out; exporting KOF_V2 keeps
// the public API stable for existing tests and consumers.
export { KOF_V2 as KOF } from './kof_v2';
export { WkbGeomPoint, WkbGeomLinestring, WkbGeomPolygon } from './geometry';
// __setProj4 was previously exported from './kof' but that module's runtime
// implementation is currently disabled. Do not re-export it to avoid build
// errors. If you need to set proj4 for tests, use KOF_V2.setSourceCrs / setTargetCrs
export { KofPoint } from './KofPoint';
export { KofLine } from './KofLine';
export { KofPolygon } from './KofPolygon';
