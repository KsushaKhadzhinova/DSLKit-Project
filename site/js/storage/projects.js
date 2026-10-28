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
// The projects of a signed-in user are kept under a key of their own, the projects of a guest under the plain key.
export const createProjectStore = ({ storage, now = () => Date.now(), owner = null }) => {
  const key = owner ? `${KEY}.${owner}` : KEY;
  const seededKey = owner ? `seeded.${owner}` : 'seeded';
  const read = () => {
    const saved = storage.get(key, []);
    return Array.isArray(saved) ? saved.filter(valid) : [];
  };
  const write = (projects) => storage.set(key, projects.slice(0, LIMIT));
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
    if (at >= 0 && projects[at].published) project.published = true;
    if (at >= 0 && projects[at].seed) project.seed = true;
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
  // The first time the list is empty, ready diagrams are put into it: { title, notation, source, published, age } with the age in milliseconds.
  // It happens once, the flag stays after the projects are deleted, so they do not come back. Seeds do not count into the daily quota.
  const seed = (samples) => {
    if (storage.get(seededKey, false) === true) return false;
    if (!storage.set(seededKey, true)) return false;
    if (read().length > 0) return false;
    const stamp = now();
    write(
      samples.map((sample, index) => {
        const at = stamp - sample.age;
        const project = {
          id: `s${stamp.toString(36)}${index.toString(36)}`,
          title: sample.title,
          notation: sample.notation,
          source: sample.source,
          created: at,
          updated: at,
          seed: true,
        };
        if (sample.published) project.published = true;
        return project;
      }),
    );
    return true;
  };
  // How many diagrams were created on the day of `at`; the beta allows five a day, a deleted one still counts. Seeds are not counted.
  const createdOn = (at = now()) =>
    read().filter((item) => !item.seed && new Date(item.created ?? item.updated).toDateString() === new Date(at).toDateString()).length;
  return { list, listTrash, get, save, rename, trash, restore, remove, createdOn, seed };
};

// The templates of the user: a title, a notation and the code, kept apart from the projects and without a trash or a quota.
// They are created from a project or from the editor, opened as the start of a new diagram, renamed, changed and deleted.
export const createTemplateStore = ({ storage, now = () => Date.now(), owner = null }) => {
  const key = owner ? `templates.${owner}` : 'templates';
  const read = () => {
    const saved = storage.get(key, []);
    return Array.isArray(saved) ? saved.filter(valid) : [];
  };
  const write = (items) => storage.set(key, items.slice(0, LIMIT));
  let counter = 0;
  const list = () => read().sort((a, b) => b.updated - a.updated);
  const get = (id) => read().find((item) => item.id === id) ?? null;
  // A template with a known id is updated, any other gets a new id.
  const save = ({ id, title, notation, source }) => {
    const items = read();
    const at = items.findIndex((item) => item.id === id);
    const stamp = now();
    const template = {
      id: at >= 0 ? id : `t${stamp.toString(36)}${(counter++).toString(36)}`,
      title: title.trim() || 'Без названия',
      notation,
      source,
      created: at >= 0 ? items[at].created : stamp,
      updated: stamp,
    };
    if (at >= 0) items[at] = template;
    else items.unshift(template);
    write(items);
    return template;
  };
  const rename = (id, title) => {
    const items = read();
    const template = items.find((item) => item.id === id);
    if (!template || title.trim() === '') return null;
    template.title = title.trim();
    template.updated = now();
    write(items);
    return template;
  };
  const remove = (id) => {
    const items = read();
    const rest = items.filter((item) => item.id !== id);
    if (rest.length === items.length) return false;
    write(rest);
    return true;
  };
  return { list, get, save, rename, remove };
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
