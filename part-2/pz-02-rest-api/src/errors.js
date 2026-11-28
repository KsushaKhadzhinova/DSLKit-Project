import { describeError } from './error-catalog.js';

// One error shape for the whole API: { error: { code, message, title, description, requestId, details? } }.
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what) => new ApiError(404, 'not_found', `${what} not found`);
export const validationFailed = (details) => new ApiError(400, 'validation_failed', 'Request body is invalid', details);

// requestId ties the answer to its row in the request journal and to the server log line.
export const errorBody = (err, requestId) => {
  const { title, description } = describeError(err.status, err.code);
  return { error: { code: err.code, message: err.message, title, description, requestId, ...(err.details && { details: err.details }) } };
};
