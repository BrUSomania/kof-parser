// Mocha root hook: run before any tests. Register handlers to fail fast on unhandled
// promise rejections and uncaught exceptions so CI doesn't end with an opaque exit code.
process.on('unhandledRejection', (reason, p) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection at:', p, 'reason:', reason && reason.stack ? reason.stack : reason);
  try {
    // Give a tiny grace period for logging
    setTimeout(() => process.exit(1), 50);
  } catch (e) {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  try {
    setTimeout(() => process.exit(1), 50);
  } catch (e) {
    process.exit(1);
  }
});

// Also surface Node warnings during CI
process.on('warning', (w) => {
  // eslint-disable-next-line no-console
  console.warn('Node warning:', w && w.stack ? w.stack : w);
});

// Optionally, force Mocha to exit at the end of the run if there are open handles.
// This is already enabled via the --exit flag in the test script, but keeping this
// hook helps make failures explicit in CI logs.

module.exports = {};
