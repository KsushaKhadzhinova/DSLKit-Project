// The error answer carries explanatory fields (title, description, requestId) next to the stable code and message.
// Tests of one specific rule compare only code, message and details; the extra fields have their own tests.
export const core = (body) => {
  const { code, message, details } = body.error;
  return { error: { code, message, ...(details && { details }) } };
};
