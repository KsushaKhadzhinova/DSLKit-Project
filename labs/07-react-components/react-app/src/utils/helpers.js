// Pure helpers used by components and covered by the tests of lab 8.
export function formatPrice(amount, currency = 'USD') {
  if (amount === 0) return 'Бесплатно';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  return year && month && day ? `${day}.${month}.${year}` : '';
}

export function filterByNotation(projects, notation) {
  return notation === 'all' ? projects : projects.filter((project) => project.notation === notation);
}

export function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function pluralizeFiles(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} файлов`;
  if (last === 1) return `${count} файл`;
  if (last >= 2 && last <= 4) return `${count} файла`;
  return `${count} файлов`;
}
