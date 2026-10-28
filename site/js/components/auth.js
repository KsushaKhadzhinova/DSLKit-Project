import { createAccountStore } from '../storage/accounts.js';
import { validateLogin, validateRegistration } from '../utils/validation.js';

const MESSAGES = {
  ru: {
    invalid: 'Неверная почта или пароль. Проверьте данные и попробуйте ещё раз.',
    exists: 'Аккаунт с такой почтой уже есть. Войдите или укажите другой адрес.',
    unsupported: 'Браузер не поддерживает безопасное хранение пароля. Откройте сайт по https или на localhost.',
    storage: 'Не удалось сохранить данные: хранилище браузера недоступно или заполнено.',
  },
  en: {
    invalid: 'The email or the password is wrong. Check the data and try again.',
    exists: 'An account with this email already exists. Sign in or use another address.',
    unsupported: 'The browser cannot store a password safely. Open the site over https or on localhost.',
    storage: 'The data could not be saved: the browser storage is unavailable or full.',
  },
};

const FIELDS = { login: ['email', 'password'], register: ['name', 'email', 'password', 'confirm'] };

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
    navigate(button.closest('[data-auth]')?.dataset.home ?? './');
  });

  // Signing in or out in another tab changes the menu of this one.
  root.defaultView.addEventListener('storage', render);

  return { render, user: () => store.current() };
};

// The sign-in and registration forms (#auth-form with data-mode). Errors of the fields are in the markup, errors of the account are here.
export const initAuthForm = ({ root = document, storage, crypto, navigate = goTo(root) } = {}) => {
  const form = root.querySelector('#auth-form');
  if (!form) return null;

  const mode = form.dataset.mode === 'register' ? 'register' : 'login';
  const ids = FIELDS[mode];
  const messages = MESSAGES[root.documentElement.lang === 'en' ? 'en' : 'ru'];
  const store = createAccountStore({ storage, crypto });
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
    busy = true;
    button.disabled = true;
    const values = readValues();
    const result = await store[mode](values);
    busy = false;
    button.disabled = false;
    clearPasswords();
    if (!result.ok) {
      showSummary(messages[result.error]);
      field(mode === 'register' && result.error === 'exists' ? 'email' : 'password').focus();
      return false;
    }
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
