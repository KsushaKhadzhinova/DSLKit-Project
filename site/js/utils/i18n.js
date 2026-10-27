// English texts for the editor messages. The Russian text stays the source: a page with lang="en" gets the translation.
const RULES = [
  [/^В редакторе нет кода диаграммы\.$/, 'There is no diagram code in the editor.'],
  [/^Нет соединения с интернетом\./, 'No internet connection.'],
  [/^Сервер не ответил вовремя\. Попробуйте ещё раз\./, 'The server did not answer in time. Try again.'],
  [/^Сервер временно недоступен\. Проверьте соединение\./, 'The server is temporarily unavailable. Check the connection.'],
  [/^Сервис вернул неожиданный ответ\./, 'The service returned an unexpected answer.'],
  [/^Сервис не принял код диаграммы\./, 'The service did not accept the diagram code.'],
  [/^Слишком много запросов\. Подождите немного и повторите\./, 'Too many requests. Wait a little and try again.'],
  [/^Сервер вернул ошибку \(код (\d+)\)\./, 'The server returned an error (code $1).'],
  [/^Загрузка диаграммы…$/, 'Loading the diagram…'],
  [/^Диаграмма построена собственным движком в браузере\.$/, 'The diagram is built by the own engine in the browser.'],
  [/^Показана сохранённая копия от (.+)\.$/, 'Showing the saved copy from $1.'],
  [/^Диаграмма готова\.$/, 'The diagram is ready.'],
  [/^Кэшированные данные от (\S+ \S+)\. (.+)$/, 'Cached data from $1. $2'],
  [/^(.+?) Сохранённой копии этой диаграммы нет\.$/, '$1 There is no saved copy of this diagram.'],
  [/^Сохранённая копия этой диаграммы уже удалена из кэша\.$/, 'The saved copy of this diagram has already been removed from the cache.'],
  [/^Сервис Kroki доступен$/, 'The Kroki service is available'],
  [/^Сервис Kroki недоступен, будут использованы сохранённые копии$/, 'The Kroki service is unavailable, saved copies will be used'],
  [/^Движок: (.+)$/, 'Engine: $1'],
  [/^Собственный движок \(в браузере\)$/, 'Own engine (in the browser)'],
  [/^Диаграмма: (.+)$/, 'Diagram: $1'],
  [/^Без названия$/, 'Untitled'],
];

export const createTranslator = (root = document) => {
  const english = root.documentElement?.lang === 'en';
  return (text) => {
    if (!english) return text;
    for (const [pattern, replacement] of RULES) {
      if (pattern.test(text)) return text.replace(pattern, replacement);
    }
    return text;
  };
};
