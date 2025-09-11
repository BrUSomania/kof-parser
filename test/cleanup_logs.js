const fs = require('fs');
const path = require('path');

// Remove old .log files under test/mocha/logs
function cleanup() {
  try {
    const candidates = [path.join(__dirname, 'mocha', 'logs'), path.join(__dirname, 'logs')];
    for (const logsDir of candidates) {
      if (!fs.existsSync(logsDir)) continue;
      const entries = fs.readdirSync(logsDir);
      for (const e of entries) {
        const p = path.join(logsDir, e);
        try { fs.rmSync(p, { recursive: true, force: true }); } catch (err) { try { fs.unlinkSync(p); } catch (e2) { /* ignore */ } }
      }
    }
    // leave directories empty
  } catch (err) {
    // don't fail tests because of cleanup issues
    // eslint-disable-next-line no-console
    console.error('cleanup_logs failed:', err && err.message);
  }
}

cleanup();

module.exports = { cleanup };
