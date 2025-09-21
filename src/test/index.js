
const { FileReader, KOF } = require('../dist/kof-parser.cjs.js');
const fs = require('fs');
const path = require('path');

// Test FileReader
const fileReader = new FileReader('test.txt', 'Some test content');
console.log('FileReader metadata:', fileReader.getMetadata());
console.log('FileReader content:', fileReader.getContent());

// Test KOF class with all demo KOF files
const demoDir = path.join(__dirname, '../demo/kof_files');
const kofFiles = fs.readdirSync(demoDir).filter(f => f.endsWith('.kof'));
kofFiles.forEach(file => {
	const content = fs.readFileSync(path.join(demoDir, file), 'utf8');
	const kof = new KOF(file, content);
	kof.parse();
	// Create geometries
	const geometries = kof.toWkbGeometries();
	// Console output (summary)
	console.log(`\nKOF file: ${file}`);
	console.log('  Metadata:', kof.getMetadata());
	if (kof.errors.length) {
		console.log('  Errors:', kof.errors);
	}
	if (kof.warnings.length) {
		console.log('  Warnings:', kof.warnings);
	}
	if (kof.diagnostics && kof.diagnostics.length) {
		console.log('  Diagnostics (parse strategies):', kof.diagnostics.slice(0,5));
	}
	console.log('  Parsed sample:', kof.parsedData ? kof.parsedData.slice(0, 2) : null);
	console.log('  GeoJSON:', kof.toGeoJSON());
	// Print geometry details
	if (Array.isArray(geometries)) {
		console.log('  Geometries:');
		geometries.forEach((g, i) => {
			if (g && g.constructor && g.constructor.name === 'WkbGeomLinestring') {
				console.log(`    [${i + 1}] Linestring with ${g.points.length} points:`);
				g.points.forEach((pt, j) => {
					console.log(`      (${pt.x}, ${pt.y}${pt.z !== undefined ? ', ' + pt.z : ''})`, pt.meta);
				});
			} else if (g && g.constructor && g.constructor.name === 'WkbGeomPolygon') {
				console.log(`    [${i + 1}] Polygon with ${g.rings.length} rings:`);
				g.rings.forEach((ring, rIdx) => {
					console.log(`      Ring ${rIdx + 1} with ${ring.points.length} points:`);
					ring.points.forEach((pt, j) => {
						console.log(`        (${pt.x}, ${pt.y}${pt.z !== undefined ? ', ' + pt.z : ''})`, pt.meta);
					});
				});
			} else if (g && g.constructor && g.constructor.name === 'WkbGeomPoint') {
				console.log(`    [${i + 1}] Point: (${g.x}, ${g.y}${g.z !== undefined ? ', ' + g.z : ''})`, g.meta);
			} else {
				console.log(`    [${i + 1}]`, g);
			}
		});
	} else {
		console.log('  Geometries:', geometries);
	}

	// Write full log file per test
	const logDir = path.join(__dirname, 'logs');
	if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
	const logPath = path.join(logDir, file.replace(/\.kof$/, '.log'));
	let logText = '';
	logText += `# Log for KOF file: ${file}\n`;
	logText += `\n## Metadata\n`;
	logText += JSON.stringify(kof.getMetadata(), null, 2) + '\n';
	if (kof.errors.length) {
		logText += `\n## Errors\n`;
		logText += kof.errors.map(e => '- ' + e).join('\n') + '\n';
	}
	if (kof.warnings.length) {
		logText += `\n## Warnings\n`;
		logText += kof.warnings.map(w => '- ' + w).join('\n') + '\n';
	}
	logText += `\n## Parsed Data\n`;
	logText += JSON.stringify((kof.parsedData || []).slice(0, 5), null, 2) + '\n';
	logText += `\n## GeoJSON (summary)\n`;
	logText += JSON.stringify(kof.toGeoJSON(), null, 2) + '\n';
	logText += `\n## Geometries\n`;
	if (Array.isArray(geometries)) {
		geometries.forEach((g, i) => {
			logText += `- Geometry ${i + 1}:\n`;
			if (g && g.constructor && g.constructor.name === 'WkbGeomLinestring') {
				logText += `  Linestring with ${g.points.length} points:\n`;
				g.points.forEach((pt, j) => {
					logText += `    (${pt.x}, ${pt.y}${pt.z !== undefined ? ', ' + pt.z : ''}) ${JSON.stringify(pt.meta)}\n`;
				});
			} else if (g && g.constructor && g.constructor.name === 'WkbGeomPolygon') {
				logText += `  Polygon with ${g.rings.length} rings:\n`;
				g.rings.forEach((ring, rIdx) => {
					logText += `    Ring ${rIdx + 1} with ${ring.points.length} points:\n`;
					ring.points.forEach((pt, j) => {
						logText += `      (${pt.x}, ${pt.y}${pt.z !== undefined ? ', ' + pt.z : ''}) ${JSON.stringify(pt.meta)}\n`;
					});
				});
			} else if (g && g.constructor && g.constructor.name === 'WkbGeomPoint') {
				logText += `  Point: (${g.x}, ${g.y}${g.z !== undefined ? ', ' + g.z : ''}) ${JSON.stringify(g.meta)}\n`;
			} else {
				logText += JSON.stringify(g, null, 2) + '\n';
			}
		});
	} else {
		logText += JSON.stringify(geometries, null, 2) + '\n';
	}
	logText += `\n## Original KOF Content\n`;
	logText += content + '\n';
	fs.writeFileSync(logPath, logText, 'utf8');
});
