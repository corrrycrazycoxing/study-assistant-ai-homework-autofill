const assert=require('node:assert/strict'),fs=require('node:fs'),adapter=require('../scripts/sync-mcgraw-demo.cjs');
assert.equal(fs.readFileSync('docs/mcgraw-map-test-adapter.js','utf8'),adapter(fs.readFileSync('content-scripts/mcgraw-map.js','utf8')),'the browser fixture must run the current production adapter with only local routing changed');
console.log('PASS McGraw actual-adapter browser fixture parity');
