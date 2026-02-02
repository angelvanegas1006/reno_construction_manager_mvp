/**
 * Stub for the Node.js 'canvas' package.
 * Used in client-side bundle so pdfjs-dist (via @react-pdf-viewer) does not pull in native canvas.
 * The browser uses its own canvas API; this stub is only to satisfy the module resolution.
 */
module.exports = {};
