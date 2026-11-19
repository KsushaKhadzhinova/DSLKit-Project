// Unpacks the compressed <diagram> of a .drawio file to plain XML (the documented format: base64, raw deflate, URL-encoded XML).
// Usage: node testing-course/import-samples/unpack-drawio.mjs <in> [out]; without <out> a short list of the cells is printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const text = readFileSync(process.argv[2], 'utf8');
const packed = /<diagram[^>]*>([^<]+)<\/diagram>/.exec(text)?.[1];
if (!packed) throw new Error('no compressed diagram');
const xml = decodeURIComponent(inflateRawSync(Buffer.from(packed.trim(), 'base64')).toString('utf8'));
if (process.argv[3]) writeFileSync(process.argv[3], `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="unpack"><diagram name="Page-1">${xml}</diagram></mxfile>\n`.replace(/<diagram name="Page-1">(<mxGraphModel[\s\S]*<\/mxGraphModel>)<\/diagram>/, '<diagram name="Page-1">$1</diagram>'));
else console.log(xml.replace(/></g, '>\n<').slice(0, Number(process.argv[4] ?? 6000)));
