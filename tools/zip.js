import { inflateRawSync } from 'node:zlib';

// A minimal ZIP writer (stored, no compression) and reader (stored and deflate): enough for a DOCX package,
// so the report converter needs no dependency.
const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const u16 = (n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};
const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
};

// files: { 'word/document.xml': string | Buffer }. The order of the keys is the order in the archive.
export const zip = (files) => {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const body = Buffer.from(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(body);
    // 0x0800 marks UTF-8 names; time and date are fixed so that the same input gives the same archive.
    const head = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0x21),
      u32(crc),
      u32(body.length),
      u32(body.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
    ]);
    local.push(head, body);
    central.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0x21),
        u32(crc),
        u32(body.length),
        u32(body.length),
        u16(nameBuf.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBuf,
      ]),
    );
    offset += head.length + body.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(dir.length), u32(offset), u16(0)]);
  return Buffer.concat([...local, dir, end]);
};

// Returns { name: Buffer } for every entry of the archive.
export const unzip = (buf) => {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < count; i += 1) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataAt, dataAt + size);
    files[name] = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return files;
};
