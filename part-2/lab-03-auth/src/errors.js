class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, message, details);
const unauthorized = (message) => new HttpError(401, message);
const forbidden = (message) => new HttpError(403, message);
const tooManyRequests = (message, retryAfterSeconds) => Object.assign(new HttpError(429, message), { retryAfter: retryAfterSeconds });
const notFound = (message) => new HttpError(404, message);
const conflict = (message) => new HttpError(409, message);

module.exports = { HttpError, tooManyRequests, badRequest, unauthorized, forbidden, notFound, conflict };
