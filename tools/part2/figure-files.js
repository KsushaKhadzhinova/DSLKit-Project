import { crc32 } from '../zip.js';

// Placeholder figures stand in for screenshots that only the owner can take. They are marked in the PNG itself (a tEXt chunk
// with the keyword below), and the files named owner-*.png or placeholder-*.png count as placeholders as well.
// A final report must have none left: replace the file under the same name and the mark is gone.
export const MARK = 'dslkit-placeholder';
const NAME = /(?:^|\/)(?:owner|placeholder)-[^/]*\.png$/;

export const imagesOf = (md) => [...md.matchAll(/^!\[[^\]]*\]\(([^)]+)\)$/gm)].map((m) => m[1]);

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

// Puts the mark into a PNG just before its IEND chunk.
export const markPlaceholder = (png) => {
  const end = png.length - 12;
  return Buffer.concat([png.subarray(0, end), chunk('tEXt', Buffer.from(`${MARK}\0placeholder for an owner screenshot`, 'latin1')), png.subarray(end)]);
};

export const isMarked = (png) => png.includes(Buffer.from(`tEXt${MARK}\0`, 'latin1'));

// The images of the report that are still placeholders (paths as written in the report).
export const placeholderFigures = (md, dir, readFile) => imagesOf(md).filter((src) => NAME.test(src) || isMarked(readFile(`${dir}/${src}`)));
