const fs = require('fs');
const path = require('path');

function removeDirRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      removeDirRecursive(full);
    } else {
      try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
    }
  }
  try { fs.rmdirSync(dir); } catch (e) { /* ignore */ }
}

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
try {
  if (fs.existsSync(dist)) {
    console.log('Removing existing dist/ directory to ensure a clean build...');
    removeDirRecursive(dist);
  }
} catch (e) {
  console.warn('Could not remove dist/ directory:', e && e.message);
}

process.exit(0);
