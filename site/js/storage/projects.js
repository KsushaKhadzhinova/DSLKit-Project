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

  // Newest first.
  const list = () => [...read()].sort((a, b) => b.updated - a.updated);
  const get = (id) => read().find((item) => item.id === id) ?? null;

  // A project with a known id is updated, any other gets a new id.
  const save = ({ id, title, notation, source }) => {
    const projects = read();
    const at = projects.findIndex((item) => item.id === id);
    const project = { id: at >= 0 ? id : makeId(), title: title.trim() || 'Без названия', notation, source, updated: now() };
    if (at >= 0) projects[at] = project;
    else projects.unshift(project);
    write(projects);
    return project;
  };
  const rename = (id, title) => {
    const projects = read();
    const project = projects.find((item) => item.id === id);
    if (!project || title.trim() === '') return null;
    project.title = title.trim();
    project.updated = now();
    write(projects);
    return project;
  };
  const remove = (id) => {
    const projects = read();
    const rest = projects.filter((item) => item.id !== id);
    if (rest.length === projects.length) return false;
    write(rest);
    return true;
  };
  return { list, get, save, rename, remove };
};
