export const NOTATIONS = ['UML', 'BPMN', 'ERD', 'DFD', 'IDEF0', 'Petri'];

const seed = () => [
  {
    id: 1,
    title: 'Order service sequence',
    notation: 'UML',
    description: 'Sequence diagram of a checkout request passing through the API gateway.',
    code: 'sequenceDiagram\n  Client->>API: POST /orders\n  API->>DB: insert order\n  API-->>Client: 201 Created',
  },
  {
    id: 2,
    title: 'Approval workflow',
    notation: 'BPMN',
    description: 'Business process: a diagram goes from draft to review to published.',
    code: 'start -> draft -> review -> published',
  },
  {
    id: 3,
    title: 'Project database',
    notation: 'ERD',
    description: 'Entities user, project and diagram with one-to-many links.',
    code: 'user 1--* project\nproject 1--* diagram',
  },
];

// Data lives in memory only, as the practical requires: no database.
export const createDiagramStore = () => {
  const items = seed();
  let nextId = items.length + 1;
  return {
    all: () => [...items],
    find: (id) => items.find((item) => item.id === id),
    add: ({ title, notation, description, code }) => {
      const item = { id: nextId, title, notation, description, code };
      nextId += 1;
      items.push(item);
      return item;
    },
  };
};

// Returns an object of field errors, empty when the input is valid.
export const validateDiagram = (input) => {
  const errors = {};
  if (!input.title) errors.title = 'Title is required';
  else if (input.title.length > 80) errors.title = 'Title must be at most 80 characters';
  if (!NOTATIONS.includes(input.notation)) errors.notation = 'Choose a notation from the list';
  return errors;
};
