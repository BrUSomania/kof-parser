const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KOF } = require('../../dist/kof-parser.cjs.js');
const { writeKofLog } = require('./log_helper');

describe('log file generation', function() {
  it('creates a .log file when writeKofLog is called', function() {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const fname = 'unittest.kof';
    const logPath = path.join(logsDir, fname.replace(/\.kof$/i, '') + '.log');
    // ensure no stale file
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);

    const content = '11 tester=logtest\n05 T1 7601 6540000.000 100.000 1.0';
    const k = new KOF(fname, content);
    k.parse();
    writeKofLog(k, fname);

    assert(fs.existsSync(logPath), 'Expected log file to be created: ' + logPath);
    const txt = fs.readFileSync(logPath, 'utf8');
    assert(txt.indexOf('# Log for KOF') !== -1, 'Log file should contain header');
    // cleanup (leave cleanup_logs to remove directory before next run)
    try { fs.unlinkSync(logPath); } catch (e) { /* ignore */ }
  });
});
