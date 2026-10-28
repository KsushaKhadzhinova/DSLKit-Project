const KEY = 'projects';
const LIMIT = 200;

const valid = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.title === 'string' &&
  typeof item.source === 'string' &&
  Number.isFinite(item.updated);

// The projects of the user: every saved diagram keeps its title, notation, code and the time of the last change.
// A damaged store gives an empty list, a damaged project is dropped.
export const createProjectStore = ({ storage, now = () => Date.now() }) => {
  const read = () => {
    const saved = storage.get(KEY, []);
    return Array.isArray(saved) ? saved.filter(valid) : [];
  };
  const write = (projects) => storage.set(KEY, projects.slice(0, LIMIT));
  let counter = 0;
  const makeId = () => `p${now().toString(36)}${(counter++).toString(36)}`;

  // Newest first. A project in the trash is not listed and cannot be opened until it is restored.
  const list = () =>
    read()
      .filter((item) => item.trashedAt === undefined)
      .sort((a, b) => b.updated - a.updated);
  const listTrash = () =>
    read()
      .filter((item) => item.trashedAt !== undefined)
      .sort((a, b) => b.trashedAt - a.trashedAt);
  const get = (id) => list().find((item) => item.id === id) ?? null;

  // A project with a known id is updated, any other gets a new id and the time of its creation.
  const save = ({ id, title, notation, source }) => {
    const projects = read();
    const at = projects.findIndex((item) => item.id === id && item.trashedAt === undefined);
    const stamp = now();
    const project = {
      id: at >= 0 ? id : makeId(),
      title: title.trim() || 'Без названия',
      notation,
      source,
      created: at >= 0 ? (projects[at].created ?? stamp) : stamp,
      updated: stamp,
    };
    if (at >= 0) projects[at] = project;
    else projects.unshift(project);
    write(projects);
    return project;
  };
  const rename = (id, title) => {
    const projects = read();
    const project = projects.find((item) => item.id === id && item.trashedAt === undefined);
    if (!project || title.trim() === '') return null;
    project.title = title.trim();
    project.updated = now();
    write(projects);
    return project;
  };
  const change = (id, apply) => {
    const projects = read();
    const project = projects.find((item) => item.id === id);
    if (!project) return false;
    apply(project);
    write(projects);
    return true;
  };
  // The trash keeps a deleted project until it is restored or deleted for good.
  const trash = (id) => change(id, (project) => (project.trashedAt = now()));
  const restore = (id) => change(id, (project) => delete project.trashedAt);
  const remove = (id) => {
    const projects = read();
    const rest = projects.filter((item) => item.id !== id);
    if (rest.length === projects.length) return false;
    write(rest);
    return true;
  };
  // How many diagrams were created on the day of `at`; the beta allows five a day, a deleted one still counts.
  const createdOn = (at = now()) => read().filter((item) => new Date(item.created ?? item.updated).toDateString() === new Date(at).toDateString()).length;
  return { list, listTrash, get, save, rename, trash, restore, remove, createdOn };
};

export const DAILY_LIMIT = 5;

// The text under the quota bar: the beta allows five new diagrams a day, the number is real, the limit is only shown.
export const quotaLabel = (used, lang) => {
  if (lang === 'en')
    return used > DAILY_LIMIT ? `Beta: ${used} created today, the limit of ${DAILY_LIMIT} a day is exceeded` : `Beta: ${used} of ${DAILY_LIMIT} created today`;
  return used > DAILY_LIMIT ? `Бета: сегодня создано ${used}, лимит ${DAILY_LIMIT} в день превышен` : `Бета: сегодня создано ${used} из ${DAILY_LIMIT}`;
};

// Writes the quota into a text and a progress bar of a page.
export const showQuota = (text, bar, used, lang) => {
  if (text) text.textContent = quotaLabel(used, lang);
  if (bar) {
    bar.max = DAILY_LIMIT;
    bar.value = Math.min(used, DAILY_LIMIT);
    bar.textContent = `${used} / ${DAILY_LIMIT}`;
  }
};
