import { passwordIssues, passwordStrength } from '../auth/password-policy.js';
import { pick } from '../utils/lang.js';

const LEVELS = [
  { ru: 'Пароль не принят', en: 'The password is not accepted' },
  { ru: 'Слабый пароль', en: 'Weak password' },
  { ru: 'Средний пароль', en: 'Fair password' },
  { ru: 'Хороший пароль', en: 'Good password' },
  { ru: 'Надёжный пароль', en: 'Strong password' },
];

const ISSUES = {
  short: { ru: 'нужно не меньше 8 символов, не только пробелы', en: 'at least 8 characters, not only spaces' },
  long: { ru: 'не больше 128 символов', en: 'at most 128 characters' },
  common: { ru: 'это один из самых частых паролей', en: 'this is one of the most common passwords' },
  repeat: { ru: 'пароль состоит из повторов одного-двух символов', en: 'the password repeats one or two characters' },
  personal: { ru: 'пароль не должен совпадать с почтой или именем и содержать их', en: 'the password must not equal or contain the email or the name' },
  reuse: { ru: 'новый пароль совпадает со старым', en: 'the new password equals the old one' },
};

export const strengthLabel = (level, lang) => pick(LEVELS[level], lang);

// The reasons why a password was refused, as one sentence in the language of the page.
export const issuesText = (issues, lang) => issues.map((code) => pick(ISSUES[code], lang)).join('; ');

// A strength meter under a password field: a bar from 0 to 4 and a line of text that names the first problem.
// `context()` gives the name and the email that the password must not repeat.
export const attachPasswordMeter = ({ input, bar, text, lang, context = () => ({}) }) => {
  const update = () => {
    const value = input.value;
    const issues = value === '' ? [] : passwordIssues(value, context());
    const level = value === '' ? 0 : passwordStrength(value, context());
    bar.value = level;
    bar.dataset.level = String(level);
    text.textContent = value === '' ? '' : issues.length > 0 ? `${strengthLabel(0, lang)}: ${issuesText(issues, lang)}` : strengthLabel(level, lang);
  };
  input.addEventListener('input', update);
  update();
  return update;
};
