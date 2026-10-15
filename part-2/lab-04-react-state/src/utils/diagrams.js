export function filterDiagrams(diagrams, { query, status }) {
  const needle = query.trim().toLowerCase();
  return diagrams.filter((d) => {
    const matchesQuery = d.title.toLowerCase().includes(needle);
    const matchesStatus = status === 'all' || (status === 'published') === d.published;
    return matchesQuery && matchesStatus;
  });
}

export function sortDiagrams(diagrams, sortBy) {
  const copy = [...diagrams];
  if (sortBy === 'title') return copy.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  if (sortBy === 'date') return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return copy;
}

export function getStats(diagrams) {
  const published = diagrams.filter((d) => d.published).length;
  return { total: diagrams.length, published, drafts: diagrams.length - published };
}
