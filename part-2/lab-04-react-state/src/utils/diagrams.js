export function filterDiagrams(diagrams, { query, status, notation = 'all' }) {
  const needle = query.trim().toLowerCase();
  return diagrams.filter((d) => {
    const matchesQuery = d.title.toLowerCase().includes(needle);
    const matchesStatus = status === 'all' || (status === 'published') === d.published;
    const matchesNotation = notation === 'all' || d.notation === notation;
    return matchesQuery && matchesStatus && matchesNotation;
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

// The creation time is shown with seconds, so two records must not share a second.
// A new record gets the current time, or one second after the latest record when it was created in the same second.
export function uniqueCreatedAt(diagrams, now = new Date()) {
  const latest = diagrams.reduce((max, d) => Math.max(max, Date.parse(d.createdAt)), 0);
  const time = Math.max(now.getTime(), Math.floor(latest / 1000) * 1000 + 1000);
  const date = new Date(time);
  const pad = (n) => String(n).padStart(2, '0');
  // Local time without a zone suffix, the same shape as the seed data.
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// crypto.randomUUID exists only in secure contexts (https and localhost), so a plain-http address needs a fallback.
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
