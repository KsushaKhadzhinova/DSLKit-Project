import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { UserError, fileFailure } from '../errors.js';

// The request log lives in the database (the even variant), and it can also be exported to a text file and downloaded.
// Both steps work with streams, so a big log is never held in memory as one string, and every failure ends in a page that the person can understand.

const ROW_LIMIT = 100000;

const lineOf = (row) => `${row.time}\t${row.method}\t${String(row.url).replace(/[\u0000-\u001f\u007f-\u009f]/g, '?')}\t${row.status ?? ''}\t${row.ms ?? ''}\n`;

// Writes the rows to a temporary file through a stream and renames it over the old file only when the whole file is written,
// so a failure in the middle never leaves a half-written log in the place of a good one.
export const exportLog = async (log, file) => {
  const temporary = `${file}.part`;
  const rows = log.recent(ROW_LIMIT);
  try {
    // A deleted folder is made again; a folder with the name of the file is refused with its own page.
    await mkdir(dirname(file), { recursive: true });
    if ((await describeFile(file))?.folder) throw Object.assign(new Error('a folder stands in the place of the file'), { code: 'EISDIR' });
    await pipeline(Readable.from(['time\tmethod\turl\tstatus\tms\n', ...rows.map(lineOf)]), createWriteStream(temporary, { flags: 'w' }));
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw new UserError(fileFailure(error, 'log-export-failed'), error);
  }
  return rows.length;
};

// Size and time of the exported file, null when there is no file (never made, deleted or renamed), { folder: true } when a folder has its name.
export const describeFile = async (file) => {
  try {
    const info = await stat(file);
    return info.isFile() ? { size: info.size, time: info.mtime.toISOString() } : { folder: true };
  } catch {
    return null;
  }
};

// Sends the file to the browser through a stream. A missing file is a page for the person (404), not a crash.
// An error in the middle of the transfer cannot become a page, because the answer has begun: then the connection is closed and the failure goes to the console.
// `open` opens the file for reading; a test replaces it to make the file fail in the middle of the transfer.
export const sendLogFile = async (res, file, writeError, open = createReadStream) => {
  const info = await describeFile(file);
  if (!info) throw new UserError('log-file-missing');
  if (info.folder) throw new UserError('log-path-is-folder');
  const input = open(file);
  // The file can disappear between the check and the opening: the open event decides.
  await new Promise((resolve, reject) => {
    input.once('open', resolve);
    input.once('error', reject);
  }).catch((error) => {
    throw new UserError(error.code === 'ENOENT' ? 'log-file-missing' : fileFailure(error, 'log-file-unreadable'), error);
  });
  res.set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': 'attachment; filename="request-log.txt"',
    'Content-Length': String(info.size),
    'Cache-Control': 'no-store',
  });
  try {
    await pipeline(input, res);
  } catch (error) {
    writeError('[error] the log file transfer failed', error);
    res.destroy();
  }
};
