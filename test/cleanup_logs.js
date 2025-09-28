const fs = require('fs');
const path = require('path');

// Safe cleanup used by npm test in CI. Remove known test output folders if they exist.
try {
  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, 'src', 'test_output'),
    path.join(root, 'src', 'test', 'mocha', 'logs'),
    path.join(root, 'src', 'test', 'mocha', 'logs', 'kof.log'),
    path.join(root, 'src', 'test', 'mocha', 'logs', 'kof.json'),
    path.join(root, 'src', 'test', 'mocha', 'logs'),
    path.join(root, 'test', 'mocha', 'logs')
  ];

  candidates.forEach(p => {
    try {
      if (!fs.existsSync(p)) return;
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        // remove directory contents but keep directory
        fs.readdirSync(p).forEach(f => {
          const fp = path.join(p, f);
          try { fs.unlinkSync(fp); } catch (e) { /* ignore */ }
        });
      } else if (stat.isFile()) {
        try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore per-file errors
    }
  });
  // Also ensure the top-level test folder exists so downstream scripts that write logs won't fail
  const logDir = path.join(root, 'test', 'mocha', 'logs');
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) { /* ignore */ }
  }
} catch (e) {
  // final fallback - ensure script doesn't crash CI
}

// Exit normally
process.exit(0);
