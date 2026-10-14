import { filterByNotation, formatDate, formatPrice, pluralizeFiles, truncateText } from './helpers';

const projects = [
  { id: 1, notation: 'BPMN' },
  { id: 2, notation: 'ERD' },
  { id: 3, notation: 'BPMN' },
];

describe('formatPrice', () => {
  test('writes the free plan as a word', () => {
    expect(formatPrice(0)).toBe('Бесплатно');
  });

  test('formats dollars without cents', () => {
    expect(formatPrice(12)).toMatch(/12/);
    expect(formatPrice(12)).toMatch(/\$/);
  });

  test('accepts another currency', () => {
    expect(formatPrice(36, 'EUR')).toMatch(/€/);
  });
});

describe('formatDate', () => {
  test('turns an ISO date into day.month.year', () => {
    expect(formatDate('2026-10-12')).toBe('12.10.2026');
  });

  test('returns an empty string for an incomplete or missing date', () => {
    expect(formatDate('2026-10')).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('filterByNotation', () => {
  test('returns every project for "all"', () => {
    expect(filterByNotation(projects, 'all')).toHaveLength(3);
  });

  test('keeps only the matching notation', () => {
    expect(filterByNotation(projects, 'BPMN').map((project) => project.id)).toEqual([1, 3]);
  });

  test('returns an empty list when nothing matches and does not change the input', () => {
    expect(filterByNotation(projects, 'UML')).toEqual([]);
    expect(projects).toHaveLength(3);
  });
});

describe('truncateText', () => {
  test('cuts a long text and adds dots', () => {
    expect(truncateText('Очень длинный текст для проверки', 10)).toBe('Очень длин...');
  });

  test('keeps a short text and handles empty values', () => {
    expect(truncateText('Короткий', 20)).toBe('Короткий');
    expect(truncateText('', 5)).toBe('');
    expect(truncateText(null, 5)).toBe('');
  });

  test('does not cut a text of exactly the maximum length', () => {
    expect(truncateText('12345', 5)).toBe('12345');
  });
});

describe('pluralizeFiles', () => {
  test.each([
    [1, '1 файл'],
    [2, '2 файла'],
    [4, '4 файла'],
    [5, '5 файлов'],
    [11, '11 файлов'],
    [14, '14 файлов'],
    [21, '21 файл'],
    [22, '22 файла'],
    [100, '100 файлов'],
  ])('%i gives "%s"', (count, expected) => {
    expect(pluralizeFiles(count)).toBe(expected);
  });
});
