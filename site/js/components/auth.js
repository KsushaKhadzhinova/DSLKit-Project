import { createAccountStore } from '../storage/accounts.js';
import { validateLogin, validateRegistration } from '../utils/validation.js';

const MESSAGES = {
  ru: {
    invalid: 'Неверная почта или пароль. Проверьте данные и попробуйте ещё раз.',
    exists: 'Аккаунт с такой почтой уже есть. Войдите или укажите другой адрес.',
    unsupported: 'Браузер не поддерживает безопасное хранение пароля. Откройте сайт по https или на localhost.',
    storage: 'Не удалось сохранить данные: хранилище браузера недоступно или заполнено.',
    policy: 'Пароль не принят: {reasons}.',
    locked: 'Слишком много неудачных попыток. Подождите {time} и попробуйте снова.',
    'invalid-code': 'Код неверный или уже использован. Введите актуальный код из приложения или резервный код.',
    'code-required': 'Введите код из приложения-аутентификатора или один из резервных кодов.',
  },
  en: {
    invalid: 'The email or the password is wrong. Check the data and try again.',
    exists: 'An account with this email already exists. Sign in or use another address.',
    unsupported: 'The browser cannot store a password safely. Open the site over https or on localhost.',
    storage: 'The data could not be saved: the browser storage is unavailable or full.',
    policy: 'The password is not accepted: {reasons}.',
    locked: 'Too many failed attempts. Wait {time} and try again.',
    'invalid-code': 'The code is wrong or already used. Enter the current code of the app or a recovery code.',
    'code-required': 'Enter the code of the authenticator app or one of the recovery codes.',
  },
};

const FIELDS = { login: ['email', 'password'], register: ['name', 'email', 'password', 'confirm'] };

import { flash } from './toast.js';
import { pageLanguage, pick } from '../utils/lang.js';
import { attachPasswordMeter, issuesText } from './password-meter.js';
import { passwordIssues } from '../auth/password-policy.js';

const TEXTS = {
  signedOut: { ru: 'Вы вышли из аккаунта.', en: 'You are signed out.' },
  created: { ru: 'Аккаунт создан, добро пожаловать!', en: 'The account is created, welcome!' },
  signedIn: { ru: 'Вы вошли в аккаунт.', en: 'You are signed in.' },
};

// "45 с" or "2 мин 5 с": the time that a locked address still waits.
const UNITS = { min: { ru: 'мин', en: 'min' }, sec: { ru: 'с', en: 's' } };

export const waitText = (ms, lang) => {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  const [min, sec] = [pick(UNITS.min, lang), pick(UNITS.sec, lang)];
  return seconds < 60 ? `${seconds} ${sec}` : `${Math.floor(seconds / 60)} ${min} ${seconds % 60} ${sec}`;
};

const goTo = (root) => (url) => root.defaultView.location.assign(url);

// The account menu: guests see the sign-in and registration links, a signed-in user sees the name and the sign-out button.
// It is rendered in the markup for a guest, so the page works before the script runs.
export const initAuthMenu = ({ root = document, storage, crypto, navigate = goTo(root) } = {}) => {
  const menus = [...root.querySelectorAll('[data-auth]')];
  if (menus.length === 0) return null;

  const store = createAccountStore({ storage, crypto });
  const render = () => {
    const user = store.current();
    root.querySelectorAll('[data-auth-guest]').forEach((element) => {
      element.hidden = user !== null;
    });
    root.querySelectorAll('[data-auth-user]').forEach((element) => {
      element.hidden = user === null;
    });
    root.querySelectorAll('[data-auth-name]').forEach((element) => {
      element.textContent = user?.name ?? '';
    });
    return user;
  };

  render();

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-auth-logout]');
    if (!button) return;
    store.logout();
    render();
    flash(storage, pick(TEXTS.signedOut, pageLanguage(root)), 'info');
    navigate(button.closest('[data-auth]')?.dataset.home ?? './');
  });

  // Signing in or out in another tab changes the menu of this one.
  root.defaultView.addEventListener('storage', render);

  return { render, user: () => store.current() };
};

// The sign-in and registration forms (#auth-form with data-mode). Errors of the fields are in the markup, errors of the account are here.
export const initAuthForm = ({
  root = document,
  storage,
  crypto,
  navigate = goTo(root),
  now = () => Date.now(),
  every = (tick, ms) => {
    const id = root.defaultView.setInterval(tick, ms);
    return () => root.defaultView.clearInterval(id);
  },
} = {}) => {
  const form = root.querySelector('#auth-form');
  if (!form) return null;

  const mode = form.dataset.mode === 'register' ? 'register' : 'login';
  const ids = FIELDS[mode];
  const lang = pageLanguage(root);
  const messages = MESSAGES[lang];
  const store = createAccountStore({ storage, crypto, now });
  const summary = form.querySelector('#auth-error');
  const button = form.querySelector('[type="submit"]');
  const field = (id) => form.querySelector(`#${id}`);
  const readValues = () => Object.fromEntries(ids.map((id) => [id, field(id).value]));
  const invalidFields = () => (mode === 'register' ? validateRegistration(readValues()) : validateLogin(readValues()));

  const showState = (id, invalid) => {
    const input = field(id);
    const error = form.querySelector(`#${id}-error`);
    if (error) error.hidden = !invalid;
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    const described = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((value) => value && value !== `${id}-error`);
    if (invalid && error) described.push(`${id}-error`);
    if (described.length > 0) input.setAttribute('aria-describedby', described.join(' '));
    else input.removeAttribute('aria-describedby');
  };
  const showSummary = (text) => {
    summary.textContent = text;
    summary.hidden = text === '';
  };
  const remember = form.querySelector('#remember');
  const codeField = form.querySelector('#code-field');
  const codeInput = form.querySelector('#code');
  const codeShown = () => codeField !== null && !codeField.hidden;

  // The user waits out a lock: the button is off and the line counts down to the moment the address may try again.
  let stopCountdown = () => {};
  const countdown = (ms) => {
    stopCountdown();
    const until = now() + ms;
    button.disabled = true;
    const tick = () => {
      const left = until - now();
      if (left <= 0) {
        stopCountdown();
        button.disabled = false;
        showSummary('');
        return;
      }
      showSummary(messages.locked.replace('{time}', waitText(left, lang)));
    };
    stopCountdown = every(tick, 1000);
    tick();
  };

  const meter = form.querySelector('[data-password-meter]');
  if (mode === 'register' && meter) {
    attachPasswordMeter({
      input: field('password'),
      bar: meter.querySelector('meter'),
      text: meter.querySelector('[data-meter-text]'),
      lang,
      context: () => ({ name: field('name').value, email: field('email').value }),
    });
  }

  const clearPasswords = () => {
    ['password', 'confirm'].filter((id) => ids.includes(id)).forEach((id) => (field(id).value = ''));
  };

  form.noValidate = true;
  let busy = false;

  const submit = async () => {
    if (busy) return false;
    const invalid = invalidFields();
    ids.forEach((id) => showState(id, invalid.includes(id)));
    showSummary('');
    if (invalid.length > 0) {
      field(invalid[0]).focus();
      return false;
    }
    const values = readValues();
    if (mode === 'register') {
      const issues = passwordIssues(values.password, values);
      if (issues.length > 0) {
        showSummary(messages.policy.replace('{reasons}', issuesText(issues, lang)));
        field('password').focus();
        return false;
      }
    }
    if (codeShown()) {
      const missing = codeInput.value.trim() === '';
      showState('code', missing);
      if (missing) {
        codeInput.focus();
        return false;
      }
      values.code = codeInput.value;
    }
    if (remember) values.remember = remember.checked;
    busy = true;
    button.disabled = true;
    const result = await store[mode](values);
    busy = false;
    button.disabled = false;
    if (result.error === 'code-required') {
      codeField.hidden = false;
      showSummary(messages['code-required']);
      codeInput.focus();
      return false;
    }
    clearPasswords();
    if (codeInput) codeInput.value = '';
    if (!result.ok) {
      if (result.error === 'locked') countdown(result.retryAfterMs);
      else showSummary(messages[result.error]);
      field(mode === 'register' && result.error === 'exists' ? 'email' : 'password').focus();
      return false;
    }
    flash(storage, pick(mode === 'register' ? TEXTS.created : TEXTS.signedIn, pageLanguage(root)), 'success');
    navigate(mode === 'register' ? 'welcome.html' : 'dashboard.html');
    return true;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit();
  });

  // The first error of a field appears when the field is left; after that it is rechecked while typing.
  const revalidate = (event) => {
    const { id } = event.target;
    if (!ids.includes(id)) return;
    if (event.type === 'change' || event.target.getAttribute('aria-invalid') === 'true') showState(id, invalidFields().includes(id));
    if (id === 'password' && field('confirm')?.value && field('confirm').getAttribute('aria-invalid') === 'true') {
      showState('confirm', invalidFields().includes('confirm'));
    }
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  // A signed-in user has nothing to do here.
  if (store.current()) navigate('dashboard.html');

  return { submit };
};
