const ok = { name: 'Анна Иванова', email: 'anna@example.com', notation: 'idef0', team: 5, comment: '', consent: true };
const with_ = (patch) => ({ ...ok, ...patch });
const mail = (length) => `${'a'.repeat(length - 9)}@mail.com`;

// kind: P positive, N negative, B boundary. expect: list of invalid fields.
export const CASES = [
  ['001', 'P', 'High', 'Все поля корректны', ok, []],
  ['002', 'B', 'High', 'Имя из 1 символа (ниже границы 2)', with_({ name: 'A' }), ['name']],
  ['003', 'B', 'Medium', 'Имя из 2 символов (нижняя граница)', with_({ name: 'Ян' }), []],
  ['004', 'B', 'Medium', 'Имя из 60 символов (верхняя граница)', with_({ name: 'a'.repeat(60) }), []],
  ['005', 'B', 'Medium', 'Имя из 61 символа (выше границы)', with_({ name: 'a'.repeat(61) }), ['name']],
  ['006', 'N', 'High', 'Имя с цифрой', with_({ name: 'Anna1' }), ['name']],
  ['007', 'P', 'Low', 'Имя с апострофом и дефисом', with_({ name: "O'Neil-Smith" }), []],
  ['008', 'N', 'High', 'Email без символа @', with_({ email: 'anna.example.com' }), ['email']],
  ['009', 'N', 'Medium', 'Email без домена верхнего уровня', with_({ email: 'anna@example' }), ['email']],
  ['010', 'B', 'Medium', 'Email длиной 120 символов', with_({ email: mail(120) }), []],
  ['011', 'B', 'Medium', 'Email длиной 121 символ', with_({ email: mail(121) }), ['email']],
  ['012', 'B', 'High', 'Размер команды 0 (нижняя граница)', with_({ team: 0 }), []],
  ['013', 'B', 'High', 'Размер команды 500 (верхняя граница)', with_({ team: 500 }), []],
  ['014', 'B', 'High', 'Размер команды 501 (выше границы)', with_({ team: 501 }), ['team']],
  ['015', 'B', 'Medium', 'Размер команды -1 (ниже границы)', with_({ team: -1 }), ['team']],
  ['016', 'N', 'Medium', 'Размер команды — не число', with_({ team: 'abc' }), ['team']],
  ['017', 'P', 'Low', 'Размер команды строкой "12"', with_({ team: '12' }), []],
  ['018', 'N', 'High', 'Нотация вне списка', with_({ notation: 'xyz' }), ['notation']],
  ['019', 'B', 'Low', 'Комментарий 500 символов', with_({ comment: 'x'.repeat(500) }), []],
  ['020', 'B', 'Low', 'Комментарий 501 символ', with_({ comment: 'x'.repeat(501) }), ['comment']],
  ['021', 'N', 'High', 'Согласие на обработку не дано', with_({ consent: false }), ['consent']],
  ['022', 'N', 'High', 'Пустая форма', {}, ['name', 'email', 'notation', 'team', 'consent']],
].map(([id, kind, priority, title, data, expected]) => ({ id: `TC-WL-${id}`, kind, priority, title, data, expected }));
