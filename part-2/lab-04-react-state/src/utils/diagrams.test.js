import { filterDiagrams, getStats, sortDiagrams } from './diagrams';

const data = [
  { id: 1, title: 'Beta', notation: 'UML', published: true, updatedAt: '2026-10-01' },
  { id: 2, title: 'alpha', notation: 'ERD', published: false, updatedAt: '2026-10-05' },
  { id: 3, title: 'Gamma', notation: 'BPMN', published: false, updatedAt: '2026-10-03' },
];

describe('filterDiagrams', () => {
  it('matches the title ignoring case and surrounding spaces', () => {
    expect(filterDiagrams(data, { query: '  ALP ', status: 'all' }).map((d) => d.id)).toEqual([2]);
  });

  it('filters by status', () => {
    expect(filterDiagrams(data, { query: '', status: 'published' }).map((d) => d.id)).toEqual([1]);
    expect(filterDiagrams(data, { query: '', status: 'draft' }).map((d) => d.id)).toEqual([2, 3]);
  });
});

describe('sortDiagrams', () => {
  it('sorts by title and by date, newest first', () => {
    expect(sortDiagrams(data, 'title').map((d) => d.id)).toEqual([2, 1, 3]);
    expect(sortDiagrams(data, 'date').map((d) => d.id)).toEqual([2, 3, 1]);
  });

  it('keeps the order for unknown mode and does not mutate the input', () => {
    expect(sortDiagrams(data, 'none').map((d) => d.id)).toEqual([1, 2, 3]);
    sortDiagrams(data, 'title');
    expect(data.map((d) => d.id)).toEqual([1, 2, 3]);
  });
});

describe('getStats', () => {
  it('counts published and draft diagrams', () => {
    expect(getStats(data)).toEqual({ total: 3, published: 1, drafts: 2 });
    expect(getStats([])).toEqual({ total: 0, published: 0, drafts: 0 });
  });
});
