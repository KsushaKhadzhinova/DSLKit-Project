// What each error means in plain words, shown to the person who hits it (a JSON field for an API client, the body of
// an HTML page for a browser). Every entry answers three questions: what happened, the likely cause, what to do.
// A specific error code can refine the generic text of its status (see BY_CODE).
const BY_STATUS = {
  400: ['Bad request', 'The server could not accept the request because something in it is wrong.', 'A value is missing, too long, has the wrong type, or the address or JSON is malformed.', 'Fix the values named in the details and send the request again.'],
  403: ['Forbidden', 'The server understood the request but refuses to carry it out.', 'The current user is not allowed to do this with this record.', 'Use an account with the right role, or ask the owner of the record for access.'],
  404: ['Not found', 'There is nothing at this address or with this number.', 'The record was deleted (possibly a moment ago by someone else), or the address or number is mistyped.', 'Check the address and the number, or open the list and pick an existing record.'],
  405: ['Method not allowed', 'This address does not accept the HTTP method that was used.', 'For example a DELETE was sent to a list, or a POST to a read-only address.', 'Use one of the methods named in the Allow header.'],
  406: ['Not acceptable', 'The server cannot answer in any format the client asked for.', 'The Accept header lists only formats other than JSON and HTML.', 'Ask for application/json or remove the Accept header.'],
  409: ['Conflict', 'The request is correct but cannot be carried out in the current state of the data.', 'Another request changed the data first: the parent record is gone, the record is still in use, the email is taken or the collection is full.', 'Read the current data again and decide what to do; nothing was changed by this request.'],
  412: ['Precondition failed', 'The record is no longer the version the client read.', 'Someone else changed it after it was read, so the If-Match tag is stale.', 'Read the record again, apply the change to the fresh copy and resend.'],
  413: ['Payload too large', 'The request body is bigger than the server accepts.', 'The JSON is larger than the limit set in limits.json.', 'Send a smaller body.'],
  415: ['Unsupported media type', 'The server cannot read the format or encoding of the body.', 'The Content-Type is not application/json, or the charset is not UTF-8.', 'Send the body as UTF-8 JSON with Content-Type: application/json.'],
  429: ['Too many requests', 'The client sent more requests than the server allows in one minute.', 'A script, a loop or many tabs are calling the API too fast.', 'Wait for the number of seconds in the Retry-After header, then continue slowly.'],
  500: ['Internal server error', 'The server failed while handling the request.', 'An unexpected fault inside the server; the action was not completed.', 'Try again later and give the Request ID below to the administrator.'],
};

const BY_CODE = {
  journal_unavailable: [
    'Request journal unavailable',
    'The server could not write this request to its journal table, so the action was cancelled and nothing was changed.',
    'The journal database is locked, full, missing or broken; working without a journal is forbidden.',
    'Try again later and give the Request ID below to the administrator, who can see this failure in the server log.',
  ],
  route_not_found: ['Page not found', 'There is no page or API address like this.', 'The address is mistyped, or it belongs to another version of the API.', 'Check the address; the API lives under /api, the list of addresses is in /api/openapi.json.'],
  forbidden: ['Forbidden', 'The server understood the request but refuses to carry it out for this user.', 'The user in X-User-Id may change only their own records, and only an administrator (X-Role: admin) may delete projects or other users.', 'Send the request as the owner of the record or as an administrator; nothing was changed.'],
  invalid_identity: ['Bad identity headers', 'The X-User-Id or X-Role header has a value the server cannot use.', 'X-User-Id must be a positive whole number and X-Role must be user or admin.', 'Fix or remove the header and send the request again.'],
  parent_missing: ['Parent record is gone', 'The record this one belongs to does not exist any more, so nothing was stored.', 'It was deleted a moment ago by someone else, or its number is wrong.', 'Open the list again and pick an existing parent.'],
  quota_exceeded: ['Collection is full', 'The collection reached its maximum size, so nothing was stored.', 'The limit maxRecordsPerCollection in limits.json is used up.', 'Delete records that are no longer needed, then try again.'],
  precondition_failed: BY_STATUS[412],
};

const FALLBACK = ['Error', 'The request could not be completed.', 'See the message for the reason.', 'Check the request and try again.'];

export const KNOWN_STATUSES = Object.keys(BY_STATUS).map(Number);

export const describeError = (status, code) => {
  const [title, what, cause, action] = BY_CODE[code] ?? BY_STATUS[status] ?? FALLBACK;
  return { title, description: `${what} Likely cause: ${cause} What to do: ${action}`, parts: { what, cause, action } };
};
