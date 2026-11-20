import { pick } from '../utils/lang.js';

const KEY = 'projects';
const LIMIT = 200;

const valid = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.title === 'string' &&
  typeof item.source === 'string' &&
  typeof item.notation === 'string' &&
  Number.isFinite(item.updated) &&
  (item.trashedAt === undefined || Number.isFinite(item.trashedAt));

// The projects of the user: every saved diagram keeps its title, notation, code and the time of the last change.
// A damaged store gives an empty list, a damaged project is dropped.
// The projects of a signed-in user are kept under a key of their own, the projects of a guest under the plain key.
// A project stays in the trash for 30 days, then it is deleted for good.
export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export const createProjectStore = ({ storage, now = () => Date.now(), owner = null, unlimited = false }) => {
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
  const expired = (item) => item.trashedAt !== undefined && now() - item.trashedAt >= TRASH_DAYS * DAY;
  const listTrash = () =>
    read()
      .filter((item) => item.trashedAt !== undefined && !expired(item))
      .sort((a, b) => b.trashedAt - a.trashedAt);
  const get = (id) => list().find((item) => item.id === id) ?? null;

  // A project with a known id is updated, any other gets a new id and the time of its creation.
  // A new project is refused (null) once the daily limit of the beta is used up, unless the user has no limit.
  // false: the browser refused the write (the storage is full or off). undefined: the id is in the trash.
  const save = ({ id, title, notation, source }) => {
    const projects = read();
    const at = projects.findIndex((item) => item.id === id && item.trashedAt === undefined);
    if (at < 0 && !unlimited && createdOn() >= DAILY_LIMIT) return null;
    // An id that is in the trash or gone (another tab trashed or deleted the project) is not brought back to life by a save.
    if (at < 0 && id !== undefined && projects.some((item) => item.id === id)) return undefined;
    const stamp = now();
    const project = {
      id: at >= 0 ? id : makeId(),
      title: title.trim(),
      notation,
      source,
      created: at >= 0 ? (projects[at].created ?? stamp) : stamp,
      updated: stamp,
    };
    if (at >= 0 && projects[at].published) project.published = true;
    if (at >= 0 && projects[at].seed) project.seed = true;
    if (at >= 0) projects[at] = project;
    else projects.unshift(project);
    return write(projects) ? project : false;
  };
  const rename = (id, title) => {
    const projects = read();
    const project = projects.find((item) => item.id === id && item.trashedAt === undefined);
    if (!project || title.trim() === '') return null;
    project.title = title.trim();
    project.updated = now();
    return write(projects) ? project : false;
  };
  const change = (id, apply) => {
    const projects = read();
    const project = projects.find((item) => item.id === id);
    if (!project) return false;
    apply(project);
    return write(projects);
  };
  // The trash keeps a deleted project until it is restored or deleted for good.
  const trash = (id) => change(id, (project) => (project.trashedAt = now()));
  const restore = (id) => change(id, (project) => delete project.trashedAt);
  const remove = (id) => {
    const projects = read();
    const rest = projects.filter((item) => item.id !== id);
    if (rest.length === projects.length) return false;
    return write(rest);
  };
  // Deletes what stayed in the trash for 30 days; returns how many projects went.
  const purgeExpired = () => {
    const projects = read();
    const kept = projects.filter((item) => !expired(item));
    if (kept.length !== projects.length) write(kept);
    return projects.length - kept.length;
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
  return { list, listTrash, get, save, rename, trash, restore, remove, createdOn, seed, purgeExpired };
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
  // A template with a known id is updated, one with no id gets a new id.
  // An id that no longer exists (the template was deleted, in this tab or another) is refused instead of
  // silently coming back to life under a new id.
  const save = ({ id, title, notation, source }) => {
    const items = read();
    const at = items.findIndex((item) => item.id === id);
    if (id !== undefined && at < 0) return null;
    const stamp = now();
    const template = {
      id: at >= 0 ? id : `t${stamp.toString(36)}${(counter++).toString(36)}`,
      title: title.trim(),
      notation,
      source,
      created: at >= 0 ? items[at].created : stamp,
      updated: stamp,
    };
    if (at >= 0) items[at] = template;
    else items.unshift(template);
    return write(items) ? template : false;
  };
  const rename = (id, title) => {
    const items = read();
    const template = items.find((item) => item.id === id);
    if (!template || title.trim() === '') return null;
    template.title = title.trim();
    template.updated = now();
    return write(items) ? template : false;
  };
  const remove = (id) => {
    const items = read();
    const rest = items.filter((item) => item.id !== id);
    if (rest.length === items.length) return false;
    return write(rest);
  };
  return { list, get, save, rename, remove };
};

export const DAILY_LIMIT = 5;

const TEXTS = {
  untitled: { ru: 'Без названия', en: 'Untitled' },
  unlimited: { ru: 'Бета: сегодня создано {used}, без дневного лимита', en: 'Beta: {used} created today, no daily limit' },
  over: { ru: 'Бета: сегодня создано {used}, лимит {limit} в день превышен', en: 'Beta: {used} created today, the limit of {limit} a day is exceeded' },
  within: { ru: 'Бета: сегодня создано {used} из {limit}', en: 'Beta: {used} of {limit} created today' },
};

// A project or a template without a title is stored with an empty one; the page names it in its own language.
// The title of the older versions, written in Russian, is shown in the language of the page as well.
export const titleOf = (item, lang) => (item.title === '' || item.title === TEXTS.untitled.ru ? pick(TEXTS.untitled, lang) : item.title);

// The text under the quota bar: the beta allows five new diagrams a day to a user, none to a developer and an admin; a sixth new project of a user is refused by the store.
export const quotaLabel = (used, lang, unlimited = false) => {
  const text = unlimited ? TEXTS.unlimited : used > DAILY_LIMIT ? TEXTS.over : TEXTS.within;
  return pick(text, lang, { used, limit: DAILY_LIMIT });
};

// Writes the quota into a text and a progress bar of a page.
export const showQuota = (text, bar, used, lang, unlimited = false) => {
  if (text) text.textContent = quotaLabel(used, lang, unlimited);
  if (bar) {
    bar.max = DAILY_LIMIT;
    bar.value = Math.min(used, DAILY_LIMIT);
    bar.textContent = `${used} / ${DAILY_LIMIT}`;
  }
};
