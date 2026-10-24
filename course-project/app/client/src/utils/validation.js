import limits from '../limits.json';

export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];
export const PRIORITIES = ['low', 'normal', 'high'];

const checkText = (value, { minLength, maxLength }, label) => {
  const length = value.trim().length;
  if (length < minLength) return `Введите ${label}`;
  if (length > maxLength) return `${label[0].toUpperCase()}${label.slice(1)} не длиннее ${maxLength} символов`;
  return null;
};

// Returns an object with a message per invalid field, empty when everything is valid.
// A whitespace-only text counts as empty. The limits live in limits.json and match the server.
export function validateDiagram({ title, sourceCode, notation }) {
  const errors = {};
  const titleError = checkText(title, limits.title, 'название');
  const codeError = checkText(sourceCode, limits.sourceCode, 'исходный код');
  if (titleError) errors.title = titleError;
  if (codeError) errors.sourceCode = codeError;
  if (!NOTATIONS.includes(notation)) errors.notation = 'Выберите нотацию';
  return errors;
}

// The server hashes the password with bcrypt, which reads only the first 72 bytes, so the limit counts bytes (a Cyrillic letter is two bytes).
export function validateCredentials({ email, password }) {
  const errors = {};
  const address = email.trim();
  if (!/^\S+@\S+\.\S+$/.test(address) || address.length > limits.email.maxLength) errors.email = 'Введите адрес электронной почты';
  if (password.length < limits.password.minLength) errors.password = `Пароль не короче ${limits.password.minLength} символов`;
  else if (new TextEncoder().encode(password).length > limits.password.maxBytes) errors.password = `Пароль не длиннее ${limits.password.maxBytes} байт`;
  return errors;
}

// "2026-10-16 12:30:05" in local time, the same look in every locale; every record shows its own creation time.
export const formatTime = (iso) => new Date(iso).toLocaleString('sv-SE');

// A comment is multi-line text: line breaks and tabs are fine, other control characters (NUL, escape) are not, the same rule as on the server.
const COMMENT_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
export function validateComment(text) {
  const length = text.trim().length;
  if (length < limits.comment.minLength) return 'Введите комментарий';
  if (length > limits.comment.maxLength) return `Комментарий не длиннее ${limits.comment.maxLength} символов`;
  if (COMMENT_CONTROL.test(text)) return 'Уберите управляющие символы';
  return null;
}
