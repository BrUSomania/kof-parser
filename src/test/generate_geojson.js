#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
// Use Node fs to walk directories (avoid external glob dependency)
const parserDist = require('../dist/kof-parser.cjs.js');
const { KOF, __setProj4 } = parserDist;
// If proj4 is available, register it into the parser and add common defs
let proj4;
try {
  proj4 = require('proj4');
  // Add common defs if missing. EPSG:25832 (ETRS89 / UTM zone 32N)
  if (!proj4.defs || !proj4.defs['EPSG:25832']) {
    try {
      proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
    } catch (e) {
      // some proj4 builds expose defs via proj4.defs(name) API
      try { proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs'); } catch (e2) { /* ignore */ }
    }
  }
  // Inject into parser so parser.toGeoJSON uses the same proj4
  if (typeof __setProj4 === 'function') __setProj4(proj4);
} catch (e) {
  proj4 = null;
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const inRoot = path.join(__dirname, '..', 'demo', 'kof_files');
const outRoot = path.join(__dirname, 'geojson');
ensureDirSync(outRoot);

function walkDir(root, ext) {
  const out = [];
  function walk(d) {
    const items = fs.readdirSync(d, { withFileTypes: true });
    for (const it of items) {
      const p = path.join(d, it.name);
      if (it.isDirectory()) walk(p);
      else if (it.isFile() && p.toLowerCase().endsWith(ext)) out.push(p);
    }
  }
  walk(root);
  return out;
}

const files = walkDir(inRoot, '.kof');
if (files.length === 0) {
  console.error('No .kof files found under demo/kof_files');
  process.exit(1);
}

files.forEach(f => {
  const rel = path.relative(inRoot, f);
  const outPath = path.join(outRoot, rel.replace(/\.kof$/i, '.geojson'));
  const outDir = path.dirname(outPath);
  ensureDirSync(outDir);
  try {
    const content = fs.readFileSync(f, 'utf8');
    const k = new KOF(path.basename(f), content);
    k.parse();
    // detect source crs from filename like 'epsg25832' or 'epsg5110'
    const fn = path.basename(f).toLowerCase();
    const folder = path.dirname(path.relative(inRoot, f)).toLowerCase();
    const epsgMatch = (fn + ' ' + folder).match(/epsg[:_\-]?(\d{3,5})/i);
    let gj;
    if (epsgMatch) {
      const src = 'EPSG:' + epsgMatch[1];
      try {
        gj = k.toGeoJSON({ crs: { from: src, to: 'EPSG:4326' } });
      } catch (e) {
        console.warn('Reprojection failed for', f, 'from', src, '-', e && e.message ? e.message : e);
        gj = k.toGeoJSON();
      }
    } else {
      // no source crs found — emit as-is
      gj = k.toGeoJSON();
    }
    fs.writeFileSync(outPath, JSON.stringify(gj, null, 2), 'utf8');
    console.log('Wrote', outPath, 'features=', gj.features.length, 'warnings=', k.warnings.length);
  } catch (e) {
    console.error('Failed to process', f, e && e.stack ? e.stack : e);
  }
});

console.log('Done.');
