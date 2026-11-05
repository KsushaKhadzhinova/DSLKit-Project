// Paste into the browser console on http://localhost:5190 (any page of the site), then open app/dashboard.html.
// 1) paste the content of a scenario file into SNAP, 2) for scenario-3.json pass the user: SNAP = SNAP.users[0] or SNAP.users[1].
// SHIFT = true moves created / updated / trashedAt so the data looks as old as it was when saved (needed for the trash scenario).
(function (SNAP, SHIFT) {
  const data = SNAP.localStorage;
  const delta = SHIFT && SNAP.savedAt ? Date.now() - SNAP.savedAt : 0;
  localStorage.clear();
  for (const [key, value] of Object.entries(data)) {
    let out = value;
    if (delta && /^dslkit\.(projects|templates)\./.test(key)) {
      out = JSON.stringify(
        JSON.parse(value).map((p) => {
          for (const f of ['created', 'updated', 'trashedAt']) if (typeof p[f] === 'number') p[f] += delta;
          return p;
        }),
      );
    }
    localStorage.setItem(key, out);
  }
  location.href = '/app/dashboard.html';
})(/* PASTE SNAPSHOT OBJECT HERE */ {}, true);
