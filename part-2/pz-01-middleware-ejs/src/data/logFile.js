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

// One export at a time per destination file: two requests racing to write and rename the very same
// `${file}.part` otherwise step on each other (one renames the file out from under the other, which then
// fails with ENOENT and a 500 the person did not cause). A second export for the same file waits its turn
// instead of racing; an export to another file is never held up by this one.
const queues = new Map();
const exclusive = (key, task) => {
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.then(task, task);
  queues.set(key, current.then(() => undefined, () => undefined));
  return current;
};

// Writes the rows to a temporary file through a stream and renames it over the old file only when the whole file is written,
// so a failure in the middle never leaves a half-written log in the place of a good one. The rows are read from the
// database and written to the file one at a time (see requestLog.js's `iterate`), so even the full table is
// never held in memory as one array, unlike a plain `log.recent(ROW_LIMIT)` would be.
export const exportLog = (log, file) => exclusive(file, () => doExport(log, file));

const doExport = async (log, file) => {
  const temporary = `${file}.part`;
  // Reading the table happens before the try: a database failure here is "the log database could not be
  // reached" (see requestLog.js), not "the export failed", and the two have different pages to explain them.
  const rows = log.iterate(ROW_LIMIT);
  let count = 0;
  const lines = async function* () {
    yield 'time\tmethod\turl\tstatus\tms\n';
    for (const row of rows) {
      count += 1;
      yield lineOf(row);
    }
  };
  try {
    // A deleted folder is made again; a folder with the name of the file is refused with its own page.
    await mkdir(dirname(file), { recursive: true });
    if ((await describeFile(file))?.folder) throw Object.assign(new Error('a folder stands in the place of the file'), { code: 'EISDIR' });
    await pipeline(Readable.from(lines()), createWriteStream(temporary, { flags: 'w' }));
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw new UserError(fileFailure(error, 'log-export-failed'), error);
  }
  return count;
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
