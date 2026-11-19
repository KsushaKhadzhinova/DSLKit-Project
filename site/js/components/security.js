import { can, ROLES } from '../auth/permissions.js';
import { createAccountStore } from '../storage/accounts.js';
import { formatDateTime, pageLanguage, pick } from '../utils/lang.js';
import { waitText } from './auth.js';
import { attachPasswordMeter, issuesText } from './password-meter.js';

const TEXTS = {
  device: { ru: 'Это устройство', en: 'This device' },
  longSession: { ru: 'запомнен', en: 'remembered' },
  shortSession: { ru: 'короткая', en: 'short' },
  sessionLine: { ru: 'Вход: {created} · Активность: {seen} · Сессия: {kind}', en: 'Signed in: {created} · Last seen: {seen} · Session: {kind}' },
  revoke: { ru: 'Завершить', en: 'Revoke' },
  signOut: { ru: 'Выйти', en: 'Sign out' },
  noSessions: { ru: 'Нет активных сессий.', en: 'No active sessions.' },
  revoked: { ru: 'Сессия завершена.', en: 'The session is revoked.' },
  revokedOthers: { ru: 'Завершено других сессий: {ended}.', en: 'Other sessions revoked: {ended}.' },
  totpOn: {
    ru: 'Двухфакторная аутентификация включена. Резервных кодов осталось: {left}.',
    en: 'Two-factor authentication is on. Recovery codes left: {left}.',
  },
  totpOff: { ru: 'Двухфакторная аутентификация выключена.', en: 'Two-factor authentication is off.' },
  totpEnabled: {
    ru: 'Двухфакторная аутентификация включена. Сохраните резервные коды: они показаны один раз.',
    en: 'Two-factor authentication is on. Save the recovery codes: they are shown once.',
  },
  totpDisabled: { ru: 'Двухфакторная аутентификация выключена.', en: 'Two-factor authentication is off.' },
  passwordChanged: { ru: 'Пароль изменён. Завершено других сессий: {ended}.', en: 'The password is changed. Other sessions revoked: {ended}.' },
  mismatch: { ru: 'Пароли не совпадают.', en: 'The passwords do not match.' },
  policy: { ru: 'Пароль не принят: {reasons}.', en: 'The password is not accepted: {reasons}.' },
  locked: { ru: 'Слишком много неудачных попыток. Подождите {time}.', en: 'Too many failed attempts. Wait {time}.' },
  roleSaved: { ru: 'Роль изменена.', en: 'The role is changed.' },
  deleted: { ru: 'Аккаунт удалён.', en: 'The account is deleted.' },
  you: { ru: 'вы', en: 'you' },
  noEvents: { ru: 'Событий пока нет.', en: 'No events yet.' },
  errors: {
    invalid: { ru: 'Пароль неверный.', en: 'The password is wrong.' },
    'invalid-code': { ru: 'Код неверный или уже использован.', en: 'The code is wrong or already used.' },
    'signed-out': { ru: 'Войдите в аккаунт.', en: 'Sign in first.' },
    unsupported: {
      ru: 'Браузер не поддерживает безопасное хранение пароля. Откройте сайт по https или на localhost.',
      en: 'The browser cannot store a password safely. Open the site over https or on localhost.',
    },
    storage: { ru: 'Не удалось сохранить: хранилище браузера недоступно или заполнено.', en: 'Could not save: the browser storage is unavailable or full.' },
    'last-admin': { ru: 'Нельзя снять роль с последнего администратора.', en: 'The last admin cannot lose the role.' },
    forbidden: { ru: 'Нужна роль администратора.', en: 'The admin role is required.' },
    enabled: { ru: 'Двухфакторная аутентификация уже включена.', en: 'Two-factor authentication is already on.' },
    'no-pending': { ru: 'Сначала нажмите «Настроить».', en: 'Press "Set up" first.' },
    'not-enabled': { ru: 'Двухфакторная аутентификация не включена.', en: 'Two-factor authentication is not on.' },
    unknown: { ru: 'Такой записи нет.', en: 'No such item.' },
  },
  events: {
    'account-created': { ru: 'Аккаунт создан', en: 'Account created' },
    'sign-in': { ru: 'Вход', en: 'Sign-in' },
    'sign-in-failed': { ru: 'Неудачная попытка входа', en: 'Failed sign-in' },
    'second-factor-failed': { ru: 'Неверный код второго фактора', en: 'Wrong second-factor code' },
    locked: { ru: 'Вход заблокирован на {detail} с', en: 'Sign-in locked for {detail} s' },
    'sign-out': { ru: 'Выход', en: 'Sign-out' },
    'password-change': { ru: 'Пароль изменён, завершено других сессий: {detail}', en: 'Password changed, other sessions revoked: {detail}' },
    'password-change-failed': {
      ru: 'Неверный пароль при смене пароля, удалении или отключении 2FA',
      en: 'Wrong password when changing it, deleting the account or turning off 2FA',
    },
    'totp-enabled': { ru: 'Двухфакторная аутентификация включена', en: 'Two-factor authentication turned on' },
    'totp-disabled': { ru: 'Двухфакторная аутентификация выключена', en: 'Two-factor authentication turned off' },
    'totp-recovery-used': { ru: 'Использован резервный код, осталось: {detail}', en: 'A recovery code was used, left: {detail}' },
    'role-change': { ru: 'Роль изменена: {detail}', en: 'Role changed: {detail}' },
    'session-revoked': { ru: 'Сессия завершена: {detail}', en: 'Session revoked: {detail}' },
  },
};

const goTo = (root) => (url) => root.defaultView.location.assign(url);

// The security section of the settings: password, sessions, two-factor codes, the list of accounts for an admin, the audit log and the deletion of the account.
// It only draws what the account store returns; every rule lives in the store.
export const initSecurity = ({ root = document, storage, crypto, now = () => Date.now(), navigate = goTo(root) } = {}) => {
  const section = root.querySelector('[data-security]');
  if (!section) return null;

  const lang = pageLanguage(root);
  const t = (key, params) => pick(TEXTS[key], lang, params);
  const store = createAccountStore({ storage, crypto, now });
  const part = (name) => section.querySelector(`[data-security-${name}]`);
  const field = (id) => section.querySelector(`#${id}`);
  const say = (name, text, kind = 'info') => {
    const line = section.querySelector(`[data-status="${name}"]`);
    line.textContent = text;
    line.dataset.kind = kind;
  };
  const failText = (result) => {
    if (result.error === 'locked') return t('locked', { time: waitText(result.retryAfterMs, lang) });
    if (result.error === 'policy') return t('policy', { reasons: issuesText(result.issues, lang) });
    return pick(TEXTS.errors[result.error], lang);
  };
  const build = (tag, className, text = '') => {
    const node = root.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  };
  const when = (ms) => formatDateTime(ms, lang);

  attachPasswordMeter({
    input: field('security-new'),
    bar: section.querySelector('[data-password-meter] meter'),
    text: section.querySelector('[data-meter-text]'),
    lang,
    context: () => store.current() ?? {},
  });

  const renderSessions = () => {
    const list = section.querySelector('[data-session-list]');
    list.replaceChildren();
    const items = store.sessions();
    if (items.length === 0) list.append(build('li', 'security-item', t('noSessions')));
    items.forEach((item) => {
      const row = build('li', 'security-item');
      const text = build('span', 'security-item__text');
      text.append(build('strong', '', item.device));
      if (item.current) text.append(' ', build('span', 'security-badge', t('device')));
      text.append(
        build('br'),
        t('sessionLine', { created: when(item.created), seen: when(item.lastSeen), kind: t(item.remember ? 'longSession' : 'shortSession') }),
      );
      const button = build('button', 'button', t(item.current ? 'signOut' : 'revoke'));
      button.type = 'button';
      button.dataset.revoke = item.id;
      row.append(text, button);
      list.append(row);
    });
    section.querySelector('[data-revoke-others]').hidden = items.length < 2;
  };

  const renderTotp = () => {
    const status = store.totpStatus();
    section.querySelector('[data-totp-state]').textContent = status.enabled ? t('totpOn', { left: status.recoveryLeft }) : t('totpOff');
    section.querySelector('[data-totp-start]').hidden = status.enabled;
    section.querySelector('[data-totp-disable]').hidden = !status.enabled;
    if (status.enabled) section.querySelector('[data-totp-setup]').hidden = true;
  };

  const renderAudit = () => {
    const all = field('audit-all').checked;
    const names = new Map((store.listAccounts().accounts ?? []).map((item) => [item.id, item.name]));
    const list = section.querySelector('[data-audit-list]');
    list.replaceChildren();
    const events = store.audit({ all });
    if (events.length === 0) list.append(build('li', 'security-item', t('noEvents')));
    events.forEach((event) => {
      const label = pick(TEXTS.events[event.type], lang, { detail: event.detail ?? '' });
      list.append(build('li', 'security-item', `${when(event.at)} · ${all ? `${names.get(event.userId) ?? event.userId}: ` : ''}${label}`));
    });
  };

  const renderAccounts = () => {
    const result = store.listAccounts();
    const block = part('admin');
    block.hidden = !result.ok;
    field('audit-all-field').hidden = !result.ok;
    const body = section.querySelector('[data-account-list]');
    body.replaceChildren();
    (result.accounts ?? []).forEach((item) => {
      const row = build('tr');
      const select = build('select', 'settings-row__select');
      select.dataset.roleOf = item.id;
      select.setAttribute('aria-label', item.email);
      ROLES.forEach((role) => {
        const option = build('option', '', role);
        option.value = role;
        option.selected = role === item.role;
        select.append(option);
      });
      const cell = build('td');
      cell.append(select);
      row.append(
        build('td', '', item.name),
        build('td', '', item.email),
        cell,
        build('td', '', item.totp ? '2FA' : ''),
        build('td', '', item.created ? when(item.created) : ''),
      );
      body.append(row);
    });
  };

  const render = () => {
    const user = store.current();
    part('guest').hidden = user !== null;
    part('user').hidden = user === null;
    if (user === null) return null;
    renderSessions();
    renderTotp();
    renderAccounts();
    renderAudit();
    return user;
  };

  field('security-password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (field('security-new').value !== field('security-confirm').value) return say('password', t('mismatch'), 'error');
    const result = await store.changePassword({ oldPassword: field('security-old').value, newPassword: field('security-new').value });
    if (!result.ok) return say('password', failText(result), 'error');
    ['security-old', 'security-new', 'security-confirm'].forEach((id) => (field(id).value = ''));
    field('security-new').dispatchEvent(new root.defaultView.Event('input'));
    say('password', t('passwordChanged', { ended: result.ended }), 'success');
    return render();
  });

  section.addEventListener('click', (event) => {
    const revoke = event.target.closest('[data-revoke]');
    if (revoke) {
      const result = store.revoke(revoke.dataset.revoke);
      if (result.ok && result.itself) return navigate('login.html');
      say('sessions', result.ok ? t('revoked') : failText(result), result.ok ? 'success' : 'error');
      return render();
    }
    if (event.target.closest('[data-revoke-others]')) {
      say('sessions', t('revokedOthers', { ended: store.revokeOthers().ended }), 'success');
      return render();
    }
    return null;
  });

  section.querySelector('[data-totp-start]').addEventListener('click', () => {
    const result = store.beginTotp();
    if (!result.ok) return say('totp', failText(result), 'error');
    section.querySelector('[data-totp-secret]').textContent = result.secret;
    section.querySelector('[data-totp-uri]').textContent = result.uri;
    section.querySelector('[data-totp-setup]').hidden = false;
    return field('totp-code').focus();
  });

  field('totp-setup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await store.enableTotp({ code: field('totp-code').value });
    if (!result.ok) return say('totp', failText(result), 'error');
    field('totp-code').value = '';
    const list = section.querySelector('[data-recovery-list]');
    list.replaceChildren(...result.recoveryCodes.map((code) => build('li', '', code)));
    section.querySelector('[data-recovery]').hidden = false;
    say('totp', t('totpEnabled'), 'success');
    return render();
  });

  field('totp-disable-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await store.disableTotp({ password: field('totp-password').value });
    field('totp-password').value = '';
    if (!result.ok) return say('totp', failText(result), 'error');
    section.querySelector('[data-recovery]').hidden = true;
    say('totp', t('totpDisabled'), 'success');
    return render();
  });

  section.addEventListener('change', (event) => {
    const select = event.target.closest('[data-role-of]');
    if (select) {
      const result = store.setRole({ id: select.dataset.roleOf, role: select.value });
      say('accounts', result.ok ? t('roleSaved') : failText(result), result.ok ? 'success' : 'error');
      render();
    } else if (event.target.id === 'audit-all') renderAudit();
  });

  field('security-delete-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await store.deleteAccount({ password: field('security-delete-password').value });
    field('security-delete-password').value = '';
    if (!result.ok) return say('delete', failText(result), 'error');
    say('delete', t('deleted'), 'success');
    return navigate(section.dataset.home);
  });

  // A sign-in, a sign-out or a change in another tab redraws this one.
  root.defaultView.addEventListener('storage', render);

  render();
  return { render, store };
};
