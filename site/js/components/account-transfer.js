// @ts-nocheck -- type-check debt: remove this line when the file passes npm run typecheck
import { createAccountStore } from '../storage/accounts.js';
import { pageLanguage, pick } from '../utils/lang.js';

const MAX_BYTES = 20000;

const TEXTS = {
  exported: { ru: 'Файл аккаунта сохранён. В нём нет пароля, только его хеш.', en: 'The account file is saved. It holds no password, only its hash.' },
  imported: { ru: 'Аккаунт {email} добавлен. Войдите с прежним паролем.', en: 'The account {email} is added. Sign in with the same password.' },
  unreadable: { ru: 'Файл не удалось прочитать как аккаунт DSLKit.', en: 'The file could not be read as a DSLKit account.' },
  errors: {
    'signed-out': { ru: 'Войдите в аккаунт.', en: 'Sign in first.' },
    'invalid-file': { ru: 'Это не файл аккаунта DSLKit или он повреждён.', en: 'This is not a DSLKit account file, or it is damaged.' },
    exists: {
      ru: 'Такой аккаунт уже есть в этом браузере. Файл ничего не заменяет: войдите в существующий аккаунт.',
      en: 'This account already exists in this browser. The file replaces nothing: sign in to the existing account.',
    },
    storage: { ru: 'Не удалось сохранить: хранилище браузера недоступно или заполнено.', en: 'Could not save: the browser storage is unavailable or full.' },
  },
};

// Downloads a text as a file through a temporary link.
export const downloadText = (root, name, text) => {
  const { URL, Blob } = root.defaultView;
  const link = root.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = name;
  root.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

// Export of the account of the signed-in user (settings) and import of such a file (sign-in page). There is no server, so the file is the only way
// to carry an account to another browser. The password is not in the file; the import adds an account and never replaces one.
export const initAccountTransfer = ({
  root = document,
  storage,
  crypto,
  now = () => Date.now(),
  save = (name, text) => downloadText(root, name, text),
} = {}) => {
  const exportButton = root.querySelector('[data-account-export]');
  const importInput = root.querySelector('[data-account-import]');
  if (!exportButton && !importInput) return null;

  const lang = pageLanguage(root);
  const store = createAccountStore({ storage, crypto, now });
  const say = (name, text, kind) => {
    const line = root.querySelector(`[data-transfer-status="${name}"]`);
    line.textContent = text;
    line.dataset.kind = kind;
  };
  const failText = (error) => pick(TEXTS.errors[error], lang);

  exportButton?.addEventListener('click', () => {
    const result = store.exportAccount();
    if (!result.ok) return say('export', failText(result.error), 'error');
    save(`dslkit-account-${result.record.account.id}.json`, JSON.stringify(result.record, null, 2));
    return say('export', pick(TEXTS.exported, lang), 'success');
  });

  importInput?.addEventListener('change', async () => {
    const [file] = importInput.files;
    if (!file) return;
    let record = null;
    try {
      if (file.size > MAX_BYTES) throw new Error('too big');
      record = JSON.parse(await file.text());
    } catch {
      say('import', pick(TEXTS.unreadable, lang), 'error');
      return;
    }
    const result = store.importAccount(record);
    importInput.value = '';
    say('import', result.ok ? pick(TEXTS.imported, lang, { email: result.email }) : failText(result.error), result.ok ? 'success' : 'error');
  });

  return { store };
};
