// Demo projects for the seeders. Each project lists the notations whose demo diagrams it groups (one project has many diagrams).
// Diagrams with an awkward title stay outside every project on purpose: a diagram without a project is a valid state.
const PROJECTS = [
  { name: 'Demo: Online shop', notations: ['BPMN', 'DFD'] },
  { name: 'Demo: Data model', notations: ['ERD'] },
  { name: 'Demo: Software design', notations: ['UML'] },
  { name: 'Demo: Process control', notations: ['IDEF0', 'Petri'] },
];

const AWKWARD_PREFIXES = ['Юникод', '<img', "'; DROP", 'TTTT', 'A long source'];

// The project a demo diagram belongs to, or null.
const projectFor = (row) => {
  if (AWKWARD_PREFIXES.some((prefix) => row.title.startsWith(prefix))) return null;
  return PROJECTS.find((project) => project.notations.includes(row.notation))?.name ?? null;
};

module.exports = { PROJECTS, projectFor };
