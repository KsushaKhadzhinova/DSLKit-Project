// What every error page tells the person: what the error is, why it happened and how to solve it.
// The texts name no file path, no query and no internal message: the cause goes to the console of the server only.
export const CATALOG = {
  400: {
    heading: 'Bad request',
    what: 'The server could not understand the request. Nothing was changed.',
    why: ['The address or the form data contains a character the server cannot read.', 'A form was sent with a field that has the wrong kind of value.'],
    fix: ['Go back and open the page again from the menu.', 'Check the values of the form: the fields that need attention are marked.'],
  },
  403: {
    heading: 'Request refused',
    what: 'The server understood the request and refused it. Nothing was changed.',
    why: [
      'The form token is missing or old: a form opened a long time ago, in another tab, or a page of another site sent it.',
      'The page needs a signed-in user and the request came without one.',
    ],
    fix: [
      'Open the form again and send it once more.',
      'Add ?auth=1 to the address of the page to work as the owner (this is the simulated sign-in of the practical).',
    ],
  },
  404: {
    heading: 'Page not found',
    what: 'There is no page at this address. The site itself works, only this page or record is missing.',
    why: ['The address has a typo.', 'The record was deleted, or it never existed.', 'A link on another site is old.'],
    fix: ['Check the address.', 'Go back to the list and open the record from there.'],
  },
  405: {
    heading: 'Method not allowed',
    what: 'This address exists, but not for this kind of request.',
    why: ['A page that only shows data was sent a form, or the other way round.'],
    fix: ['Use the buttons and links of the pages instead of typing the address.', 'To change a record use its edit form.'],
  },
  413: {
    heading: 'Request too large',
    what: 'The data sent to the server is bigger than the limit.',
    why: ['A field contains much more text than the form allows.'],
    fix: ['Shorten the text. The limits are shown under the fields of the form.'],
  },
  429: {
    heading: 'Too many requests',
    what: 'The server received too many requests from this computer in a short time and pauses for a while.',
    why: ['Many pages or forms were opened quickly.', 'A program sends requests in a loop.'],
    fix: ['Wait for the number of seconds shown on the page and try again.'],
  },
  500: {
    heading: 'Server error',
    what: 'Something broke on the server while it prepared the page. The page you asked for was not changed by you, and the error was written to the console of the server.',
    why: ['A part of the program met a case it did not expect.', 'The request log database could not be reached.'],
    fix: [
      'Reload the page: a short failure often goes away.',
      'Return to the list and open the page again.',
      'If it repeats, tell the owner the time and the address of the page.',
    ],
  },
  'log-database-unavailable': {
    status: 500,
    heading: 'Server error',
    what: 'The server writes every request to the request log database, and the database could not be reached, so the page was not shown.',
    why: [
      'The database file was deleted, moved or locked by another program.',
      'The folder of the file is missing or cannot be written.',
      'The disk is full or read-only.',
    ],
    fix: [
      'Make sure the folder of the log database exists and can be written, then reload the page.',
      'If the file was deleted, restart the server: it creates the file again, the old rows are gone.',
      'The setting DB_FILE chooses the place of the file.',
    ],
  },
  'log-file-missing': {
    status: 404,
    heading: 'The log file was not found',
    what: 'The server looked for the exported file of the request log and it is not there.',
    why: ['The file was deleted or moved after it was exported.', 'The log has not been exported on this computer yet.', 'The folder of the file was cleaned.'],
    fix: [
      'Open the request log page and press "Export the log to a file": the file is created again.',
      'The log itself is safe, it is kept in the database.',
      'The setting LOG_EXPORT_FILE chooses the place of the file.',
    ],
  },
  'log-file-unreadable': {
    status: 500,
    heading: 'The log file cannot be read',
    what: 'The exported file of the request log exists, but the server could not read it to the end. The download was stopped.',
    why: [
      'The file is locked by another program or its rights were changed.',
      'The file was deleted while it was being sent.',
      'The disk reported a read error.',
    ],
    fix: ['Wait a moment and press "Download" again.', 'If it repeats, press "Export the log to a file" to write a new copy.'],
  },
  'log-export-failed': {
    status: 500,
    heading: 'The log could not be exported',
    what: 'The server could not write the request log to a file, so no new file was made. The old file, if there was one, stays as it was.',
    why: ['The folder of the file does not exist or cannot be written.', 'The disk is full or read-only.', 'Another program holds the file open.'],
    fix: ['Make sure the folder can be written, then press "Export the log to a file" again.', 'The setting LOG_EXPORT_FILE chooses the place of the file.'],
  },
  'log-path-is-folder': {
    status: 500,
    heading: 'A folder stands in the place of the log file',
    what: 'The server needs a file at this place to keep the log, and there is a folder with the same name instead, so it cannot read or write the log here.',
    why: [
      'Somebody created a folder with the name of the log file inside the folder of the logs.',
      'The file was deleted or renamed and a folder was made in its place.',
    ],
    fix: [
      'Delete or rename the folder that has the name of the log file, then press "Export the log to a file" again.',
      'Or choose another place of the file with the settings LOG_EXPORT_FILE and DB_FILE.',
    ],
  },
  'log-folder-access': {
    status: 500,
    heading: 'No access to the folder of the log',
    what: 'The server has no right to use the folder where the log is kept, or the folder cannot be created, so the log was not read or written.',
    why: [
      'The rights of the folder were changed: this program may not read or write there.',
      'A file stands in the place of a folder in the path, so the folder cannot be created.',
      'The disk is read-only or the folder is on a drive that is not connected.',
    ],
    fix: [
      'Give the program the right to read and write in the folder, or choose another folder with LOG_EXPORT_FILE and DB_FILE.',
      'Make sure no file has the name of a folder in the path.',
      'Then reload the page or press "Export the log to a file" again.',
    ],
  },
};

// An error the person should read about: the code picks the page of the catalog, the cause stays on the console.
export class UserError extends Error {
  constructor(code, cause) {
    super(code);
    this.name = 'UserError';
    this.userCode = code;
    this.status = CATALOG[code].status;
    this.cause = cause;
  }
}

// The entry for an error: its own code first, then its HTTP status, then the general 500 page.
export const entryFor = (err, status) => CATALOG[err.userCode] ?? CATALOG[status] ?? CATALOG[status >= 500 ? 500 : 400];

const NOT_A_FILE = new Set(['EISDIR']);
const NO_ACCESS = new Set(['EACCES', 'EPERM', 'EROFS', 'ENOTDIR', 'EBUSY', 'ENOSPC']);

// The code of the catalog for a system error of the file system, so the page says "no access to the folder" and not "EACCES".
export const fileFailure = (error, fallback) => {
  if (NOT_A_FILE.has(error?.code)) return 'log-path-is-folder';
  if (NO_ACCESS.has(error?.code)) return error.code === 'EBUSY' || error.code === 'ENOSPC' ? fallback : 'log-folder-access';
  return fallback;
};
