// import * as fs from 'fs';
// import * as path from 'path';
// import { KOF } from './kof';

// export function parseMultipleFiles(filePaths?: string[] | null, opts?: { sourceCrs?: string | null, targetCrs?: string | null }): KOF[] {
//   // If no filePaths provided, try to default to demo/kof_files in the project root
//   let paths = filePaths || null;
//   if (!paths || (Array.isArray(paths) && paths.length === 0)) {
//     const defaultDir = path.resolve('demo', 'kof_files');
//     if (fs.existsSync(defaultDir)) {
//       // collect kof files non-recursively by default
//       paths = fs.readdirSync(defaultDir).filter(f => f.toLowerCase().endsWith('.kof')).map(f => path.join(defaultDir, f));
//     } else {
//       throw new Error('parseMultipleFiles requires an array of file paths when demo/kof_files is not present');
//     }
//   }
//   const out: KOF[] = [];
//   for (const fp of paths) {
//     try {
//       const content = fs.readFileSync(fp, 'utf8');
//       const k = new KOF(path.basename(fp), content, { sourceCrs: opts && opts.sourceCrs ? opts.sourceCrs : undefined, targetCrs: opts && opts.targetCrs ? opts.targetCrs : undefined });
//       const epsgMatch = (fp + ' ' + path.basename(fp)).match(/epsg[:_\-]?(\d{3,5})/i);
//       if (epsgMatch) k.setSourceCrs('EPSG:' + epsgMatch[1]);
//       k.parse();
//       // Short per-file log for Node usage: filename, geometries count and warnings count
//       // Keep message concise so it can be used in pipelines and still be human friendly.
//       // tslint:disable-next-line:no-console
//       console.log(`${path.basename(fp)}: parsed ${k.toWkbGeometries().length} geometries, ${k.warnings.length} warnings`);
//       out.push(k);
//     } catch (e) {
//       // tslint:disable-next-line:no-console
//       console.warn('parseMultipleFiles skipping', fp, e && (e as any).message ? (e as any).message : e);
//     }
//   }
//   return out;
// }

// export function parseDirectory(dirPath: string, recursive = false, opts?: { sourceCrs?: string | null, targetCrs?: string | null }): KOF[] {
//   const abs = path.resolve(dirPath);
//   const files: string[] = [];
//   const walk = (d: string) => {
//     const items = fs.readdirSync(d, { withFileTypes: true });
//     for (const it of items) {
//       const p = path.join(d, it.name);
//       if (it.isDirectory()) {
//         if (recursive) walk(p);
//       } else if (it.isFile() && p.toLowerCase().endsWith('.kof')) files.push(p);
//     }
//   };
//   walk(abs);
//   return parseMultipleFiles(files, opts);
// }

// export function show(registry: KOF[], index?: number | number[]): any[] {
//   const result: any[] = [];
//   if ((index === undefined || index === null) && registry.length === 0) {
//     // tslint:disable-next-line:no-console
//     console.log('Registry is empty — parse files first');
//     return result;
//   }
//   const idxs = (index === undefined || index === null) ? registry.map((_, i) => i) : (Array.isArray(index) ? index : [index]);
//   for (const i of idxs) {
//     const k = registry[i];
//     if (!k) continue;
//     const meta = { fileName: k.fileName, metadata: k.getMetadata(), warnings: k.warnings.length, errors: k.errors.length };
//     // tslint:disable-next-line:no-console
//     console.log(`[${i}] ${k.fileName}`, meta);
//     result.push(meta);
//   }
//   return result;
// }

// /**
//  * Convenience: parse a single file and return the KOF instance (with parse() already run).
//  */
// export function parseSingleFile(filePath: string, opts?: { sourceCrs?: string | null, targetCrs?: string | null }): KOF {
//   const content = fs.readFileSync(filePath, 'utf8');
//   const k = new KOF(path.basename(filePath), content, { sourceCrs: opts && opts.sourceCrs ? opts.sourceCrs : undefined, targetCrs: opts && opts.targetCrs ? opts.targetCrs : undefined });
//   const epsgMatch = (filePath + ' ' + path.basename(filePath)).match(/epsg[:_\-]?(\d{3,5})/i);
//   if (epsgMatch) k.setSourceCrs('EPSG:' + epsgMatch[1]);
//   k.parse();
//   return k;
// }

// // Attach parseSingleFile as a static too
// try {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (KOF as any).parseSingleFile = parseSingleFile;
// } catch (e) {
//   // tslint:disable-next-line:no-console
//   console.warn('Could not attach parseSingleFile to KOF class:', e && (e as any).message ? (e as any).message : e);
// }
