const fs = require('fs');
const path = require('path');

function writeKofLog(kof, name) {
  try {
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const base = name || (kof && kof.fileName) || 'kof';
    const logPath = path.join(logDir, base.replace(/\.kof$/i, '') + '.log');
    const geoms = (kof && typeof kof.toWkbGeometries === 'function') ? kof.toWkbGeometries() : [];
    let logText = '';
    logText += `# Log for KOF: ${base}\n`;
    try { logText += `\n## Metadata\n` + JSON.stringify(kof.getMetadata ? kof.getMetadata() : kof.metadata, null, 2) + '\n'; } catch (e) { logText += '\n## Metadata: <error>\n'; }
    if (kof.errors && kof.errors.length) {
      logText += `\n## Errors\n`;
      logText += kof.errors.map(e => '- ' + e).join('\n') + '\n';
    }
    if (kof.warnings && kof.warnings.length) {
      logText += `\n## Warnings\n`;
      logText += kof.warnings.map(w => '- ' + (typeof w === 'string' ? w : (w.line ? `[line ${w.line}] ` : '') + (w.message || JSON.stringify(w)))).join('\n') + '\n';
    }
    if (kof.diagnostics && kof.diagnostics.length) {
      logText += `\n## Diagnostics\n` + JSON.stringify(kof.diagnostics.slice(0, 10), null, 2) + '\n';
    }
    try { logText += `\n## Parsed Data\n` + JSON.stringify((kof.parsedData || []).slice(0, 5), null, 2) + '\n'; } catch (e) { }
    try { logText += `\n## GeoJSON\n` + JSON.stringify(kof.toGeoJSON ? kof.toGeoJSON() : {}, null, 2) + '\n'; } catch (e) { }
    logText += `\n## Geometries\n`;
    if (Array.isArray(geoms)) {
      geoms.forEach((g, i) => {
        logText += `- Geometry ${i + 1}:\n`;
        if (g && g.constructor && g.constructor.name === 'WkbGeomLinestring') {
          logText += `  Linestring with ${g.points.length} points:\n`;
          g.points.forEach((pt) => { logText += `    (${pt.x}, ${pt.y}${pt.z !== undefined ? ', ' + pt.z : ''}) ${JSON.stringify(pt.meta)}\n`; });
        } else if (g && g.constructor && g.constructor.name === 'WkbGeomPolygon') {
          logText += `  Polygon with ${g.rings.length} rings:\n`;
          g.rings.forEach((ring, rIdx) => {
            logText += `    Ring ${rIdx + 1} with ${ring.points.length} points:\n`;
            ring.points.forEach((pt) => { logText += `      (${pt.x}, ${pt.y}${pt.z !== undefined ? ', ' + pt.z : ''}) ${JSON.stringify(pt.meta)}\n`; });
          });
        } else if (g && g.constructor && g.constructor.name === 'WkbGeomPoint') {
          logText += `  Point: (${g.x}, ${g.y}${g.z !== undefined ? ', ' + g.z : ''}) ${JSON.stringify(g.meta)}\n`;
        } else {
          logText += JSON.stringify(g, null, 2) + '\n';
        }
      });
    }
    logText += `\n## Original KOF Content\n`;
    try { logText += (kof.fileContent || '') + '\n'; } catch (e) { }
    fs.writeFileSync(logPath, logText, 'utf8');
  } catch (err) {
    // Swallow logging errors to not break tests
    // eslint-disable-next-line no-console
    console.error('Failed to write KOF log:', err && err.message);
  }
}

module.exports = { writeKofLog };
