// One error shape for the whole API: { error: { code, message, details? } }.
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

export const errorBody = (err) => ({ error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) } });
