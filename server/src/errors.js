'use strict';

class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (code, message, details) => new HttpError(400, code, message, details);
const unauthorized = (code = 'unauthorized', message = 'Authentication required') => new HttpError(401, code, message);
const forbidden = (message = 'Not allowed') => new HttpError(403, 'forbidden', message);
// One shared message so a missing object and a hidden one are indistinguishable.
const notFound = () => new HttpError(404, 'not_found', 'Not found');
const conflict = (code, message) => new HttpError(409, code, message);
const tooMany = (code, message, retryAfter) => Object.assign(new HttpError(429, code, message), { retryAfter });

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany };
