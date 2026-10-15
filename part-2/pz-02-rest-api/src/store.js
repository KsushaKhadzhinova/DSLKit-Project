// In-memory collection: the practical asks for an array instead of a database.
export const createCollection = (seed = [], now = () => new Date().toISOString()) => {
  let items = seed.map((item) => ({ createdAt: now(), ...item }));
  let nextId = items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  return {
    all: () => items,
    find: (id) => items.find((item) => item.id === id),
    create: (data) => {
      const item = { id: nextId, ...data, createdAt: now() };
      nextId += 1;
      items.push(item);
      return item;
    },
    // Keeps id and createdAt, replaces everything else.
    replace: (item, data) => {
      const keep = { id: item.id, createdAt: item.createdAt };
      Object.keys(item).forEach((key) => delete item[key]);
      return Object.assign(item, data, keep);
    },
    update: (item, data) => Object.assign(item, data),
    remove: (item) => {
      items = items.filter((other) => other !== item);
    },
  };
};

export const createStores = (now) => ({
  users: createCollection(
    [
      { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'owner' },
      { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'editor' },
    ],
    now,
  ),
  projects: createCollection(
    [
      { id: 1, name: 'Order service', description: 'Diagrams of the order flow', ownerId: 1 },
      { id: 2, name: 'Billing', description: '', ownerId: 2 },
    ],
    now,
  ),
  diagrams: createCollection(
    [
      { id: 1, title: 'Checkout sequence', notation: 'UML', code: 'Client->API: POST /orders', projectId: 1, status: 'published' },
      { id: 2, title: 'Approval workflow', notation: 'BPMN', code: 'draft -> review -> published', projectId: 1, status: 'draft' },
      { id: 3, title: 'Billing database', notation: 'ERD', code: 'invoice 1--* line', projectId: 2, status: 'draft' },
    ],
    now,
  ),
});
