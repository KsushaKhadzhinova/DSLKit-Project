// @ts-nocheck -- type-check debt: remove this line when the file passes npm run typecheck
import { pageLanguage, pick } from '../utils/lang.js';

// The browser words its own validation bubble in the language of the browser, not of the page: a Russian form says "Please fill out this field".
// Here the bubble is worded in the language of the page: when a control is found invalid, its custom message is set (and cleared again on input).
const TEXTS = {
  valueMissing: { ru: 'Заполните это поле.', en: 'Please fill out this field.' },
  typeMismatch: {
    ru: 'Введите значение в нужном формате, например адрес почты name@example.com.',
    en: 'Please enter a value in the right format, such as an email name@example.com.',
  },
  patternMismatch: { ru: 'Значение не подходит под нужный формат.', en: 'The value does not match the required format.' },
  tooShort: { ru: 'Значение слишком короткое.', en: 'The value is too short.' },
  tooLong: { ru: 'Значение слишком длинное.', en: 'The value is too long.' },
  rangeUnderflow: { ru: 'Значение слишком маленькое.', en: 'The value is too small.' },
  rangeOverflow: { ru: 'Значение слишком большое.', en: 'The value is too large.' },
  stepMismatch: { ru: 'Значение не подходит по шагу.', en: 'The value does not fit the step.' },
  badInput: { ru: 'Введите значение в нужном формате.', en: 'Please enter a value in the right format.' },
};
const KEYS = Object.keys(TEXTS);

export const validationMessage = (validity, lang) => {
  const key = KEYS.find((name) => validity[name]);
  return key ? pick(TEXTS[key], lang) : '';
};

export const initNativeValidation = ({ root = document } = {}) => {
  if (!root.querySelector('form')) return null;
  const lang = pageLanguage(root);
  root.addEventListener(
    'invalid',
    (event) => {
      const control = event.target;
      control.setCustomValidity('');
      control.setCustomValidity(validationMessage(control.validity, lang));
    },
    true,
  );
  root.addEventListener('input', (event) => event.target.setCustomValidity?.(''));
  return { lang };
};
