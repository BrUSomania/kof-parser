
const { FileReader, KOF } = require('../dist/kof-parser.cjs.js');
const fs = require('fs');
const path = require('path');

// Test FileReader
const fileReader = new FileReader('test.txt', 'Some test content');
console.log('FileReader metadata:', fileReader.getMetadata());
console.log('FileReader content:', fileReader.getContent());

// Test KOF class with all demo KOF files
const demoDir = path.join(__dirname, '../demo/kof-files');
const kofFiles = fs.readdirSync(demoDir).filter(f => f.endsWith('.kof'));
kofFiles.forEach(file => {
	const content = fs.readFileSync(path.join(demoDir, file), 'utf8');
	const kof = new KOF(file, content);
	kof.parse();
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
});
