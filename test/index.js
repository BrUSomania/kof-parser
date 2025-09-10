
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
	console.log('  Parsed sample:', kof.parsedData ? kof.parsedData.slice(0, 2) : null);
	console.log('  GeoJSON:', kof.toGeoJSON());
	console.log('  Geometries:', Array.isArray(geometries) ? geometries.slice(0, 2) : geometries);

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
	logText += `\n## Parsed Data (first 5 rows)\n`;
	logText += JSON.stringify((kof.parsedData || []).slice(0, 5), null, 2) + '\n';
	logText += `\n## GeoJSON (summary)\n`;
	logText += JSON.stringify(kof.toGeoJSON(), null, 2) + '\n';
	logText += `\n## Geometries (first 5)\n`;
	if (Array.isArray(geometries)) {
		geometries.slice(0, 5).forEach((g, i) => {
			logText += `- Geometry ${i + 1}:\n`;
			logText += JSON.stringify(g, null, 2) + '\n';
		});
	} else {
		logText += JSON.stringify(geometries, null, 2) + '\n';
	}
	logText += `\n## Original KOF Content\n`;
	logText += content + '\n';
	fs.writeFileSync(logPath, logText, 'utf8');
});
